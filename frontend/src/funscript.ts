import { convertTypeAcquisitionFromJson } from "typescript"
import { assertEq, assertErr, log, stringify } from "./helpers"

// only well formed expressions
type expression = 
  // | stringliteral | numberliteral | booleanliteral | nullliteral // "abc" | 123 | true | null
  | literal
  | lambda // (x)=>y
  | application // f(x)
  | const_ // x = 22; x + y
  | if_ // true?22:33
  | binary<binaryop> // 1+2
  | unary<unaryop> // -x
  | arr // [1,2,3]
  | obj // {a:1, b:2}
  | index // x.y | x[2]

// any subexpression
type ast <op extends astop, n extends number> = {type:op, arity: n, children: astnode[]}
type astnode = ast<astop, number>

type literalop = "string" | "number" | "boolean" | "null" | "identifier"
type unaryop = "neg" | "!"
type binaryop = "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | ">" | "<=" | ">=" | "&&" | "||" | "=>" | "app" | "idx"
type tertiaryop = "?:" | "=;"
type exop = unaryop | binaryop | tertiaryop | literalop | "[]" | "{}"
type astop = exop | "..." | "arglist" | ":"

type unary <op extends unaryop> = ast<op, 1>
type literal = {type:literalop, children:[], arity:0, value: string}
type identifier = {type:"identifier"} & literal
type binary <op extends binaryop> = ast<op, 2> |lambda | application
type tertiary <op extends tertiaryop> = ast<op, 3>

type lambda = {
  type:"=>",
  arity:2,
  children:[expression|arglist|spread, expression]
} 

type application = {
  type:"app",
  arity:2,
  children:[expression, expression|arglist|spread]
}

type const_ = tertiary<"=;">
type if_ = tertiary<"?:">
type index = binary<"idx">


type composite<op extends astop> =ast<op, -1>
type arr = composite<"[]">
type obj = composite<"{}">
type arglist = composite<"arglist">

type spread = ast<"...", 1>

const parse_expressions = (exp:(expression|any)[]) => exp.map(e=>e.type?e:ex(e)) as expression[]
const newast = (type:astop, arity:number, ...children:(expression|any)[]):astnode => 
  ({type, arity, children: (parse_expressions(children) as astnode[])})


const lit = (t:literalop, v:string):literal=> ({type:t, children:[], arity:0, value:v})
const ex = (value:expression|string|number|boolean|null):expression =>
  (typeof value === "string")?lit("string", value):
  (typeof value === "number")?lit("number", value.toString()):
  (typeof value === "boolean")?lit("boolean", value.toString()):
  (value == null)?lit("null", "null"): value

const idn = (value:string):identifier => lit("identifier", value) as identifier

const comp = (type:astop, ...children:any[]): composite<astop> => newast(type, -1, ...children) as composite<exop>

const newunary = <op extends unaryop>(type:op, child:any):unary<op> => newast(type, 1, child) as unary<op>
const newbinary = <op extends binaryop>(type:op, left:any, right:any):binary<op> => newast(type, 2, left, right) as binary<op>
const newtertiary = <op extends tertiaryop>(type:op, ...children:any[]):tertiary<op> => newast(type, 3, ...children) as tertiary<op>
const lam = (x:identifier|spread|arglist, y:any) => ({type:"=>", arity:2, children:[x, ex(y)]} as lambda)
const app = (f:any, x:any|identifier|spread|arglist) => ({type:"app", arity:2, children:[f, x]} as application)
const con = (x:any, y:any, z:any):const_ => newtertiary("=;", x, y, z)
const iff = (x:any, y:any, z:any):if_ => newtertiary("?:", x, y, z)
const idx = (x:any, y:any):index => newbinary("idx", x, y)
const arr = (...children:any[]):arr => comp("[]", ...children) as composite<"[]">
const obj = (...children:any[]):obj => comp("{}", ...children) as composite<"{}">
const arg = (...children:any[]):arglist => comp("arglist", ...children) as composite<"arglist">
const spr = (value:any):spread => newast("...", 1, value) as spread
const alu = (op:binaryop, ...children:any):binary<binaryop> => newbinary(op, ...parse_expressions(children) as [expression, expression])

