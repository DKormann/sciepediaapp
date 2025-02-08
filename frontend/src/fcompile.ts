import { assertEq, assertErr, log, stringify } from "./helpers"

type identifier = {type:"identifier", value: string}

type stringliteral = {type:"string", value:string}
type numberliteral = {type:"number", value:number}
type booleanliteral = {type:"boolean", value:boolean}
type nullliteral = {type:"null"| "undefined", value:null|undefined}


type expression = 
  | stringliteral | numberliteral | booleanliteral | nullliteral // "abc" | 123 | true | null
  | identifier // x
  | lambda // (x)=>y
  | application // f(x)
  | const_ // x = 22; x + y
  | if_ // true?22:33
  | binary // 1+2
  | unary // -x
  | arr // [1,2,3]
  | obj // {a:1, b:2}
  | index // x.y | x[2]


type lambda = {
  type:'lambda',
  params: identifier[],
  body: expression
}

type application = {
  type:'application',
  operator: expression,
  operands: expression[]
}

type index = {
  type:'index',
  source: expression,
  key:expression,
}

type const_ = {
  type:'const',
  binding: [identifier, expression],
  body: expression
}

type if_ = {
  type:'if',
  condition: expression,
  then: expression,
  els: expression
}

type operator = '+' | '-' | '*' | '/' | '%' | '==' | '!==' | '<' | '<=' | '>' | '>='
type binary = {
  type:'binary',
  right: expression,
  operator: operator,
  left: expression
}

type unary = {
  type:'unary',
  operator: '!' | '-',
  operand: expression
}

type spread = {type:'spread', value:expression} // ...x

type arr = {type:'arr', value:(expression|spread)[]}
type obj = {type:'obj', value:([stringliteral, expression]| spread)[]}


