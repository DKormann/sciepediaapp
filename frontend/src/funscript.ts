import { assertEq, assertErr, last, log, stringify, Res, Ok, Err, ok, err, assert } from "./helpers"

type code = {
  type: string,
  value: string,
  start: number,
  end: number,
}

type token = code & {type:"number" | "string" | "boolean" | "null" | "identifier" | "symbol" | "typo" | "whitespace" | "comment"}

const symbols = ["(", ")", "{", "}", "[", "]", "=>", ",", ":", "?", "=>", "!", "&&", "||", "+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "=", ";", "...", ".", "//"]

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

type ast = nullary | unary | binary | ternary | nary

type nullary = code & {type:"number" | "string" | "boolean" | "null" | "identifier" | "typo", children:[]}
type unary = code & {type:"!" | "neg" | "..."} & {children: [ast]}
type binary = code & {type:"+" | "-" | "*" | "/" | "%" | "<" | ">" | "<=" | ">=" | "==" | "!=" | "&&" | "||" | "app" | "=>" | "idx" | "[]" | ":"} & {children: [ast, ast]}
type ternary = code & {type:"?:" | "=;"} & {children: [ast, ast, ast]}
type nary = code & {type:"{}" | "[]" | "()"} & {children: ast[]}

const ternaryops = ["?:", "=;"]
const symbolpairs = [["(", ")"], ["{", "}"], ["[", "]"], ["?", ":"], ["=", ";"]]
const binaryops = ["+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "&&", "||", "app", "=>", "idx"]
const unaryops = ["!", "neg", "..."]


const parse = (code:string): ast => {

  const tokens = tokenize(code)
  const nonw = (idx:number): number =>
    tokens[idx] == undefined? idx :tokens[idx].type == "whitespace" || tokens[idx].type == "comment" ? nonw(idx+1): idx

  const nexttok = (prev: code| ast):number =>nonw(tokens.findIndex(t=>t.start >= prev.end))

  const iden2string = (iden:nullary):nullary =>
    (iden.type == "identifier") ? {...iden, type:"string", value:`"${iden.value}"`}: iden

  const parseKV = (idx:number):ast =>{
    const k = parseexpr(idx)
    const colon = tokens[nexttok(k)]
    if (k.type == "...") return k
    const v = (colon.value == ":") ? parseexpr(nexttok(colon)): k
    return {type:":", value:"", start:k.start, end:v.end, children:[ k.type=="identifier"? iden2string(k):k, v]}
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

  const parsecontinue = (first:ast):ast => {
    const nextop = tokens[nexttok(first)]
    if (nextop == undefined) return first
    if (nextop.type == "symbol"){
      if ("[(".includes(nextop.value)){
        const grp = parsegroup(nextop, nexttok(nextop))
        const op = nextop.value == "(" ? "app" : "idx"
        if ( nextop.value== '[' && grp.children.length != 1) return parsecontinue({...grp, type:"typo", value: op + " expects one arg", children:[]} as ast)
        const newNode = {
          ...grp,
          type:op,
          value:"",
          start:first.start,
          end:grp.end,
          children:[first, nextop.value == "[" ? grp.children[0] : grp]} as binary
        return parsecontinue(newNode)
      }
      
      const op: ast["type"] =
        (nextop.value == ".") ? "idx" :
        (nextop.value == "?")? "?:":
        (nextop.value == "=")? "=;":
        (nextop.value as ast['type'])

      if (binaryops.includes(op)){
        const second = parseindivisible(nexttok(nextop))
        const newNode = {
          type: op,
          value: "",
          start: first.start,
          end: second.end,
          children: [first, nextop.value == "." ? iden2string(second as nullary):second]
        } as binary;
        return parsecontinue(newNode)
      }

      if (ternaryops.includes(op)){
        const grp = parsegroup(nextop, nexttok(nextop))
        const els = parseexpr(nexttok(grp))
        return parsecontinue({type:op, value:"", start:first.start, end:els.end, children:[first, grp.children[0], els]} as ternary)

      }
    }

    return first
  }

  const parseatom = (idx:number):nullary|undefined =>  (["number", "string", "boolean", "null", "identifier"].includes(tokens[idx].type)) ? {...tokens[idx], children:[]} as nullary: undefined

  const parseindivisible = (idx:number):nullary|unary|nary => {
    const tok = tokens[idx]

    const typo = {...tok, type:"typo", value:"unexpected "+ tok.value, children:[]} as nullary
    const op = (tok.value == '-')? "neg": tok.value
    const res:nary|unary|nullary  = tok.type == "symbol" ?
      "({[".includes(op) ? parsegroup(tok, nonw(idx+1)) as nary:
      unaryops.includes(op) ? astnode(op as unary['type'], [parseindivisible(nexttok(tok))]) as unary:
      typo
    :parseatom(idx) ?? typo
    return res
  }

  const parseexpr = (idx:number):ast=> parsecontinue(parseindivisible(idx))
  return parseexpr(nonw(0))
}

const build = (ast:ast):string =>{
  const sfill = (template:string, i=0):string =>
    i == ast.children.length? template:
    sfill(template.replace("{}", build(ast.children[i])), i+1)
  return ast.type == "number" || ast.type == "boolean" || ast.type == "null" || ast.type == "identifier" || ast.type == "string" ? ast.value:
  "({[".includes(ast.type[0]) ? `${ast.type[0]}${ast.children.map(build).join(",")}${ast.type[1]}`:
  (ast.type == "app")? sfill("({}{})"):
  (ast.type == "idx")? sfill("({}[{}])"):
  (ast.type == 'neg')? `-${build(ast.children[0])}`:
  (ast.type == '=>')? sfill("({}=>({}))"):
  ast.type == ":" ? sfill("{}:{}"):
  ast.children.length == 2 ? sfill(`({}${ast.type}{})`, 0):
  ast.children.length == 1 ? `${ast.type}${build(ast.children[0])}`:
  ast.type == "=;" ? sfill("(()=>{const {} = {};\nreturn {}})()") :
  ast.type == "?:" ? sfill(`({}?{}:\n{})`, 0):
  "not implemented: "+ast.type
}

const operator_weight = (op: ast['type']): number =>
  op === "app" || op === "idx" ? 15 :
  unaryops.includes(op) ? 13 :     // Unary operators
  op === "*" || op === "/" || op === "%" ? 12 :
  op === "+" || op === "-" ? 11 :
  op === "<" || op === ">" || op === "<=" || op === ">=" || op === "==" || op === "!=" ? 10 :
  op === "&&" || op === "||" ? 9 :
  op === "?:" || op == "=;" ? 8 :
  op === "=>" ? 7 :
  -1;

const rearange = (nod:ast):ast => {

  const node = {...nod, children:nod.children.map(rearange)} as ast

  if (binaryops.includes(node.type)){
    const [fst, snd] = node.children
    if (binaryops.includes(fst.type) && operator_weight(fst.type) < operator_weight(node.type)){
      return rearange({...fst, children:[(fst .children[0]), {...node, children:[fst.children[1], snd]}]} as ast)
    }
  }
  if (ternaryops.includes(node.type)){
    const [fst, snd, trd] = node.children
    if (binaryops.includes(fst.type) && operator_weight(fst.type) < operator_weight(node.type)){
      return rearange({...fst, children:[(fst.children[0]), {...node, children:[fst.children[1], snd, trd]}]} as ast)
    }
  }
  return node
}

const compile =(s:string) => build((rearange((parse(s)))))

export const runfun = (code:string):any => {
  const compt = compile((code))

  try{
    const FN = Function("return "+compt) 
    return FN()
  }catch(e){
    console.log(compt)
    throw e
  }
}

{
  assertEq(tokenize("1"), [{type:"number", value:"1", start:0, end:1}])
  assertEq(tokenize("1 +  1"), [{type:"number", value:"1", start:0, end:1}, {type:"whitespace", value:" ", start:1, end:2}, {type:"symbol", value:"+", start:2, end:3}, {type:"whitespace", value:"  ", start:3, end:5}, {type:"number", value:"1", start:5, end:6}])
  assertEq(tokenize('{"gello" + ]22', 0), [{type:"symbol", value:"{", start:0, end:1}, {type:"string", value:"\"gello\"", start:1, end:8}, {type:"whitespace", value:" ", start:8, end:9}, {type:"symbol", value:"+", start:9, end:10}, {type:"whitespace", value:" ", start:10, end:11}, {type:"symbol", value:"]", start:11, end:12}, {type:"number", value:"22", start:12, end:14}])
  assertEq(tokenize('true'), [{type:"boolean", value:"true", start:0, end:4}])
  assertEq(tokenize("a + // comment\nb"), [{type:"identifier", value:"a", start:0, end:1}, {type:"whitespace", value:" ", start:1, end:2}, {type:"symbol", value:"+", start:2, end:3}, {type:"whitespace", value:" ", start:3, end:4}, {type:"comment", value:"// comment", start:4, end:14}, {type:"whitespace", value:"\n", start:14, end:15}, {type:"identifier", value:"b", start:15, end:16}])

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

  assertEq(build(parse("1")), "1")
  assertEq(build(parse("[1]")), "[1]")
  
  testbuild("1")
  testbuild("[1]")
  testbuild("true")
  testbuild("false")
  testbuild("null")
  testbuild("123")

  testbuild("{}")
  testbuild("{a,}", '{"a":a}')
  testbuild("-x")

  testbuild("x + y", "(x+y)")
  testbuild("[a+1]", "[(a+1)]")
  testbuild("[a+1,b-1]", "[(a+1),(b-1)]")
  testbuild("{a:1}", '{"a":1}')
  testbuild("...a", "...a")

  testbuild("{a:1, b:2,...c}", '{"a":1,"b":2,...c}')


  const testCompile = (code:string, expected: string)=>{
    try{
      assertEq(compile(code), expected, " in compiling " + code)
    }catch(e){
      console.error(e, " in compiling " + code)
    }
  }

  testCompile("1", "1")
  testCompile("a + 3", "(a+3)")
  testCompile("!a+b", "(!a+b)")
  testCompile("a + b + c", "((a+b)+c)")
  
  testCompile("a + b * c", "(a+(b*c))")
  testCompile("[a + b * c]", "[(a+(b*c))]")
  testCompile("a + b * c . d", '(a+(b*(c["d"])))')
  testCompile("a * b + c", "((a*b)+c)")

  testCompile("!a * b +c", "((!a*b)+c)")
  testCompile("a ? b : c", "(a?b:\nc)")
  
  testCompile("a>b?c:d", "((a>b)?c:\nd)")
  testCompile("a=b;c", "(()=>{const a = b;\nreturn c})()")
  
  testCompile("14 ", "14")
  testCompile("1 + 2", "(1+2)")
  testCompile("1 * 2 + 3", "((1*2)+3)")
  testCompile("{a:1, b:2}", '{"a":1,"b":2}')
  testCompile("{a, ...b}", '{"a":a,...b}')
  
  testCompile("x.y", '(x["y"])')
  testCompile("x[y]", '(x[y])')
  testCompile("x=>y", '(x=>(y))')
  testCompile("x=>x.y", '(x=>((x["y"])))')
  
  testCompile("1 > 2 ? 3 : 4", '((1>2)?3:\n4)')
  testCompile("1>2?3:4", '((1>2)?3:\n4)')
  
  testCompile('fn(22)', '(fn(22))')
  testCompile('fn(22) + 3', '((fn(22))+3)')
  testCompile('"a"+"b"', '("a"+"b")')

  testCompile('a.b', '(a["b"])')
  
  testCompile('n=>n<2?n:2', '(n=>(((n<2)?n:\n2)))')
  testCompile('fn(x-2)', '(fn((x-2)))')
  testCompile('a+b(c)', '(a+(b(c)))')
  
  testCompile('[fn(x),2]', '[(fn(x)),2]')
  testCompile('[x[3],e.r,2,]', '[(x[3]),(e["r"]),2]')
  testCompile("[-x, !true]", '[-x,!true]')
  
  testCompile("a.b", '(a["b"])')
  testCompile("a.b.c", '((a["b"])["c"])') // fails giving a[b["c"]]
  testCompile("a.b(22)", '((a["b"])(22))') // fails giving a[b(22)]
  testCompile("a(b).c", '((a(b))["c"])')

  testCompile("a.b(f(22))", '((a["b"])((f(22))))')  
  testCompile('"hello " + "world"', '("hello "+"world")')

  testCompile("f(a, b)", '(f(a,b))')

  const testRun = (code:string, expected:any)=>
    assertEq(runfun(code), expected, " in running "+ code)

  testRun("\n1", 1)
  testRun("1 + 2", 3)

  testRun('"hello" + "world"', "helloworld")

  testRun("x=1;x", 1)
  testRun('x="hello";x+x', "hellohello")

  testRun("[a,b] = [1,2]; a", 1)

  /*
  assertCompileErr('"abc', `parse error, expected: "`)

  */
}