type parsenode = astnode & {type: astop | "braces", children: astnode[]}

// plan: parse code into naive parsenode, then rotate trees for operator precedence


const unary_symbols = ["-", "!", "..."]
const binary_symbols = ["+", "-", "*", "/", "%", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "=>", "."]
const tertiary_symbols = ["?", "="]
const tertiary_symbols2 = [":", ";"]
const group_symbols = ["(", "{", "[", ","]
const close_symbols = [")", "}", "]"]
const symbols = [ ...unary_symbols, ...binary_symbols, ...tertiary_symbols, ...tertiary_symbols2, ...group_symbols, ...close_symbols]

const symbolschars = "()+-*/%=!<>?:{}[].,;"

const naive_parse = (code:string)=>{

  type test = (c:string)=>Boolean

  const look = (test:(c:string)=>Boolean)=>(i:number):number => (code[i] && test(code[i]))?(look(test)(i+1)):i
  const lookparse = (i:number, test:test, type:(literal|identifier)['type']):[literal|identifier, number]|undefined => {
    const j = look(test)(i)
    return i === j?undefined:[lit(type, code.slice(i,j)), nonw(j)]
  }

  type parsed <T> = [T,number] | undefined
  type tryparse <T> = (i:number)=>parsed<T>
  
  const match = (s:string)=>(i:number):Boolean => code.slice(i, i+s.length) === s
  const matchparse = (i:number, s:string, t:literalop):parsed<expression>=>(match(s)(i) && [lit(t, s), nonw(i+s.length)])
  
  const parse_until_char = (i:number, c:string, type:astop):parsed<literal>=>{
    const j = code.indexOf(c, i)
    return j === -1?undefined:[lit(type as literal['type'], code.slice(i,j)), nonw(j)+1]
  }

  const parse_atom:tryparse<expression> = (i:number) => {
    return lookparse(i, c=>c<='9' && c>='0', "number")
    || matchparse(i, "true", "boolean")
    || matchparse(i, "false", "boolean")
    || matchparse(i, "null", "null")
    || lookparse(i, c=>(c<='z' && c >='a' || c == '_') || (c<='9' && c >='0') || (c<='Z' && c >='A'),"identifier")
    || (code[i] === '"' && parse_until_char(i+1, '"', "string"))
    || (code[i] === "'" && parse_until_char(i+1, "'", "string"))
    || undefined
  }

  const parse_operator = (i:number):parsed<string> =>
    symbols.map(s=>match(s)(i) && [s, nonw(i+s.length)] as [string, number]).find(Boolean)

  const parse_continue = ([left, i]:[expression, number]):parsed<expression> => {
    // log("continuing "+ code.slice(i))
    const po = parse_operator(i)
    if (!po) return [left, i]
    const [next_symbol, ni] = po
    if (close_symbols.includes(next_symbol)) return [left, i]
    if (next_symbol == "."){
      const exn = parse_atom(ni)
      if (!exn || exn[0].type !== "identifier") throw new Error('expected identifier after "."');
      // log(exn)
      const res = idx(left,{...exn[0], type:"string"})
      // log(res)
      return parse_continue([res, exn[1]])
    }
    const exn = parse_expression(ni)
    if (!exn) return [left, i]
    const [next, j] = exn
    if (binary_symbols.includes(next_symbol)){
      return parse_continue([newbinary(next_symbol as binaryop, left, next), j])
    }
    if (next_symbol == "[") {
      const closer = parse_operator(j)
      return closer && (assertEq(closer[0], "]", "expected ]"),
      parse_continue([idx(left, next), (closer as [string, number])[1]]))
    }
    if (next_symbol == "("){
      // log("applying " +code.slice(ni))
      const arglist = parse_group(["(", ni])
      return arglist && parse_continue([app(left, arglist[0]), arglist[1]])
    }
    if (tertiary_symbols.includes(next_symbol)){

      const op2 = next_symbol=='='?';':':'
      const po = parse_operator(j)
      if (!po) throw new Error("expected \""+ op2+"\""+ code.slice(j))
      const [ns2, nni] = po
      if (ns2 !== op2) new Error("expected \""+ op2+"\", found: \""+ ns2 + "\"")
      const exr = parse_expression(nni)
      if (!exr) throw new Error("cant parse");
      const [right, k] = exr
      return parse_continue([newtertiary(next_symbol+ns2 as tertiaryop, left, next, right), k])
    }
    return [left, i]
  }

  const force = <T>(x:parsed<T>, msg:string = "undefined error")=>{
    if (!x) throw new Error(msg)
    return x
  }

  const unwrap = <T,U> (x:parsed<T>, fn:(x:[T,number])=>parsed<U>) => x ? fn(x) : undefined

  const parse_group = ([open, i]:[string, number]):[composite<astop>,number] => {

 
    const close = close_symbols[group_symbols.indexOf(open)]
    const type = open=="["?"[]":open=="{"?"{}":"arglist" as astop
    const parse_items = (i:number): [astnode[], number] =>{
      // log("parsing items "+type +":  "+ code.slice(i, i+10))
      const closed = unwrap(parse_operator(i), ([s,j])=>s==close?[[],nonw(j)]:undefined)
      if (closed) return closed
      const [val, j] = force(parse_expression(i), "expected value "+code.slice(i, i+10))
      const [sybl, k] = force(parse_operator(j), "expected symbol")
      const kn = nonw(k)
      if (sybl === close) return [[val], kn]
      
      if (type== "{}"){
        if (sybl == ":"){
          const [value, knn] = force(parse_expression(kn))
          const key = val.type === "identifier"?{...val, type:"string"}:val
          const [comma, knnn] = force(parse_operator(knn))
          const [rest, knnnn] = (comma == ',')?  parse_items(knnn) : [[], knnn]
          if (comma == close || comma == ',')  return [[newast(":", 2, key, value),...rest], knnnn]
        }
        if (sybl == ','){
          const [rest, knn] = parse_items(kn)
          const value = val.type === "identifier"? newast(":", 2, {...val, type:"string"}, val):val
          return [[value, ...rest], knn]
        }
      }
      if (sybl == ','){
        const [rest, knn] = parse_items(kn)
        return [[val, ...rest], knn]
      }
      throw new Error("cant parse "+ code.slice(i, i+10))
    }

    const [items, j] = parse_items(i)
    return [comp(type, ...items), j]
  }
  const parse_expression = (i:number):parsed<astnode> => {
    ("parse exp "+ code.slice(i, i+10))

    const open = parse_operator(i)
    if (open){
      if (unary_symbols.includes(open[0])){
        const ex = parse_expression(open[1])
        if (!ex) return undefined
        const [next, j] = ex
        return parse_continue([newunary(open[0] as unaryop, next), j])
      }
      if (!group_symbols.includes(open[0])) return undefined
      return parse_continue(parse_group(open as [string, number]) as [expression, number])
    }

    const start = parse_atom(i)
    if (!start) return undefined
    return parse_continue(start)
  }

  const nonw = (i:number):number=> code[i] == undefined? i:
    code[i] == '/' && code[i+1] == '/' ? nonw(code.indexOf('\n', i+1)):
    code[i] == '/' && code[i+1] == '*' ? nonw(code.indexOf('*/', i+1)+2):
    code[i].trim().length ? i:nonw(i+1)

  const res = parse_expression(nonw(0))
  if (!res) throw new Error("cant parse"+ code)
  if (res[1] !== code.length) throw new Error("unexpected token after end of expression: "+ code.slice(res[1]))
  return res[0]
}