const tokenize = (code:string):string[] =>
  code.split(/([()])|(\s+)|(\[|\])|(\{|\})|(\[|\])|(\->)|(\=>)|(\;)|(\?)|(\==)|(\=)|(\,)|(\")|(\-)|(\+)|(\*)|(\!)|(\.\.\.)|(\.)|(\:)/).filter(s=>s!==undefined).filter(s=>s.length>0)

const parser = (code:string):expression => {
  const toks = tokenize(code)

  type parse<T> = (idx:number) => [T, number]

  const parse_identifier:parse<identifier> = (idx)=>{
    const tok = toks[idx]
    if (tok === undefined) throw new Error('unexpected end of input')
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tok)) throw new Error(`expected identifier, got ${tok}`)
    return [{type:"identifier", value:tok}, next(idx)]
  }

  const parse_literal:parse<expression> = (idx) =>{
    const [tok, nidx] = parse_identifier(idx)
    return  (toks[nidx] === '=>') ? parse_lam([tok], nidx):
            (toks[nidx] === '=') ? parse_const(tok, nidx):
            parse_continue(tok, nidx)
  }

  const parse_number:parse<numberliteral> = (idx) =>{
    const tok = toks[idx]
    if (tok === undefined) throw new Error('unexpected end of input')
    if (!/^[0-9]+$/.test(tok)) throw new Error(`expected number, got ${tok}`)
    return [{type:"number", value:parseInt(tok)}, next(idx)]
  }

  const parse_string:parse<stringliteral> = (idx) =>{
    const tok = toks[idx]
    if (tok === '"') return [{type:"string", value:''}, next(idx)]
    if (tok === undefined) throw new Error('unexpected end of input')
    const [rest, nidx] = parse_string(idx+1)
    return [{type:"string", value:tok + rest.value}, nidx]
  }

  const parse_spread:parse<spread> = (idx) =>{
    const [expr, nidx] = parse_expression(idx)
    return [{type:'spread', value:expr}, nidx]
  }

  const parse_arr:parse<arr> = (idx) =>{
    const tok = toks[idx]
    if (tok === ']') return [{type:'arr',value:[]}, next(idx)]
    if (tok === ',') return parse_arr(next(idx))
    const [expr, nidx] = (tok === '...')? parse_spread(next(idx)): parse_expression(idx)
    const [rest, nnidx] = parse_arr(nidx)
    return [{type:'arr', value:[expr, ...rest.value]}, nnidx]
  }


  const parse_obj:parse<obj> = (idx) =>{
    const tok = toks[idx]
    if (tok === '}') return [{type:'obj', value:[]}, next(idx)]
    if (tok === ',') return parse_obj(next(idx))

    const [item, nidx] = (tok === '...')? parse_spread(next(idx)): (() =>{
      const [key, nidx] = (tok[0] === '"')? parse_string(idx+1): (parse_identifier(idx) as [identifier,number])
      if (toks[0] == '"') assertEq(toks[nidx], ':', 'expected :')
      const [val, nnidx] = (toks[nidx] === ':')? parse_expression(next(nidx)): [key, nidx]
      return [[{...key,type:"string"}, val], nnidx] as [[stringliteral, expression], number]
    })()

    const [rest, nnidx] = parse_obj(nidx)
    return [{type:"obj",value:[item, ...rest.value]}as obj, nnidx]
  }


  const nextS = (idx:number):number => /\s+/.test(toks[idx]) ? nextS (idx+1) : idx
  const next = (idx:number):number => /\s+/.test(toks[idx+1]) ? next (idx+1) : idx+1

  const parse_parens = (idx:number):[expression, number] =>{
    const [exprs, nidx] = parse_tup(idx)
    if (toks[nidx] === '=>') return parse_lam(exprs, nidx)
    if (exprs.length !==1) throw new Error('cant have arg list outside of lambda')
    return [exprs[0], nidx]
  }

  const parse_continue = ( exp: expression, idx: number):[expression, number] =>
    toks[idx] === '(' ? parse_continue(...parse_app(exp, idx)):
    toks[idx] === '?' ? parse_if(exp, idx):
    /(\+)|(\-)|(\*)|(\/)|(\%)|(==)|(!==)|(<)|(<=)|(>)|(>=)/.test(toks[idx]) ? parse_bin(exp, idx):
    toks[idx] === '.' ? parse_continue(...parse_access(exp, idx)):
    toks[idx] === '[' ? parse_continue(...parse_index(exp, idx)):
    [exp, idx]


  const parse_bin = (left:expression, idx:number):[binary, number] =>{
    const operator = toks[idx] as operator
    const nidx = next(idx)
    const [right, nnidx] = parse_expression(nidx)
    return [{type:"binary" ,left, operator, right}, nnidx]
  }

  const parse_un = (idx:number):[unary, number] =>{
    const operator = toks[idx] as '!' | '-'
    const [operand, nidx] = parse_expression(next(idx))
    return [{type:"unary" ,operator, operand}, nidx]
  }

  const parse_tup = (idx: number):[expression[], number] =>{
    if (toks[idx] === ',') return parse_tup(next(idx))
    if (toks[idx] === ')') return [[], next(idx)]
    const [expr, nidx] = parse_expression(idx)
    const [rest, nnidx] = parse_tup(nidx)
    return [[expr, ...rest], nnidx]
  }

  const parse_app = (fn:expression, idx:number):[application, number] =>{
    assertEq(toks[idx], '(', 'expected (')
    const [args, nidx] = parse_tup(next(idx))
    return [{type:"application", operator:fn, operands:args}, nidx]
  }

  const parse_lam = (params:expression[], idx:number):[lambda, number] =>{
    assertEq(toks[idx], '=>', 'expected =>')
    const [body, nidx] = parse_expression(next(idx))
    return [{type:"lambda", params, body}as lambda, nidx]
  }

  const parse_access = (source:expression, idx:number):[index, number] =>{
    assertEq(toks[idx], '.', 'expected .')
    const [key, nidx] = parse_identifier(next(idx))
    return [{type:"index", source, key:{...key, type:"string"}}, nidx]
  }

  const parse_index = (source:expression, idx:number):[index, number] =>{
    assertEq(toks[idx], '[', 'expected [')
    const [key, nidx] = parse_expression(next(idx))
    assertEq(toks[nidx], ']', 'expected ]')
    return [{type:"index", source, key}, next(nidx)]
  }

  const parse_const= (id:identifier, idx:number):[const_, number] =>{
    const nidx = idx
    assertEq(toks[nidx], '=', 'expected =')
    const [expr, nnidx] = parse_expression(next(nidx))
    assertEq(toks[nnidx], ';', 'expected ";" at end of const')
    const [body, nnnidx] = parse_expression(next(nnidx))
    return [{type:"const",binding:[id, expr], body} as const, nnnidx] 
  }

  const parse_if = (cond: expression, idx:number):[if_, number] =>{
    assertEq(toks[idx], '?', 'expected ?')
    const [then, nidx] = parse_expression(next(idx))
    assertEq(toks[nidx], ':', 'expected :')
    const [els, nnidx] = parse_expression(next(nidx))
    return [{type:"if",condition:cond, then, els:els}, nnidx]
  }

  // log(toks.join('|'))
  const parse_expression: parse<expression> = (idx0=0) =>{
    const idx = nextS(idx0)
    const tok = toks[idx]
    const [res, nidx] =
    (/[0-9]/.test(tok[0]))? parse_continue(...parse_number(idx)):
    (/\"/.test(tok[0])) ? parse_continue(... parse_string(idx+1)):
    (tok === '(') ? parse_continue(...parse_parens(idx+1)):
    (/\[/.test(tok)) ? parse_continue(...parse_arr(idx+1)):
    (/\{/.test(tok)) ? parse_continue(...parse_obj(idx+1)):
    (/(\+)|(\-)|(\!)/.test(tok)) ? parse_continue(...parse_un(idx)):
    (/^(true|false)$/.test(tok)) ? parse_continue({type:"boolean", value:tok === 'true'}, next(idx)):
    parse_continue(...parse_literal(idx))
    return [res, nextS(nidx)]
  }
  
  const res = parse_expression(0)
  assertEq(res[1], toks.length, 'unexpected end of input')
  return res[0]
}

type primitive = identifier | numberliteral | stringliteral | booleanliteral | nullliteral

const prim = (type: primitive['type'] , value:any):primitive => ({type:type, value})
const iden = (value:string):identifier => prim("identifier", value) as identifier
const strn = (value:string):stringliteral => prim("string", value) as stringliteral
const fn = (params:identifier[], body:expression):lambda => ({type:"lambda", params, body})
const app = (operator:expression, operands:expression[]):application => ({type:"application", operator, operands})
const bin = (operator:operator, left:expression, right:expression):binary => ({type:"binary", operator, left, right})
const un = (operator:'!'|'-', operand:expression):unary => ({type:"unary", operator, operand});
{
  assertEq(parser("x"), prim("identifier", "x"), "compile x")
  assertEq(parser('true'), prim("boolean", true), "compile true")
  assertEq(parser('true_y'), prim("identifier", "true_y"), "compile true_y")
  assertEq(parser(" 22"), prim("number", 22), "compile 22")
  assertEq(parser('"22"'), prim("string", "22"), "compile '22'")
  assertEq(parser('"hello world"'), prim("string", "hello world"), "compile 'hello world'")

  assertEq(parser("()=>\n22"), fn([], prim("number", 22)), "compile ()=>22")
  assertEq(parser("e=>22"), fn([iden('e')], prim("number", 22) as expression), "compile e=>22")
  assertEq(parser("(()=>\n22) ()"), app(fn([], prim("number", 22)), []), "compile (()=>22) ()")
  assertEq(parser("fn(33)"), app(iden('fn'), [prim("number", 33)]), "compile fn(33)")
  assertEq(parser("( fn ) ( )"), app(iden('fn'), []), "compile (fn)()")
  assertEq(parser("fn(33, 44)"), app(iden('fn'), [prim("number", 33), prim("number", 44)]), "compile fn(33,44)")
  assertEq(parser("fn(x)(3)"), app(app(iden('fn'), [iden('x')]), [prim("number", 3)]), "compile fn(x)(3)")

  assertEq(parser("slice([], 2)"), app(iden('slice'), [{type:"arr", value:[]}, {type:"number", value:2}]), "compile array indexing")

  assertEq(parser("x = 22 ; x"), {type:"const", binding:[iden('x'), prim("number", 22)], body:iden('x')}, "compile let x=22 in x")
  assertEq(parser("x = fn ; (fn2) (fn3)"), {type:"const", binding:[iden('x'), iden('fn')], body:app(iden('fn2'), [iden('fn3')])}, "compile let x=fn in (fn2)(fn3)")

  assertEq(parser("true ? 22 : 33"), {type:"if", condition:prim("boolean", true), then:prim("number", 22), els:prim("number", 33)}, "compile if true then 22 else 33")
  assertEq(parser("true ? 22 : false ? 33 : 44"), {type:"if", condition:prim("boolean", true), then:prim("number", 22), els:{type:"if", condition:prim("boolean", false), then:prim("number", 33), els:prim("number", 44)}}, "compile if true then 22 else if false then 33 else 44")
  assertEq(parser("2 ? 3 : 4"), {type:"if", condition:prim("number", 2), then:prim("number", 3), els:prim("number", 4)}, "compile if 2 then 3 else 4")

  assertEq(parser("1 + 2"), bin("+", prim("number", 1), prim("number", 2)), "compile 1+2")
  assertEq(parser('"hello" + "world"'), bin("+", prim("string", "hello"), prim("string", "world")), "compile 'hello'+'world'")
  assertEq(parser("1 * 2"), bin("*", prim("number", 1), prim("number", 2)), "compile 1*2")
  assertEq(parser("1 % 2"), bin("%", prim("number", 1), prim("number", 2)), "compile 1%2")
  assertEq(parser("1 == 2"), bin("==", prim("number", 1), prim("number", 2)), "compile 1==2")
  assertEq(parser("1 + 2 + 4"), bin("+", prim("number", 1), bin("+", prim("number", 2), prim("number", 4))), "compile 1+2+4")

  assertEq(parser("-1"), un("-", prim("number", 1)), "compile -1")
  assertEq(parser("!1"), un("!", prim("number", 1)), "compile !1")
  assertEq(parser("!!1"), un("!", un("!", prim("number", 1))), "compile !!1")
  assertEq(parser("(!(!2))"), un("!", un("!", prim("number", 2))), "compile !!1")

  assertEq(parser("[1,2 ,3 ]"), {type:"arr", value:[prim("number", 1), prim("number", 2), prim("number", 3)]}, "compile [1,2,3]")
  assertEq(parser(" [ 1,2 ,3 ]"), {type:"arr", value:[prim("number", 1), prim("number", 2), prim("number", 3)]}, "compile [1,2,3]")
  assertEq(parser("[...x, ...y ,]"), {type:"arr", value:[{type:"spread", value:iden("x")}, {type:"spread", value:iden("y")}]}, "compile [...x, ...y]")

  assertEq(parser("{}"), {type:"obj", value:[]}, "compile {}")
  assertEq(parser("{a:1}"), {type:"obj", value:[[strn("a"), prim("number", 1)]]}, "compile {a:1}")
  assertEq(parser("{a:1, b:2,}"), {type:"obj", value:[[strn("a"), prim("number", 1)], [strn("b"), prim("number", 2)] ]}, "compile {a:1, b:2}")
  assertEq(parser('{a:1, "bonobo":(3+4), c: !x, val, ...rest}'), {type:"obj", value:[[strn("a"), prim("number", 1)], [strn( "bonobo"), bin("+", prim("number", 3), prim("number", 4))], [strn("c"), un("!", iden("x"))], [strn("val"),iden("val")], {type:"spread", value:iden("rest")}]}, "compile {a:1, 'bonobo':3+4, c:!x, val, ...rest}")

  assertEq(parser("e.x"), {type:"index", source:{type:"identifier", value:"e"}, key:{type:"string", value:"x"}}, "compile e.x")
  assertEq(parser('e["x"]'), {type:"index", source:{type:"identifier", value:"e"}, key:{type:"string", value:"x"}}, "compile e.x")
  assertEq(parser('e[x]'), {type:"index", source:{type:"identifier", value:"e"}, key:{type:"identifier", value:"x"}}, "compile e.x")
  assertEq(parser('e.x.y'), {type:"index", source:{type:"index", source:{type:"identifier", value:"e"}, key:{type:"string", value:"x"}}, key:{type:"string", value:"y"}}, "compile e.x.y")


  assertEq(parser("x = 22; x"), {type:"const", binding:[iden("x"), prim("number", 22)], body:iden("x")}, "compile x=22;x")
  assertEq(parser("x = 22; y = 33; x"), {type:"const", binding:[iden("x"), prim("number", 22)], body:{type:"const", binding:[iden("y"), prim("number", 33)], body:iden("x")}}, "compile x=22;y=33;x")
  assertEq(parser("[x=22;x]"), {type:"arr", value:[{type:"const", binding:[iden("x"), prim("number", 22)], body:iden("x")}]}, "compile [x=22;x]")
  assertEq(parser("{x: x=22;x}"), {type:"obj", value:[[strn("x"), {type:"const", binding:[iden("x"), prim("number", 22)], body:iden("x")}] ]}, "compile {x: x=22;x}")

  assertErr(()=>{parser('x y')}, 'shouldnt accept x y')
  assertErr(()=>{parser('x.[y]')}, 'shouldnt accept x.[y]')
  assertErr(()=>{parser('x[.y]')}, 'shouldnt accept x[.y]')
  assertErr(()=>{parser('x[]')}, 'shouldnt accept x[]')
  assertErr(()=>{parser('x[1 2]')}, 'shouldnt accept x[1 2]')
  assertErr(()=>{parser('x[1,2]')}, 'shouldnt accept x[1,2]')
  assertErr(()=>{parser('x"2"')}, 'shouldnt accept x"2"')


}


const compile_js = (ast:expression|spread):string =>{
  
  return ast.type === "identifier" ? ast.value:
  ast.type == "number" || ast.type == "string" || ast.type == "boolean" || ast.type == "null" ? JSON.stringify((ast as any).value):
  ast.type == "undefined" ? "undefined":
  ast.type == "arr" ? `[${(ast as arr).value.map(compile_js).join(",")}]`:
  ast.type == "spread" ? `...${compile_js(ast.value)}`:
  ast.type == "obj" ? `({${(ast as obj).value.map(p=>p instanceof Array? `"${(p[0]).value}":${compile_js(p[1])}`: compile_js(p)).join(",")}})`:
  ast.type == "application" ? `${compile_js(ast.operator)}(${ast.operands.map(compile_js).join(",")})`:
  ast.type == "binary" ? `(${compile_js(ast.left)} ${ast.operator} ${compile_js(ast.right)})`:
  ast.type == "unary" ? `(${ast.operator}${compile_js(ast.operand)})`:
  ast.type == "if" ? `(${compile_js(ast.condition)}?${compile_js(ast.then)}:${compile_js(ast.els)})`:
  ast.type == "lambda" ? `(${ast.params.map(compile_js).join(",")})=>${compile_js(ast.body)}`:
  ast.type == "const" ? `(()=>{const ${compile_js(ast.binding[0])} = ${compile_js(ast.binding[1])}; return ${compile_js(ast.body)}})()`:
  '<unknown>'
}


const cpjs = (x:string)=>compile_js(parser(x))
const checkdiff = (source:string, result:string) => assertEq(cpjs(source), result, `compiler ${source}`)
const checkprim = (x:string) => checkdiff(x,x);

[
  "x", "22", '"hello world"', "true", "falsey",
  "[1,2,3]", "[1,2,...x]",
  '({"e":22})',
  "fn(22)", "fn(22,33)", "fn(x)(3)", "(!x)", "(!fn(22))", "(2 + 3)",
  "(1 + 2)", "(1 * 2)", "(1 % 2)", "(1 == 2)", "(-1)", "(!1)", "(!(!1))",
  "(true?22:33)",
  "(x)=>22", "(a,b)=>(a + b)",
].map(checkprim)


checkdiff('{"key":x,t}', '({"key":x,"t":t})')
checkdiff("{a}", '({"a":a})')
checkdiff("{...a}", '({...a})')
checkdiff("x = 22; x", '(()=>{const x = 22; return x})()')
checkdiff('{"u":x = 3; x}', '({"u":(()=>{const x = 3; return x})()})')


const checkeval = (source:string, result:any) => {const js = cpjs(source);assertEq(eval(js), result, ` eval ${source} => ${js}`)}


checkeval('22', 22)
checkeval('true', true)
checkeval('x=2;x', 2)
checkeval('{"u":x = 3; x}', {u:3})
checkeval('{"e":x = 44; x}', {e:44})
checkeval('[1, x=2; x*2]', [1,4])
checkeval('x = 22; x', 22)






export {}