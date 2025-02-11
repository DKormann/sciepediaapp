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
type astop = exop | "spread" | "arglist"

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

type spread = ast<"spread", 1>

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

const comp = (type:astop, ...children:any[]): composite<exop> => newast(type, -1, ...children) as composite<exop>

const newunary = <op extends unaryop>(type:op, child:any):unary<op> => newast(type, 1, child) as unary<op>
const newbinary = <op extends binaryop>(type:op, left:any, right:any):binary<op> => newast(type, 2, left, right) as binary<op>
const newtertiary = <op extends tertiaryop>(type:op, ...children:any[]):tertiary<op> => newast(type, 3, ...children) as tertiary<op>
const lam = (x:identifier|spread|arglist, y:expression) => ({type:"=>", arity:2, children:[x, y]} as lambda)
const app = (f:any, x:any|identifier|spread|arglist) => ({type:"app", arity:2, children:[f, x]} as application)
const con = (x:any, y:any, z:any):const_ => newtertiary("=;", x, y, z)
const iff = (x:any, y:any, z:any):if_ => newtertiary("?:", x, y, z)
const idx = (x:any, y:any):index => newbinary("idx", x, y)
const arr = (...children:any[]):arr => comp("[]", ...children)
const obj = (...children:any[]):obj => comp("{}", ...children)
const arg = (...children:any[]):arglist => comp("arglist", ...children)
const spr = (value:any):spread => newast("spread", 1, value) as spread
const alu = (op:binaryop, ...children:any):binary<binaryop> => newbinary(op, ...parse_expressions(children) as [expression, expression])


type parsenode = astnode & {type: astop | "braces", children: astnode[]}

// plan: parse code into naive parsenode, then rotate trees for operator precedence

const binary_symbols = ["+", "-", "*", "/", "%", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "=>"]
const unary_symbols = ["-", "!", "..."]
const tertiary_symbols = ["?", "="]
const group_symbols = ["(", "{", "["]
const close_symbols = [")", "}", "]"]
const symbols = [...binary_symbols, ...unary_symbols, ...tertiary_symbols, ...group_symbols, ...close_symbols]

const symbolschars = "()+-*/%=!<>?:{}[].,;"

const operator_weight = (op:expression["type"]):number =>
  (op === "<")||(op === ">")||(op === "<=")||(op === ">=")||(op === "==")||(op === "!=")?7:
(op === "&&")|| (op === "||")?9:
(op === "+")||(op === "-") ?10:
(op === "/")|| (op === "%")|| (op === "*")?11:
(op === "idx") || op==="!" ?12:
(op === "app")||(op === "=>")||(op =="?:") || (op=="=;") ||(op=="spread")?13 : -1

const naive_parse = (code:string)=>{

  type test = (c:string)=>Boolean

  const look = (test:(c:string)=>Boolean)=>(i:number):number => (code[i] && test(code[i]))?(look(test)(i+1)):i
  const lookparse = (i:number, test:test, type:(literal|identifier)['type']):[literal|identifier, number]|undefined => {
    const j = look(test)(i)
    return i === j?undefined:[lit(type, code.slice(i,j)), nonw(j)]
  }

  type parsed <T> = [T,number] | undefined | false
  type tryparse <T> = (i:number)=>parsed<T>
  
  const match = (s:string)=>(i:number):Boolean => code.slice(i, i+s.length) === s
  const matchparse = (i:number, s:string, t:literalop):parsed<expression>=>(match(s)(i) && [lit(t, s), nonw(i+s.length)])
  
  const parse_atom:tryparse<expression> = (i:number) => {
    return lookparse(i, c=>c<='9' && c>='0', "number")
    || matchparse(i, "true", "boolean")
    || matchparse(i, "false", "boolean")
    || matchparse(i, "null", "null")
    || lookparse(i, c=>(c<='z' && c >='a') || (c<='Z' && c >='A'),"identifier")
    || (code[i] === '"' && lookparse(i+1, c=>c!='"', "string"))
    || (code[i] === "'" && lookparse(i+1, c=>c!="'", "string"))
    || undefined
  }

  const parse_operator = (i:number):parsed<string> =>{
    const j = look(c=>symbolschars.includes(c))(i)
    return (i == j)?undefined : [code.slice(i,j), nonw(j)]
  }

  const parse_continue = ([left, i]:[expression, number]):parsed<expression> => {
    const po = parse_operator(i)
    if (!po) return [left, i]
    const [next_symbol, ni] = po
    const exn = parse_expression(ni)
    if (!exn) return [left, i]
    const [next, j] = exn
    if (binary_symbols.includes(next_symbol)){
      return parse_continue([newbinary(next_symbol as binaryop, left, next), j])
    }
    if (next_symbol == ".") 
      return assertEq(next.type, "identifier", "expected identifier"),
      parse_continue([idx(left,{...next, type:"string"}), j])
    if (next_symbol == "[") {
      const closer = parse_operator(j)
      return closer && assertEq(closer[0], "]", "expected ]"),
      parse_continue([idx(left, next), (closer as [string, number])[1]])
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

  const parse_group = ([open, i]:[string, number]):[composite<astop>,number] => {
    const item = parse_expression(i)
    const close = close_symbols[group_symbols.indexOf(open)]
    const type = open=="["?"[]":open=="{"?"{}":"arglist" as astop
    if (item){
      const [next, j] = item
      const comm = parse_operator(j)
      if (!comm) throw new Error('expected "," or '+ close)
      const [comma, k] = comm
      if (comma === ",") {
        const [rest, kn] = parse_group([open, k])
        return [comp(type, next, ...rest.children), kn]
      }
      if (comma === close) return [comp(type, next), k]
    } else {
      const closer = parse_operator(i)
      if (!closer || closer[0] !== close) throw new Error("expected "+ close)
      return [comp(type), closer[1]]
    }
    throw new Error("cant parse")

  }
  const parse_expression = (i:number):parsed<expression> => {

    const open = parse_operator(i)
    if (open){
      if (!group_symbols.includes(open[0])) return undefined
      return parse_group(open as [string, number]) as parsed<expression>
    }

    const start = parse_atom(i)
    if (!start) return undefined
    const c= parse_continue(start)

    return c
  }

  const nonw = (i:number):number=>code[i] == undefined || code[i].trim().length?i:nonw(i+1)
  const res = parse_expression(nonw(0))
  if (!res) throw new Error("cant parse"+ code)
  return res[0]
}

const testParse = (code:string, expected: any)=>{
  try{
    assertEq(naive_parse(code), ex(expected), " in parsing " + code)
  }catch(e){
    console.error(e)
  }
}

testParse("14 ", 14)
testParse("abc", idn("abc"))
testParse('"hello"', "hello")
testParse("true", true)

testParse("11+2", alu("+", 11,2))
testParse("1+2 + 3", alu("+", 1, alu("+", 2,3)))
testParse("1 == 2 %  44 ", alu("==", 1, alu("%", 2, 44)))

testParse("1?2:3", iff(1,2,3))
testParse("x=2;3", con(idn("x"),2,3))
testParse("x = 2 ; 3 * x", con(idn("x"),2,alu("*",3,idn("x"))))

testParse("x.y", idx(idn("x"), "y"))
testParse("x[y]", idx(idn("x"), idn("y")))

testParse("x=>y", lam(idn("x"), idn("y")))

testParse("[1,2,3]", arr(1,2,3))
testParse("[1,3+4]", arr(1,alu("+",3,4)))

// testParse("x.y.z", idx(idx(idn("x"), "y"), "z"))

