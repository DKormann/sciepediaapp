import { assertEq, assertErr, last, log, stringify, Res, Ok, Err, ok, err } from "./helpers"

type code = {
  type: string,
  value: string,
  start: number,
  end: number,
}

type token = code & {type:"number" | "string" | "boolean" | "null" | "identifier" | "symbol" | "typo" | "whitespace" | "comment"}

const symbols = ["(", ")", "{", "}", "[", "]", "=>", ",", ":", "?", "=>", "!", "&&", "||", "+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "=", ";", "...", ".", "//"]
const symbol_letters = new Set(symbols.join('').split(''))

const seek = (code:string, start:number, pred: (c:string, i:number)=>boolean):number =>{
  const off = code.slice(start).split('').findIndex(pred)
  return off == -1 ? code.length : start + off
}

const tokenize = (code:string, i:number=0, tid = 0):token[] =>{
  if (code.length <= i) return []
  const comp = (name:string) => code.slice(i, i+name.length) == name
  const [typ, nxt] :[token["type"], number]= 
  code[i].trim() == "" ? ["whitespace", seek(code, i, c=>c.trim() != "")]:
  code[i] == '"' ? ["string", seek(code, i+1, c=>c == '"') + 1]:
  code[i] == "'" ? ["string", seek(code, i+1, c=>c == "'") + 1]:
  code[i].match(/[0-9]/) ? ["number", seek(code, i, c=>!c.match(/[0-9]/))]:
  comp("//") ? ["comment", seek(code, i, c=>c == '\n')]:
  comp("true") ? ["boolean", i+4]:
  comp("false") ? ["boolean", i+5]:
  comp("null") ? ["null", i+4]:
  code[i].match(/[a-zA-Z_]/) ? ["identifier", seek(code, i, c=>!c.match(/[a-zA-Z0-9_]/))]:
  (symbols.map(s=>comp(s) ? ["symbol" as token['type'], i+s.length]:null).find(x=>x != null) ||
  ["typo", i+1] as [token["type"], number]) as [token["type"], number]
  assertEq(nxt > i, true, "tokenize error "+typ)
  return [{type:typ, value:code.slice(i, nxt), start:i, end:nxt}, ...tokenize(code, nxt, tid+1)]
}

assertEq(tokenize("1"), [{type:"number", value:"1", start:0, end:1}])
assertEq(tokenize("1 +  1"), [{type:"number", value:"1", start:0, end:1}, {type:"whitespace", value:" ", start:1, end:2}, {type:"symbol", value:"+", start:2, end:3}, {type:"whitespace", value:"  ", start:3, end:5}, {type:"number", value:"1", start:5, end:6}])
assertEq(tokenize('{"gello" + ]22', 0), [{type:"symbol", value:"{", start:0, end:1}, {type:"string", value:"\"gello\"", start:1, end:8}, {type:"whitespace", value:" ", start:8, end:9}, {type:"symbol", value:"+", start:9, end:10}, {type:"whitespace", value:" ", start:10, end:11}, {type:"symbol", value:"]", start:11, end:12}, {type:"number", value:"22", start:12, end:14}])
assertEq(tokenize('true'), [{type:"boolean", value:"true", start:0, end:4}])
assertEq(tokenize("a + // comment\nb"), [{type:"identifier", value:"a", start:0, end:1}, {type:"whitespace", value:" ", start:1, end:2}, {type:"symbol", value:"+", start:2, end:3}, {type:"whitespace", value:" ", start:3, end:4}, {type:"comment", value:"// comment", start:4, end:14}, {type:"whitespace", value:"\n", start:14, end:15}, {type:"identifier", value:"b", start:15, end:16}])

type ast = nullary | unary | binary | ternary | nary

type nullary = code & {type:"number" | "string" | "boolean" | "null" | "identifier" | "typo", children:[]}
type unary = code & {type:"!" | "neg" | "..."} & {children: [ast]}
type binary = code & {type:"+" | "-" | "*" | "/" | "%" | "<" | ">" | "<=" | ">=" | "==" | "!=" | "&&" | "||" | "app" | "=>" | "idx" | "[]" | ":"} & {children: [ast, ast]}
type ternary = code & {type:"?:" | "=;"} & {children: [ast, ast, ast]}
type nary = code & {type:"{}" | "[]" | "()"} & {children: ast[]}

const ternaryops = ["?:", "=;"]
const symbolpairs = [["(", ")"], ["{", "}"], ["[", "]"], ["?", ":"], ["=", ";"]]
const binaryops = ["+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "&&", "||", "app", "=>", "idx", "[]"]
const unaryops = ["!", "neg", "..."]


const parse = (code:string): ast => {

  const tokens = tokenize(code)
  const nonw = (idx:number): number =>
    tokens[idx] == undefined? idx :tokens[idx].type == "whitespace" || tokens[idx].type == "comment" ? nonw(idx+1): idx

  const nexttok = (prev: code| ast):number =>nonw(tokens.findIndex(t=>t.start >= prev.end))

  const parseKV = (idx:number):ast =>{
    const k = parseexpr(idx)
    const colon = tokens[nexttok(k)]
    if (colon.value != ":") return k
    const v = parseexpr(nexttok(colon))
    return {type:":", value:"", start:k.start, end:v.end, children:[k, v]}
  }

  const parsegroup = (opener:token , idx: number):nary => {
    const closer = symbolpairs.find(s=>s[0] == opener.value)?.[1]
    if (closer == undefined) throw new Error("parsegroup error "+ opener.value+ " not an opener")
      const type = opener.value + closer as (nary)["type"]
    const tok = tokens[idx]
    if (tok.value == closer) return {type, value:"", children:[], start: opener.start, end: tok.end}
    if (tok.value == ",") return parsegroup(opener, nexttok(tok))
      
    const child = type == "{}" ? parseKV (idx) : parseexpr(idx)

    const rest = parsegroup(opener, nexttok(child))
    return {...rest, children:[child, ...rest.children]}
  }

  const astnode = (type:(ast)["type"], children:ast[]) => ({
    type,
    children,
    start: children[0].start,
    end: last(children).end,
    value: ""
  }) as ast

  const parseexpr = (idx:number):ast=> {
    const tok = tokens[idx]

    const tyo = {type:"typo", value:"unexpected "+ tok.value, start:tok.start, end:tok.end, children:[]} as ast
    const first:ast =
      (tok.type == "number" || tok.type == "string" || tok.type == "boolean" || tok.type == "null" || tok.type == "identifier") ? {...tok, children:[]} as nullary:
      (tok.type == "symbol") ?
        "({[".includes(tok.value) ? parsegroup(tok, nonw(idx+1)):
        ["...", "-", "!"].includes(tok.value) ?
        astnode(( tok.value == "-" ? "neg" : tok.value) as ast["type"], [parseexpr(nexttok(tok))]) as unary:
        tyo:
      tyo
    const nextop = tokens[nexttok(first)]
    if (nextop == undefined) return first
    if (nextop.type == "symbol"){
      const op: ast["type"] = nextop.value == "(" ? "app" : nextop.value == "[" ? "idx" : nextop.value == "." ? "idx" :
        (nextop.value == "?")? "?:": (nextop.value == "=")? "=;":
        (nextop.value as ast['type'])
      if (binaryops.includes(op)){
        const second = parseexpr(nexttok(nextop))
        return {type: op, value: "", start: first.start, end:second.end, children: [first, second]} as binary
      }

      if (ternaryops.includes(op)){
        const grp = parsegroup(nextop, nexttok(nextop))
        const els = parseexpr(nexttok(grp))
        return {type:op, value:"", start:first.start, end:els.end, children:[first, grp.children[0], els]} as ternary

      }
    }
    return first
  }

  return parseexpr(0)
}


const build = (ast:ast):string =>{
  const sfill = (template:string, i=0):string =>
    i == ast.children.length? template:
    sfill(template.replace("{}", build(ast.children[i])), i+1)
  return ast.type == "number" || ast.type == "string" || ast.type == "boolean" || ast.type == "null" || ast.type == "identifier" ? ast.value:
  "({[".includes(ast.type[0]) ? `${ast.type[0]}${ast.children.map(build).join(",")}${ast.type[1]}`:
  (ast.type == "app")? sfill("({}({}))"):
  (ast.type == "idx")? sfill("({}[{}])"):
  (ast.type == 'neg')? `-${build(ast.children[0])}`:
  ast.children.length == 2 ? sfill(`({}${ast.type}{})`, 0):
  ast.children.length == 1 ? `${ast.type}${build(ast.children[0])}`:
  (ternaryops.includes(ast.type)) ? sfill(`({}${ast.type[0]}{}${ast.type[1]}{})`, 0):
  "not implemented: "+ast.type
}


const operator_weight = (op:ast['type']):number =>
  (op =="?:")||(op === "=>") ? 6 :
  (op === "<")||(op === ">")||(op === "<=")||(op === ">=")||(op === "==")||(op === "!=")?7:
  (op === "&&")|| (op === "||")?9:
  (op === "+")||(op === "-") ?10:
  (op === "/")|| (op === "%")|| (op === "*")?11:
  (unaryops.includes(op)) ? 12 :
  (op === "app") || (op=="=;") ||(op=="...")?13 :
  (op == "idx")? 14:
  (op === "[]") || (op === "{}") || (op === "()")?15:
  (!binaryops.includes(op)) ? 16:
  -1


const rearange = (nod:ast):ast => {

  const cmap = (nd:ast) => ({...nd, children:nd.children.map(rearange)} as ast)
  const node = cmap(nod)

  if (node.type )
  if (unaryops.includes(node.type)){
    const [fst] = (node as unary).children
    if (operator_weight(node.type) > operator_weight(fst.type)){
      return cmap({...fst, children:[{...node, children:[fst.children[0] as ast]} , ...fst.children.slice(1)]} as ast)
    }
  }
  if (binaryops.includes(node.type)) {
    const [fst, snd] = (node as binary).children
    if (
      operator_weight(node.type) > operator_weight(snd.type)){
      const sb = snd as binary
      return cmap({...sb, children:[{...node, children:[fst, sb.children[0]]}  as binary,  ...sb.children.slice(1)]} as ast)
    }
  }

  return node
}

const compile =(s:string) => build(
  // log
  (rearange(parse(s)))
)



{

  const testbuild = (...codes:string[]) =>{
    try{
      const built = build(parse(codes[0]))
      assertEq(built, codes[1] ?? codes[0], " compiling "+ codes[0])
    }catch(e){
      console.error(e, " in compiling "+ codes[0])
    }
  }  
  assertEq(parse("1"), {type:"number", value:"1", start:0, end:1, children:[]})
  assertEq(parse("2312"), {type:"number", value:"2312", start:0, end:4, children: []})
  assertEq(parse("true"), {type:"boolean", value:"true", start:0, end:4, children: []})
  assertEq(parse("{1}"), {type:"{}", value:"", start:0, end:3, children:[{type:"number", value:"1", start:1, end:2, children: []}]})

  assertEq(build(parse("1")), "1")
  assertEq(build(parse("{1}")), "{1}")
  
  
  testbuild("1")
  testbuild("{1}")
  testbuild("true")
  testbuild("false")
  testbuild("null")
  testbuild("123")
  testbuild("{1, 2,3,}", "{1,2,3}")
  testbuild("{}")
  testbuild("{1,}", "{1}")
  testbuild("-x")
  testbuild("x + y", "(x+y)")

  testbuild("[a+1]", "[(a+1)]")
  testbuild("[a+1,b-1]", "[(a+1),(b-1)]")
  testbuild("{a:1}", "{(a:1)}")
  testbuild("...a", "...a")

  testbuild("{a:1, b:2,...c}", "{(a:1),(b:2),...c}")


  const testCompile = (code:string, expected: string)=>{
    try{
      assertEq(compile(code), expected, " in rearanging " + code)
    }catch(e){
      console.error(e, " in rearanging " + code)
    }
  }

  testCompile("1", "1")
  testCompile("a + 3", "(a+3)")


  testCompile("!a+b", "(!a+b)")

  testCompile("a + b * c", "(a+(b*c))")
  testCompile("a * b + c", "((a*b)+c)")
  testCompile("!a * b +c", "((!a*b)+c)")
  testCompile("a ? b : c", "(a?b:c)")

  testCompile("a>b?c:d", "((a>b)?c:d)")
  testCompile("a=b;c", "(a=b;c)")

}


// const compile = (code:string):Result<string> => 
//   parse(code).and(x=>ok(buildjs(x.val), x.idx))

// {
//   const testRearange = (ast:astnode, expected:expression)=>{
//     try{
//       assertEq(rearange(ast), expected, " in rearanging " + stringify(ast))
//     }catch(e){
//       console.error(e)
//     }
//   }

//   const testNaive = (code:string, expected: any)=>{

//     const p = naive_parse(code)
//     if (p.status == "err") console.error(nice_error(code, p))
//     try{
//       assertEq(p.val, ex(expected), " in parsing " + code)
//     }catch(e){
//       console.error(e)
//     }
//   }


//   testNaive("14 ", 14)
//   testNaive("abc", idn("abc"))
//   testNaive('"hello"', "hello")
//   testNaive("true", true)

//   testNaive("11+2", alu("+", 11,2))
//   testNaive("1+2 + 3", alu("+", 1, alu("+", 2,3)))
//   testNaive("1 == 2 %  44 ", alu("==", 1, alu("%", 2, 44)))

//   testNaive("1?2:3", iff(1,2,3))
//   testNaive("x=2;3", con(idn("x"),2,3))
//   testNaive("x = 2 ; 3 * x", con(idn("x"),2,alu("*",3,idn("x"))))

//   testNaive("x.y", idx(idn("x"), "y"))
//   testNaive("x[y]", idx(idn("x"), idn("y")))

//   testNaive("x=>y", lam(idn("x"), idn("y")))
//   testNaive("[1,2,3]", arr(1,2,3))
//   testNaive("[1,3+4]", arr(1,alu("+",3,4)))

//   testNaive("(1,2)", comp("arglist", 1,2))
//   testNaive("(x+33)", comp("arglist", alu("+", idn("x"), 33)))

//   testNaive('fn(x-2)', app(idn("fn"), comp("arglist", alu("-", idn("x"), 2))))


//   testRearange(ex(1), ex(1))
//   testRearange(newunary("neg", ex(1)), newunary("neg", ex(1)))
//   testRearange(newunary("neg", alu("+", 1, 2)), alu("+", newunary("neg", 1), 2))

//   testRearange(alu("*", 1, alu("+", 2, 3)), alu("+", alu("*", 1, 2), 3))
//   testRearange(alu("+", 2, lam(idn("x"), 2)), alu("+", 2, lam(idn("x"), 2)))

//   const testParse = (code:string, expected: any)=>{
//     const res = parse(code)
//     if (res.status == "err") console.error(nice_error(code, res))

//     try{
//       assertEq (res.val, ex(expected), '')
//     }catch(e){
//       console.error("parse fail on "+ code + " =>\n"+ buildjs((res as ParseOk).val) + " !=\n"+ buildjs(ex(expected)))
//     }
//   }

//   testParse("14 ", 14)
//   testParse("1 + 2", alu("+", 1, 2))
//   testParse("1 + 2 + 3", alu("+", 1, alu("+", 2, 3)))
//   testParse("1 + 2 * 3", alu("+", 1, alu("*", 2, 3)))
//   testParse("1 * 2 + 3", alu("+", alu("*", 1, 2), 3))
//   testParse("1 > 2 ? 3 : 4", iff(alu(">", 1, 2), 3, 4))

//   testParse("...x", spr(idn("x")))
//   testParse("!z", newunary("!", idn("z")))
//   testParse("x.y", idx(idn("x"), "y"))
//   testParse("[]", arr() )
//   testParse("[1,2,3]", arr(1,2,3))
//   testParse("[1,2] + [3]", alu("+", arr(1,2), arr(3)))
//   testParse("{a:1, b:2}", obj(newast(":", 2, "a", 1), newast(":", 2, "b", 2)))
//   testParse("{a, ...b}", obj(newast(":", 2 , "a", idn("a")), spr(idn("b"))))


// }

// testCompile("14 ", "14")
// testCompile("1 + 2", "(1+2)")
// testCompile("1 * 2 + 3", "((1*2)+3)")
// testCompile("{a:1, b:2}", '{"a":1,"b":2}')
// testCompile("{a, ...b}", '{"a":a,...b}')

// testCompile("x.y", '(x["y"])')
// testCompile("x[y]", '(x[y])')
// testCompile("x=>y", '(x=>(y))')
// testCompile("x=>x.y", '(x=>((x["y"])))')

// testCompile("1 > 2 ? 3 : 4", '((1>2)?3:\n4)')
// testCompile("1>2?3:4", '((1>2)?3:\n4)')

// testCompile('fn(22)', '(fn(22))')
// testCompile('"a"+"b"', '("a"+"b")')
// testCompile('a.b', '(a["b"])')

// testCompile('n=>n<2?n:2', '(n=>(((n<2)?n:\n2)))')
// testCompile('fn(x-2)', '(fn((x-2)))')

// testCompile('[fn(x),2]', '[(fn(x)),2]')
// testCompile('[x[3],e.r,2,]', '[(x[3]),(e["r"]),2]')
// testCompile("[-x, !true]", '[-x,!true]')

// testCompile("a.b(22)", '((a["b"])(22))')
// testCompile("a.b(f(22))", '((a["b"])((f(22))))')

// testCompile('"hello " + "world"', '("hello "+"world")')
// assertCompileErr('"abc', `parse error, expected: "`)
