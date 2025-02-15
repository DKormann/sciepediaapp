import { assertEq, assertErr, last, log, stringify } from "./helpers"

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
type astop = exop | "..." | "arglist" | ":" | "operator"

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



type Ok<T> = {status:"ok", val:T} & Chain<T>
type Err= {status:"err", val:string, idx:number,
  and:(fn:(x:any)=>any)=>Err,
  or:<T>(def:Result<T>)=>Result<T>
}

type Result<T> = Ok<T> | Err

type Chain <T> = {
  idx:number,
  and:<U>(fn:(x:Ok<T>)=>Result<U>)=>Result<U>,
  or:(def:Result<T>)=>Result<T>
}



type ParseOk = Ok<astnode>
type ParseErr = Err
type ParseResult = Result<astnode>


const ok = <T>(val:T, idx:number):Ok<T> => {
  
  const res = ({
    val, idx, status:"ok",
    and:(fn)=>fn(ok(val, idx)),
    or:(_)=>ok(val, idx)
  } as Ok<T>)
  assertEq(res.or!=undefined, true, "ok")
  return res
}

const err = (val:string, idx:number):Err => {
  const res ={
    val, idx, status:"err",
    and:(_:any)=>err(val, idx),
    or:<T>(def:Result<T>)=>def
  } as Err
  assertEq(res.or!=undefined, true, "err or")
  return res
}


const parseOk = ok<astnode>
const parseErr = err


