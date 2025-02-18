

// FunScript: pure functional script language similar to JS

// ## stuff that is like JS:

// - arrow functions
// - function calling
// - numbers & strings
// - arrays & objects
// - if else shorthand with `? :`

// ```javascript
// console.log("Hello, world!")
// ```

// ```javascript
// x = 22 + 33;
// arr = [x, 1, 3];
// obj = {a: 1, b: 2};
// ```

// ```javascript
// arrow = (x) => x + 1;
// max = (a, b) => a > b ? a : b;
// ```

// ## stuff we dont have:

// - no `var`, `let`, `const` - all variables are immutable
// - no `this` - all functions are pure
// - no `for` loops - use recursion instead
// - no `if` else - use ? : notation instead
// - statements (!) - everything is an expression

// ## stuff we have that JS doesn't:

// - infix variable assigment - you can assign variables in the middle of any expression


// ```javascript
// obj = {a: 1, mx: 
//   q = 33;
//   q + 1;
// }
// ```

// ```javascript
// [
//   x = get_x();
//   y = get_y();
//   x + y,

//   z = get_z();
//   z + 1
// ] // this array will have to values: x + y and z + 1. x, y and z are local to the array not global
// ```


// ### tradeoffs:
// - you dont need curly braces for anything except objects
// - semicolons specifically for variable assignment
// - code becomes dense but concise and fast to write


// ### example:

// ```javascript

// // fibonacci

// fib = n => 
//   n < 2 ?
//   n :
//   fib(n - 1) + fib(n - 2);

// _ = console.log(fib(10));

// fast_fib = n => 
//   _fib = (a, b, n) =>
//     n == 0 ?
//     a :
//     _fib(b, a + b, n - 1);
//   _fib(0, 1, n);

// console.log(fast_fib(100))

import { assertEq, assertErr, last, log, stringify, Res, Ok, Err, ok, err } from "./helpers"



type code = {
  type: string,
  value: string,
  start: number,
  end: number,
}

type token = code & {type:"number" | "string" | "boolean" | "null" | "identifier" | "symbol" | "typo" | "whitespace" | "comment"}


const symbols = ["(", ")", "{", "}", "[", "]", ",", ":", "?", "=>", "!", "&&", "||", "+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "=", ";", "...", ".", "//"]
const symbol_letters = new Set(symbols.join('').split(''))

const seek = (code:string, start:number, pred: (c:string, i:number)=>boolean):number =>{
  const off = code.slice(start).split('').findIndex(pred)
  return off == -1 ? code.length : start + off
}


const tokenize = (code:string, i:number=0):token[] =>{
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
  return [{type:typ, value:code.slice(i, nxt), start:i, end:nxt}, ...tokenize(code, nxt)]
}

assertEq(tokenize("1"), [{type:"number", value:"1", start:0, end:1}])
assertEq(tokenize("1 +  1"), [{type:"number", value:"1", start:0, end:1}, {type:"whitespace", value:" ", start:1, end:2}, {type:"symbol", value:"+", start:2, end:3}, {type:"whitespace", value:"  ", start:3, end:5}, {type:"number", value:"1", start:5, end:6}])
assertEq(tokenize('{"gello" + ]22', 0), [{type:"symbol", value:"{", start:0, end:1}, {type:"string", value:"\"gello\"", start:1, end:8}, {type:"whitespace", value:" ", start:8, end:9}, {type:"symbol", value:"+", start:9, end:10}, {type:"whitespace", value:" ", start:10, end:11}, {type:"symbol", value:"]", start:11, end:12}, {type:"number", value:"22", start:12, end:14}])
assertEq(tokenize('true'), [{type:"boolean", value:"true", start:0, end:4}])
assertEq(tokenize("a + // comment\nb"), [{type:"identifier", value:"a", start:0, end:1}, {type:"whitespace", value:" ", start:1, end:2}, {type:"symbol", value:"+", start:2, end:3}, {type:"whitespace", value:" ", start:3, end:4}, {type:"comment", value:"// comment", start:4, end:14}, {type:"whitespace", value:"\n", start:14, end:15}, {type:"identifier", value:"b", start:15, end:16}])


type ast = nullary | unary | binary | ternary | nary

type nullary = code & {type:"number" | "string" | "boolean" | "null" | "identifier" | "typo", children:[]}
type unary = code & {type:"!" | "neg" | "..."} & {children: [ast]}
type binary = code & {type:"+" | "-" | "*" | "/" | "%" | "<" | ">" | "<=" | ">=" | "==" | "!=" | "&&" | "||" | "app" | "idx" | "[]" | ":"} & {children: [ast, ast]}
type ternary = code & {type:"?:" | "=;"} & {children: [ast, ast, ast]}
type nary = code & {type:"{}" | "[]" | "()"} & {children: ast[]}


const symbolpairs = [["(", ")"], ["{", "}"], ["[", "]"], ["?", ":"], ["=", ";"]]
// const binary_symbols = ["+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "&&", "||", "app", "idx", "[]"]



const parse = (code:string): ast => {

  const tokens = tokenize(code)

  const nonw = (idx:number): number =>
    tokens[idx] == undefined? idx :tokens[idx].type == "whitespace" || tokens[idx].type == "comment" ? nonw(idx+1): idx

  const parsegroup = (opener:token , idx: number):nary => {
    const closer = symbolpairs.find(s=>s[0] == opener.value)?.[1]
    const type = opener.value == "(" ? "()" : opener.value == "{" ? "{}" : "[]"
    if (closer == undefined) throw new Error("parsegroup error "+ opener.value+ " not an opener")
    const tok = tokens[idx]
    if (tok.value == closer) return {type, value:"", children:[], start: opener.start, end: tok.end}
    if (tok.value == ",") return parsegroup(opener, nonw(idx+1))

    if (type == "{}"){

    }
    const child = parseexpr(idx)
    const rest = parsegroup(opener, nonw(idx+1))
    return {...rest, children:[child, ...rest.children]}
  }

  const parseexpr = (idx:number):ast => {
    const tok = tokens[idx]
    const tyo = {type:"typo", value:"unexpected "+ tok.value, start:tok.start, end:tok.end, children:[]} as ast
    const first:ast =
      (tok.type == "number" || tok.type == "string" || tok.type == "boolean" || tok.type == "null" || tok.type == "identifier") ? {...tok, children:[]} as nullary:
      (tok.type == "symbol") ?
        "({[".includes(tok.value) ? parsegroup(tok, idx+1):
        tok.value == "!" ? {...tok, type:"!", children:[parseexpr(idx+1)]}:
        tok.value == "-" ? {...tok, type:"neg", children:[parseexpr(idx+1)]}:
        tyo:
      tyo

    const nexttok = tokens[nonw(idx+1)]
    if (nexttok == undefined) return first
    if (nexttok.type == "symbol"){
      const op: ast["type"] = nexttok.value == "(" ? "app" : nexttok.value == "[" ? "idx" : nexttok.value == "." ? "idx" : (nexttok.value as ast['type'])
      if (['+', '-', '*', '/', '%', '<', '>', '<=', '>=', '==', '!=', '&&', '||'].includes(op)){
        const second = parseexpr(nonw(nexttok.end+1))
        return {type: op, value: "", start: first.start, end:second.end, children: [first, second]} as binary
      }
    }
    
    return first
  }



  return parseexpr(0)
}



assertEq(parse("1"), {type:"number", value:"1", start:0, end:1, children:[]})
assertEq(parse("2312"), {type:"number", value:"2312", start:0, end:4, children: []})
assertEq(parse("true"), {type:"boolean", value:"true", start:0, end:4, children: []})
assertEq(parse("{1}"), {type:"{}", value:"", start:0, end:3, children:[{type:"number", value:"1", start:1, end:2, children: []}]})


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
  "not implemented: "+ast.type
}