const operator_weight = (op:astop):number =>
  (op =="?:")||(op === "=>") ? 6 :
  (op === "<")||(op === ">")||(op === "<=")||(op === ">=")||(op === "==")||(op === "!=")?7:
  (op === "&&")|| (op === "||")?9:
  (op === "+")||(op === "-") ?10:
  (op === "/")|| (op === "%")|| (op === "*")?11:
  op==="!" ?12:
  (op === "app") || (op=="=;") ||(op=="...")?13 :
  (op == "idx")? 14:
  (op === "[]") || (op === "{}") || (op === "arglist")?15:
  -1

const rearange = (node:astnode):astnode => {

  const res = {...node, children:node.children.map(rearange)}

  if (node.type === "{}" || node.type === "[]" || node.type === "arglist") return res
  if (node.arity == 1){
    const fst = res.children[0]
    if (!fst.children.length || operator_weight(node.type) < operator_weight(fst.children[0].type)) return res 
    return {...fst,children:[newunary(node.type as unaryop, fst.children[0]), ...fst.children.slice(1)]}
  }
  if (node.arity == 2){
    const [fst, snd] = res.children
    if (snd.children.length < 2 || operator_weight(node.type) <= operator_weight(snd.type)) return res
    if (snd.type === "=>") return res
    return {
      type:snd.type,
      arity:snd.arity,
      children:[{
        type:node.type,
        arity:2,
        children:[fst, snd.children[0]]
      }, ...snd.children.slice(1)]
    }
  }
  return res as expression
}