const naive_parse = (code:string): Result<astnode>=>{

  type test = (c:string)=>Boolean

  const look = (test:(c:string)=>Boolean)=>(i:number):number => (code[i] && test(code[i]))?(look(test)(i+1)):i
  const lookparse = (x:number, test:test, type:(literal|identifier)['type']):ParseResult => {
    const j = look(test)(x)
    const res =  j === x?parseErr(`cant parse ${type}`, x):parseOk(lit(type, code.slice(x,j)), nonw(j))
    return res
  }

  const match = (s:string)=>(i:number):Boolean => code.slice(i, i+s.length) === s
  const matchparse = (i:number, s:string, t:literalop):ParseResult=>
    // (match(s)(i) && parseOk(lit(t, s), nonw(i+s.length)))
    match(s)(i)?parseOk(lit(t, s), nonw(i+s.length)):parseErr(`cant parse ${s}`, i)

  const parse_until_char = (i:number, c:string, type:astop):ParseResult=>{
    const j = code.indexOf(c, i)
    return j === -1?parseErr(`parse error, expected: ${c}`, i):parseOk(lit(type as literal['type'], code.slice(i,j)), nonw(j+1))
  }

  const parse_atom = (i:number):ParseResult => {
    return lookparse(i, c=>c<='9' && c>='0', "number")
    .or(matchparse(i, "true", "boolean"))
    .or(matchparse(i, "false", "boolean"))
    .or(matchparse(i, "null", "null"))
    .or(lookparse(i, c=>(c<='z' && c >='a' || c == '_') || (c<='9' && c >='0') || (c<='Z' && c >='A'),"identifier"))
    .or(
      code[i] === '"' ? parse_until_char(i+1, '"', "string") :
      code[i] === "'" ? parse_until_char(i+1, "'", "string") :
      parseErr("cant parse value", i))
  }

  const parse_operator = (i:number):[string|undefined,number] =>
    symbols.map(s=>match(s)(i) && [s, nonw(i+s.length)] as [string, number]).find(Boolean) || [undefined, i]

  const parse_continue = (left:ParseOk):ParseResult =>{
    const [next_symbol, ni] = parse_operator(left.idx)
    if (next_symbol == undefined) return left
    if (close_symbols.includes(next_symbol)) return left
    if (next_symbol == "."){
      const exn = parse_atom(ni)
      if (exn.status == "err" || exn.val.type !== "identifier") return parseErr('expected identifier after "."', ni)
      const res = idx(left.val,{...exn.val, type:"string"})
      return parse_continue(ok<astnode>(res, exn.idx))
    }
    const next = parse_expression(ni)
    if (next.status == "err") return left
    if (binary_symbols.includes(next_symbol)){
      return parse_continue(ok<astnode>(newbinary(next_symbol as binaryop, left.val, next.val), next.idx))
    }
    if (next_symbol == "[") {
      const [closer, j] = parse_operator(next.idx)
      if (closer !== "]") return parseErr("expected ]", ni)
      return parse_continue(parseOk(idx(left.val, next.val), nonw(j)))
    }
    if (next_symbol == "("){
      const arglist = parse_group(["(", ni])
      if (arglist.status == "err") return parseErr(arglist.val, ni)
      return parse_continue(parseOk(app(left.val, arglist.val), nonw(arglist.idx)))
    }

    if (tertiary_symbols.includes(next_symbol)){
      const op2 = next_symbol=='='?';':':'
      const [ns2, nni] = parse_operator(next.idx)
      if (ns2 !== op2) return parseErr("expected \""+ op2+"\", found: \""+ ns2 + "\"", ni)
      const right = parse_expression(nni)
      if (right.status == "err") return right
      return parse_continue(parseOk(newtertiary(next_symbol+ns2 as tertiaryop, left.val, next.val, right.val), right.idx))
    }
    return left
  }

  const parse_group = ([open, i]: [string, number]):ParseResult =>{

    const close = close_symbols[group_symbols.indexOf(open)]
    const type = open=="["?"[]":open=="{"?"{}":"arglist" as astop
    const parse_items = (i:number): Result<astnode[]> =>{
      const [closed, idx] = parse_operator(i)
      if (closed == close) return ok<astnode[]>([], nonw(idx)) as Result<astnode[]>
      const val = parse_expression(i)
      if (val.status == "err") return val as Err
      const [sybl, k] = parse_operator(val.idx)
      if (sybl == undefined) return err("expected symbol", val.idx)
      const kn = nonw(k)
      if (sybl === close) return ok<astnode[]>([val.val], kn)
      if (type == "{}"){
        if(sybl == ":"){
          const value = parse_expression(kn)
          if (value.status == "err") return value
          const key = val.val.type === "identifier"?{...val.val, type:"string"}:val.val
          const [comma, knn] = parse_operator(value.idx)
          if (comma == undefined) return err("expected symbol", value.idx)
          const rest = (comma == ',')?  parse_items(knn) : ok<astnode[]>([], knn) as Ok<astnode[]>
          if (rest.status == "err") return rest
          if (comma == close || comma == ',')  return ok<astnode[]>([newast(":", 2, key, value.val),...rest.val], rest.idx)
        }
        if (sybl == ','){
          const rest = parse_items(kn)
          if (rest.status == "err") return rest
          const value = val.val.type === "identifier"? newast(":", 2, {...val.val, type:"string"}, val.val):val.val
          return ok<astnode[]>([value, ...rest.val], rest.idx)
        }
      }
      if (sybl == ','){
        const rest = parse_items(kn)
        if (rest.status == "err") return rest
        return ok<astnode[]>([val.val, ...rest.val], rest.idx)
      }
      return err("cant parse", i)
    }
    const items = parse_items(i)
    return items.and((items:Ok<astnode[]>)=>ok(comp(type, ...items.val) as astnode, items.idx))
  }


  const parse_expression = (i:number):ParseResult => {

    const [os, on] = parse_operator(i)
    if (os != undefined){
      if (unary_symbols.includes(os)){
        const ex = parse_expression(on)
        return ex.and((ex:Ok<astnode>)=>
          parse_continue(parseOk(newunary(os as unaryop, ex.val), ex.idx)))
      }
      if(!group_symbols.includes(os)) return parseErr("cant parse", i)
      return parse_continue(parse_group([os, on]) as ParseOk)
    }

    return (parse_atom(i)).and((start:Ok<astnode>)=>parse_continue(start))

  }

  const nonw = (i:number):number=> code[i] == undefined? i:
    code[i] == '/' && code[i+1] == '/' ? nonw(code.indexOf('\n', i+1)):
    code[i] == '/' && code[i+1] == '*' ? nonw(code.indexOf('*/', i+1)+2):
    code[i].trim().length ? i:nonw(i+1)


  const res = parse_expression(nonw(0))
  if (res.status == "err") return res
  
  if (res.idx != code.length){
    return parseErr("unexpected token after end of expression: "+ code.slice(res.idx), res.idx)
  }
  return res
}