assertEq(build(parse("1")), "1")
assertEq(build(parse("{1}")), "{1}")

const testbuild = (...codes:string[]) =>
  assertEq(build(parse(codes[0])), codes[1] ?? codes[0], " compiling "+ codes[0])

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

testbuild("{a:33, b:44}")





// const operator_weight = (op:astop):number =>
//   (op =="?:")||(op === "=>") ? 6 :
//   (op === "<")||(op === ">")||(op === "<=")||(op === ">=")||(op === "==")||(op === "!=")?7:
//   (op === "&&")|| (op === "||")?9:
//   (op === "+")||(op === "-") ?10:
//   (op === "/")|| (op === "%")|| (op === "*")?11:
//   op==="!" ?12:
//   (op === "app") || (op=="=;") ||(op=="...")?13 :
//   (op == "idx")? 14:
//   (op === "[]") || (op === "{}") || (op === "arglist")?15:
//   -1

// const rearange = (node:astnode):astnode => {

//   const res = {...node, children:node.children.map(rearange)}

//   if (node.type === "{}" || node.type === "[]" || node.type === "arglist") return res
//   if (node.arity == 1){
//     const fst = res.children[0]
//     if (!fst.children.length || operator_weight(node.type) < operator_weight(fst.children[0].type)) return res 
//     return {...fst,children:[newunary(node.type as unaryop, fst.children[0]), ...fst.children.slice(1)]}
//   }
//   if (node.arity == 2){
//     const [fst, snd] = res.children
//     if (snd.children.length < 2 || operator_weight(node.type) <= operator_weight(snd.type)) return res
//     if (snd.type === "=>") return res
//     return {
//       type:snd.type,
//       arity:snd.arity,
//       children:[{
//         type:node.type,
//         arity:2,
//         children:[fst, snd.children[0]]
//       }, ...snd.children.slice(1)]
//     }
//   }
//   return res as expression
// }

// const parse = (code:string):ParseResult =>
//   naive_parse(code).and(x=>ok(rearange(x.val), x.idx))

// const buildjs = (ast:astnode):string =>{

//   const sfill = (template:string , ... children:astnode[]):string =>
//     children.length == 0?template:
//     sfill(template.replace("{}", buildjs(children[0])), ...children.slice(1));

//   return ast.type == "number" || ast.type == "boolean" ? `${(ast as literal).value}`:
//   ast.type == "string" ? `"${(ast as literal).value}"`:
//   ast.type == "identifier" ? (ast as identifier).value:
//   ast.type == ":" ? sfill(`{}:{}`, ...ast.children):
//   ast.type == "{}" ? `{${ast.children.map(buildjs).join(",")}}`:
//   ast.type == "[]" ? `[${ast.children.map(buildjs).join(",")}]`:
//   ast.type == "idx" ? sfill(`({}[{}])`, ...ast.children):
//   ast.type == "?:" ? sfill(`({}?{}:\n{})`, ...ast.children):
//   ast.type == "=;" ? sfill(`(()=>{const {}={};\nreturn {}})()`, ...ast.children):
//   ast.type == "arglist" ? `(${ast.children.map(buildjs).join(",")})`:
//   ast.arity == 2 ? sfill(`({}${ast.type == "app"?"":ast.type}${
//     ast.type == "=>" ? "({})" : "{}"
//   })`, ...ast.children):
//   ast.arity == 1 ? sfill(`${ast.type}{}`, ...ast.children):
//   "<unknown>"
// }



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
