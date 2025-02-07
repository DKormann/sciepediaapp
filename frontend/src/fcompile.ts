import { assertEq, log } from "./helpers"

type identifier = {tag: string}
type primitive = {number:number} | {string:string} | {boolean:boolean} | "NULL" | "UNDEFINED"

type expression = 
  | primitive
  | identifier
  | lambda
  | application
  | const_
  | if_
  | binary
  | unary
  | arr
  | obj


type lambda = {
  params: identifier[],
  body: expression
}

type application = {
  operator: expression,
  operands: expression[]
}

type const_ = {
  binding: [identifier, expression],
  body: expression
}

type if_ = {
  condition: expression,
  then: expression,
  els: expression
}

type operator = '+' | '-' | '*' | '/' | '%' | '===' | '!==' | '<' | '<=' | '>' | '>='
type binary = {
  right: expression,
  operator: operator,
  left: expression
}

type unary = {
operator: '!' | '-',
  operand: expression
}

type spread = {spread:expression}

type arr = {arr:(expression|spread)[]}
type obj = {obj:([identifier|string, expression]|identifier| spread)[]}


const tokenize = (code:string):string[] =>
  // split by spaces, parens, braces, and brackets, arrows
  code.split(/([()])|(\s+)|(\[|\])|(\{|\})|(\[|\])|(\->)|(\=>)|(\;)|(\==)|(\=)|(\,)|(\")|(\-)|(\+)|(\!)|(\.\.\.)|(\:)/).filter(s=>s!==undefined).filter(s=>s.length>0)

const parser = (code:string):expression => {
  const toks = tokenize(code)

  type parse<T> = (idx:number) => [T, number]

  const parse_identifier:parse<identifier> = (idx)=>{
    const tok = toks[idx]
    if (tok === undefined) throw new Error('unexpected end of input')
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tok)) throw new Error(`expected identifier, got ${tok}`)
    return [{tag:tok}, next(idx)]
  }

  const parse_literal:parse<expression> = (idx) =>{
    const [tok, nidx] = parse_identifier(idx)
    return  (toks[nidx] === '=>') ? parse_lam([tok], nidx):
            (toks[nidx] === '=') ? parse_const(tok, nidx):
            parse_continue(tok, nidx)
  }

  const parse_number:parse<expression> = (idx) =>{
    const tok = toks[idx]
    if (tok === undefined) throw new Error('unexpected end of input')
    if (!/^[0-9]+$/.test(tok)) throw new Error(`expected number, got ${tok}`)
    return  parse_continue({number:parseInt(tok)}, next(idx))
  }

  const parse_string:parse<{string:string}> = (idx) =>{
    const tok = toks[idx]
    if (tok === '"') return [{string:''}, next(idx)]
    if (tok === undefined) throw new Error('unexpected end of input')
    const [rest, nidx] = parse_string(idx+1)
    return [{string:tok + rest.string}, nidx]
  }

  const parse_spread:parse<spread> = (idx) =>{
    const [expr, nidx] = parse_expression(idx)
    return [{spread:expr}, nidx]
  }

  const parse_arr:parse<arr> = (idx) =>{
    const tok = toks[idx]
    if (tok === ']') return [{arr:[]}, next(idx)]
    if (tok === ',') return parse_arr(next(idx))
    const [expr, nidx] = (tok === '...')? parse_spread(next(idx)): parse_expression(idx)
    const [rest, nnidx] = parse_arr(nidx)
    return [{arr:[expr, ...rest.arr]}, nnidx]
  }


  const parse_obj:parse<obj> = (idx) =>{
    const tok = toks[idx]
    if (tok === '}') return [{obj:[]}, next(idx)]
    if (tok === ',') return parse_obj(next(idx))

    const [item, nidx] = (tok === '...')? parse_spread(next(idx)): (() =>{
      const [key, nidx] = (tok[0] === '"')? parse_string(idx+1): (parse_identifier(idx) as [identifier,number])

      if (toks[nidx] != ':' && tok[0] !=='"') return [key, nidx] as [identifier, number]
      assertEq(toks[nidx], ':', 'expected :')
      const [val, nnidx] = parse_expression(next(nidx))
      return [[key, val], nnidx] as [[{string:string}|identifier, expression], number]
    })()

    const [rest, nnidx] = parse_obj(nidx)
    return [{obj:[item, ...rest.obj]}as obj, nnidx]
  }


  const nextS = (idx:number):number => /\s+/.test(toks[idx]) ? nextS (idx+1) : idx
  const next = (idx:number):number => /\s+/.test(toks[idx+1]) ? next (idx+1) : idx+1

  const parse_parens = (idx:number):[expression, number] =>{
    const [exprs, nidx] = parse_tup(idx)
    if (toks[nidx] === '=>') return parse_lam(exprs, nidx)
    if (exprs.length !==1) throw new Error('cant have arg list outside of lambda')
    return parse_continue(exprs[0], nidx)
  }

  const parse_continue = ( exp: expression, idx: number):[expression, number] =>
    toks[idx] === '(' ? parse_app(exp, idx):
    toks[idx] === '?' ? parse_if(exp, idx):
    /(\+)|(\-)|(\*)|(\/)|(\%)|(==)|(!==)|(<)|(<=)|(>)|(>=)/.test(toks[idx]) ? parse_bin(exp, idx):
    [exp, idx]

  const parse_bin = (left:expression, idx:number):[binary, number] =>{
    const operator = toks[idx] as operator
    const nidx = next(idx)
    const [right, nnidx] = parse_expression(nidx)
    return [{left, operator, right}, nnidx]
  }

  const parse_un = (idx:number):[unary, number] =>{

    const operator = toks[idx] as '!' | '-'
    const [operand, nidx] = parse_expression(next(idx))
    return [{operator, operand}, nidx]
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
    return [{operator:fn, operands:args}, nidx]
  }

  const parse_lam = (params:expression[], idx:number):[lambda, number] =>{
    assertEq(toks[idx], '=>', 'expected =>')
    const [body, nidx] = parse_expression(next(idx))
    return [{params, body}as lambda, nidx]
  }

  const parse_const= (id:identifier, idx:number):[const_, number] =>{
    const nidx = idx
    assertEq(toks[nidx], '=', 'expected =')
    const [expr, nnidx] = parse_expression(next(nidx))
    assertEq(toks[nnidx], ';', 'expected ";" at end of const')
    const [body, nnnidx] = parse_expression(next(nnidx))
    return [{binding:[id, expr], body} as const, nnnidx] 
  }

  const parse_if = (cond: expression, idx:number):[if_, number] =>{
    assertEq(toks[idx], '?', 'expected ?')
    const [then, nidx] = parse_expression(next(idx))
    assertEq(toks[nidx], ':', 'expected :')
    const [els, nnidx] = parse_expression(next(nidx))
    return [{condition:cond, then, els:els}, nnidx]
  }


  // log(toks.join(''))
  const parse_expression: parse<expression> = (idx=0) =>{
    const tok = toks[idx]
    const [res, nidx] =
    (/\s+/.test(tok)) ? parse_expression(idx+1):
    (/[0-9]/.test(tok[0]))? parse_number(idx):
    (/\"/.test(tok[0])) ? parse_continue(... parse_string(idx+1)):
    (/\[/.test(tok)) ? parse_arr(idx+1):
    (/\{/.test(tok)) ? parse_obj(idx+1):
    (tok === '(') ? parse_parens(idx+1):
    (/(\+)|(\-)|(\!)/.test(tok)) ? parse_un(idx):
    parse_literal(idx)
    return [res, nextS(nidx)]
  }

  return parse_expression(0)[0]
}

assertEq(parser("x"), {tag:"x"}, "compile x")
assertEq(parser(" 22"), {number:22}, "compile 22")
assertEq(parser('"22"'), {string:"22"}, "compile '22'")
assertEq(parser('"hello world"'), {string:"hello world"}, "compile 'hello world'")

assertEq(parser("()=>\n22"), {params:[], body:{number:22}}, "compile ()=>22")
assertEq(parser("e=>22"), {params:[{tag:"e"}], body:{number:22}}, "compile e=>22")
assertEq(parser("(()=>\n22) ()"), {operator:{params:[], body:{number:22}}, operands:[]}, "compile (()=>22) ()")
assertEq(parser("fn(33)"), {operator:{tag:"fn"}, operands:[{number:33}]}, "compile fn(33)")
assertEq(parser("( fn ) ( )"), {operator:{tag:"fn"}, operands:[]}, "compile (fn)()")

assertEq(parser("x = 22 ; x"), {binding:[{tag:"x"}, {number:22}], body:{tag:"x"}}, "compile let x=22 in x")
assertEq(parser("x = fn ; (fn2) (fn3)"), {binding:[{tag:"x"}, {tag:"fn"}], body:{operator:{tag:"fn2"}, operands:[{tag:"fn3"}] }}, "compile let x=fn in (fn2)(fn3)")

assertEq(parser("true ? 22 : 33"), {condition:{tag:"true"}, then:{number:22}, els:{number:33}}, "compile if true then 22 else 33")
assertEq(parser("true ? 22 : false ? 33 : 44"), {condition:{tag:"true"}, then:{number:22}, els:{condition:{tag:"false"}, then:{number:33}, els:{number:44}}}, "compile if true then 22 else if false then 33 else 44")
assertEq(parser("2 ? 3 : 4"), {condition:{number:2}, then:{number:3}, els:{number:4}}, "compile if 2 then 3 else 4")

assertEq(parser("1 + 2"), {operator:"+", left:{number:1}, right:{number:2}}, "compile 1+2")
assertEq(parser('"hello" + "world"'), {operator:"+", left:{string:"hello"}, right:{string:"world"}}, "compile 'hello'+'world'")
assertEq(parser("1 * 2"), {operator:"*", left:{number:1}, right:{number:2}}, "compile 1*2")
assertEq(parser("1 % 2"), {operator:"%", left:{number:1}, right:{number:2}}, "compile 1%2")
assertEq(parser("1 == 2"), {operator:"==", left:{number:1}, right:{number:2}}, "compile 1==2")

assertEq(parser("-1"), {operator:"-", operand:{number:1}}, "compile -1")
assertEq(parser("!1"), {operator:"!", operand:{number:1}}, "compile !1")
assertEq(parser("!!1"), {operator:"!", operand:{operator:"!", operand:{number:1}}}, "compile !!1")

assertEq(parser("[1,2 ,3 ]"), {arr:[{number:1},{number:2},{number:3}]}, "compile [1,2,3]")
assertEq(parser(" [ 1,2 ,3 ]"), {arr:[{number:1},{number:2},{number:3}]}, "compile [1,2,3]")
assertEq(parser("[...x, ...y ,]"), {arr:[{spread:{tag:"x"}},{spread:{tag:"y"}}]}, "compile [...x, ...y]")

assertEq(parser("{}"), {obj:[]}, "compile {}")
assertEq(parser("{a:1}"), {obj:[[{tag:"a"},{number:1}]]}, "compile {a:1}")
assertEq(parser("{a:1, b:2, }"), {obj:[[{tag:"a"},{number:1}], [{tag:"b"},{number:2}]]}, "compile {a:1, b:2}")
assertEq(parser('{a:1, "bonobo":(3+4), c: !x, val, ...rest}'), {obj:[[{tag:"a"},{number:1}], [{string:"bonobo"},{operator:"+", left:{number:3}, right:{number:4}}], [{tag:"c"},{operator:"!", operand:{tag:"x"}}], {tag:"val"}, {spread:{tag:"rest"}}]}, "compile {a:1, 'bonobo':3+4, c:!x, val, ...rest}")

export {}