export const nice_error = (code:string, err:Err):string =>{
  const precode = code.slice(0, err.idx).trimEnd()
  const lines = precode.split('\n')
  const line = lines.length-1
  const col = lines[line].length
  return `ERROR: ${err.val} at line ${line+1},\n${code.split('\n')[line]}\n${" ".repeat(col)}^`
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

const parse = (code:string):ParseResult =>
  naive_parse(code).and(x=>ok(rearange(x.val), x.idx))

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
  ast.arity == 2 ? sfill(`({}${ast.type == "app"?"":ast.type}${
    ast.type == "=>" ? "({})" : "{}"
  })`, ...ast.children):
  ast.arity == 1 ? sfill(`${ast.type}{}`, ...ast.children):
  "<unknown>"
}

const compile = (code:string):Result<string> => 
  parse(code).and(x=>ok(buildjs(x.val), x.idx))

{
  const testRearange = (ast:astnode, expected:expression)=>{
    try{
      assertEq(rearange(ast), expected, " in rearanging " + stringify(ast))
    }catch(e){
      console.error(e)
    }
  }

  const testNaive = (code:string, expected: any)=>{

    const p = naive_parse(code)
    if (p.status == "err") console.error(nice_error(code, p))
    try{
      assertEq(p.val, ex(expected), " in parsing " + code)
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



  const testParse = (code:string, expected: any)=>{
    const res = parse(code)
    if (res.status == "err") console.error(nice_error(code, res))

    try{
      assertEq (res.val, ex(expected), '')
    }catch(e){
      console.error("parse fail on "+ code + " =>\n"+ buildjs((res as ParseOk).val) + " !=\n"+ buildjs(ex(expected)))
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
  const res = compile(code)
  if (res.status == "err") console.error(nice_error(code, res))
  try {
    assertEq(res.val, expected, " in compiling " + code)
  }catch(e){
    console.error("unexpected result compiliing "+code+ " =>\n"+ res.val + " !=\n"+ expected)
  }
}

const assertCompileErr = (code:string, expected: string)=>{
  const res = compile(code)
  if (res.status == "ok") console.error("expected error in "+ code)
  else assertEq(res.val, expected, " in compiling " + code)
}

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
testCompile('"a"+"b"', '("a"+"b")')
testCompile('a.b', '(a["b"])')

testCompile('n=>n<2?n:2', '(n=>(((n<2)?n:\n2)))')
testCompile('fn(x-2)', '(fn((x-2)))')

testCompile('[fn(x),2]', '[(fn(x)),2]')
testCompile('[x[3],e.r,2,]', '[(x[3]),(e["r"]),2]')
testCompile("[-x, !true]", '[-x,!true]')

testCompile("a.b(22)", '((a["b"])(22))')
testCompile("a.b(f(22))", '((a["b"])((f(22))))')

testCompile('"hello " + "world"', '("hello "+"world")')
assertCompileErr('"abc', `parse error, expected: "`)

const testEval = (code:string, result:any) =>{
  const fs = compile(code)
  if(fs.status == "err") throw new Error(nice_error(code, fs));
  log(fs.val)
  assertEq(Function('return '+fs.val)(), result)
}
  
testEval("22",22)
testEval("[a,b]=[1,2]; a", 1)
testEval("{e} = {e:44};e", 44)
testEval('(x=>{x})(33)', {x:33})

export const runfun = (code:string, debug = false)=>{
  const jscode = compile(code)
  if (debug) log({jscode})
  return jscode.and(c=>{
    try{
      // return ok<any>(eval(c.val), c.idx)
      const FN = new Function("return "+c.val)
      return ok(FN(), c.idx)
    }catch(e){
      return err((e as Error).message, c.idx)
    }
  })
}