const parse = (code:string):expression => rearange(naive_parse(code)) as expression



const buildjs = (ast:astnode):string =>{

  const sfill = (template:string , ... children:astnode[]):string =>
    children.length == 0?template:
    sfill(template.replace("{}", buildjs(children[0])), ...children.slice(1));

  return ast.type == "number" || ast.type == "boolean" ? `${(ast as literal).value}`:
  ast.type == "string" ? `"${(ast as literal).value}"`:
  ast.type == "identifier" ? (ast as identifier).value:
  ast.type == ":" ? sfill(`{}:{}`, ...ast.children):
  ast.type == "{}" ? `{${ast.children.map(buildjs).join(",")}}`:
  ast.type == "[]" ? `[${ast.children.map(buildjs).join(",")}]`:
  ast.type == "idx" ? sfill(`({}[{}])`, ...ast.children):
  ast.type == "?:" ? sfill(`({}?{}:\n{})`, ...ast.children):
  ast.type == "=;" ? sfill(`(()=>{const {}={};\nreturn {}})()`, ...ast.children):
  ast.type == "arglist" ? `(${ast.children.map(buildjs).join(",")})`:
  ast.arity == 2 ? sfill(`({}${ast.type == "app"?"":ast.type}{})`, ...ast.children):
  ast.arity == 1 ? sfill(`${ast.type}{}`, ...ast.children):
  "<unknown>"
}

const compile = (code:string):string => buildjs(parse(code))

{
  const testRearange = (ast:astnode, expected:expression)=>{
    try{
      assertEq(rearange(ast), expected, " in rearanging " + stringify(ast))
    }catch(e){
      console.error(e)
    }
  }

  const testNaive = (code:string, expected: any)=>{
    try{
      assertEq(naive_parse(code), ex(expected), " in parsing " + code)
    }catch(e){
      console.error(e)
    }
  }


  testNaive("14 ", 14)
  testNaive("abc", idn("abc"))
  testNaive('"hello"', "hello")
  testNaive("true", true)

  testNaive("11+2", alu("+", 11,2))
  testNaive("1+2 + 3", alu("+", 1, alu("+", 2,3)))
  testNaive("1 == 2 %  44 ", alu("==", 1, alu("%", 2, 44)))

  testNaive("1?2:3", iff(1,2,3))
  testNaive("x=2;3", con(idn("x"),2,3))
  testNaive("x = 2 ; 3 * x", con(idn("x"),2,alu("*",3,idn("x"))))

  testNaive("x.y", idx(idn("x"), "y"))
  testNaive("x[y]", idx(idn("x"), idn("y")))

  testNaive("x=>y", lam(idn("x"), idn("y")))
  testNaive("[1,2,3]", arr(1,2,3))
  testNaive("[1,3+4]", arr(1,alu("+",3,4)))

  testNaive("(1,2)", comp("arglist", 1,2))
  testNaive("(x+33)", comp("arglist", alu("+", idn("x"), 33)))

  testNaive('fn(x-2)', app(idn("fn"), comp("arglist", alu("-", idn("x"), 2))))


  testRearange(ex(1), ex(1))
  testRearange(newunary("neg", ex(1)), newunary("neg", ex(1)))
  testRearange(newunary("neg", alu("+", 1, 2)), alu("+", newunary("neg", 1), 2))

  testRearange(alu("*", 1, alu("+", 2, 3)), alu("+", alu("*", 1, 2), 3))
  testRearange(alu("+", 2, lam(idn("x"), 2)), alu("+", 2, lam(idn("x"), 2)))

  const parse = (code:string):expression => rearange(naive_parse(code)) as expression

  const testParse = (code:string, expected: any)=>{
    const res = parse(code)
    try{
      assertEq (res, ex(expected), '')
    }catch(e){
      console.error("parse fail on "+ code + " =>\n"+ buildjs(res) + " !=\n"+ buildjs(ex(expected)))
    }
  }

  testParse("14 ", 14)
  testParse("1 + 2", alu("+", 1, 2))
  testParse("1 + 2 + 3", alu("+", 1, alu("+", 2, 3)))
  testParse("1 + 2 * 3", alu("+", 1, alu("*", 2, 3)))
  testParse("1 * 2 + 3", alu("+", alu("*", 1, 2), 3))
  testParse("1 > 2 ? 3 : 4", iff(alu(">", 1, 2), 3, 4))

  testParse("...x", spr(idn("x")))
  testParse("!z", newunary("!", idn("z")))
  testParse("x.y", idx(idn("x"), "y"))
  testParse("[]", arr() )
  testParse("[1,2,3]", arr(1,2,3))
  testParse("[1,2] + [3]", alu("+", arr(1,2), arr(3)))
  testParse("{a:1, b:2}", obj(newast(":", 2, "a", 1), newast(":", 2, "b", 2)))
  testParse("{a, ...b}", obj(newast(":", 2 , "a", idn("a")), spr(idn("b"))))


}
const testCompile = (code:string, expected: string)=>{
  try{
    const res = compile(code)
    try {
      assertEq(res, expected, " in compiling " + code)
    }catch(e){
      console.error("unexpected result compiliing "+code+ " =>\n"+ res + " !=\n"+ expected)
    }
  }catch(e){
    console.error("compiliing "+code+ " =>\n"+ e)
    throw(e)
  }
}

testCompile("14 ", "14")
testCompile("1 + 2", "(1+2)")
testCompile("1 * 2 + 3", "((1*2)+3)")
testCompile("{a:1, b:2}", '{"a":1,"b":2}')
testCompile("{a, ...b}", '{"a":a,...b}')

testCompile("x.y", '(x["y"])')
testCompile("x[y]", '(x[y])')
testCompile("x=>y", '(x=>y)')
testCompile("x=>x.y", '(x=>(x["y"]))')

testCompile("1 > 2 ? 3 : 4", '((1>2)?3:\n4)')
testCompile("1>2?3:4", '((1>2)?3:\n4)')

testCompile('fn(22)', '(fn(22))')
testCompile('"a"+"b"', '("a"+"b")')
testCompile('a.b', '(a["b"])')

testCompile('n=>n<2?n:2', '(n=>((n<2)?n:\n2))')
testCompile('fn(x-2)', '(fn((x-2)))')

testCompile('[fn(x),2]', '[(fn(x)),2]')
testCompile('[x[3],e.r,2,]', '[(x[3]),(e["r"]),2]')
testCompile("[-x, !true]", '[-x,!true]')

testCompile("a.b(22)", '((a["b"])(22))')
testCompile("a.b(f(22))", '((a["b"])((f(22))))')

let expr = (s:string) => (eval(
  log
  (buildjs(parse(s)))))


// expr(`

// fib = n => 
//   n < 2 ?
//   n :
//   fib(n - 1) + fib(n - 2);

// x = console.log(fib(10));
// x = fib(10);

// x2 = x + 2;


// fast_fib = n => 
//   _fib = (a, b, n) =>
//     n == 0 ?
//     a :
//     _fib(b, a + b, n - 1);
//   _fib(0, 1, n);

// console.log(fast_fib(100))
// `)



export const runfun = (code:string, debug = false)=>{
  const jscode = compile(code)
  if (debug) log(jscode)
  return eval(jscode)
}
