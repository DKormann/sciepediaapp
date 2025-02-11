import { assertEq, assertErr, log, stringify } from "./helpers"



// // only well formed expressions
// type expression = 
//   // | stringliteral | numberliteral | booleanliteral | nullliteral // "abc" | 123 | true | null
//   | literal
//   | lambda // (x)=>y
//   | application // f(x)
//   | const_ // x = 22; x + y
//   | if_ // true?22:33
//   | binary<binaryop> // 1+2
//   | unary<unaryop> // -x
//   | arr // [1,2,3]
//   | obj // {a:1, b:2}
//   | index // x.y | x[2]

// // any subexpression
// type ast <op extends astop, n extends number> = {type:op, arity: n, children: astnode[]}
// type astnode = ast<astop, number>

// type literalop = "string" | "number" | "boolean" | "null" | "identifier"
// type unaryop = "neg" | "!"
// type binaryop = "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | ">" | "<=" | ">=" | "&&" | "||" | "=>" | "app" | "idx"
// type tertiaryop = "?:" | "=;"
// type exop = unaryop | binaryop | tertiaryop | literalop | "[]" | "{}"
// type astop = exop | "spread" | "arglist"

// type unary <op extends unaryop> = ast<op, 1>
// type literal = {type:literalop, children:[], arity:0, value: string}
// type identifier = {type:"identifier"} & literal
// type binary <op extends binaryop> = ast<op, 2> |lambda | application
// type tertiary <op extends tertiaryop> = ast<op, 3>

// type lambda = {
//   type:"=>",
//   arity:2,
//   children:[expression|arglist|spread, expression]
// } 

// type application = {
//   type:"app",
//   arity:2,
//   children:[expression, expression|arglist|spread]
// }

// type const_ = tertiary<"=;">
// type if_ = tertiary<"?:">
// type index = binary<"idx">

// type composite<op extends astop> =ast<astop, -1>
// type arr = composite<"[]">
// type obj = composite<"{}">
// type arglist = composite<"arglist">

// type spread = ast<"spread", 1>

// const parse_expressions = (exp:(expression|any)[]) => exp.map(e=>e.type?e:ex(e)) as expression[]
// const newast = (type:astop, arity:number, ...children:(expression|any)[]):astnode => 
//   ({type, arity, children: (parse_expressions(children) as astnode[])})


// const lit = (t:literalop, v:string):literal=> ({type:t, children:[], arity:0, value:v})
// const ex = (value:expression|string|number|boolean|null):expression =>
//   (typeof value === "string")?lit("string", value):
//   (typeof value === "number")?lit("number", value.toString()):
//   (typeof value === "boolean")?lit("boolean", value.toString()):
//   (value == null)?lit("null", "null"): value

// const idn = (value:string):identifier => lit("identifier", value) as identifier

// const comp = (type:astop, ...children:any[]): composite<exop> => newast(type, -1, ...children) as composite<exop>

// const newunary = <op extends unaryop>(type:op, child:expression):unary<op> => newast(type, 1, child) as unary<op>
// const newbinary = <op extends binaryop>(type:op, left:expression, right:expression):binary<op> => newast(type, 2, left, right) as binary<op>
// const newtertiary = <op extends tertiaryop>(type:op, ...children:expression[]):tertiary<op> => newast(type, 3, ...children) as tertiary<op>
// const lam = (x:identifier|spread|arglist, y:expression) => ({type:"=>", arity:2, children:[x, y]} as lambda)
// const app = (f:expression, x:expression|identifier|spread|arglist) => ({type:"app", arity:2, children:[f, x]} as application)
// const con = (x:identifier, y:expression, z:expression):const_ => newtertiary("=;", x, y, z)
// const iff = (x:expression, y:expression, z:expression):if_ => newtertiary("?:", x, y, z)
// const idx = (x:expression, y:expression):index => newbinary("idx", x, y)
// const arr = (...children:any[]):arr => comp("[]", ...children)
// const obj = (...children:any[]):obj => comp("{}", ...children)
// const arg = (...children:expression[]):arglist => comp("arglist", ...children)
// const spr = (value:expression):spread => newast("spread", 1, value) as spread
// const alu = (op:binaryop, ...children:any):binary<binaryop> => newbinary(op, ...parse_expressions(children) as [expression, expression])


// type parsenode = astnode & {type: astop | "braces", children: astnode[]}

// // plan: parse code into naive parsenode, then rotate trees for operator precedence

// const binary_symbols = ["+", "-", "*", "/", "%", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "=>"]
// const unary_symbols = ["-", "!", "..."]
// const tertiary_symbols = ["?", ":"]
// const group_symbols = ["(", "{", "["]
// const close_symbols = [")", "}", "]"]
// const symbols = [...binary_symbols, ...unary_symbols, ...tertiary_symbols, ...group_symbols, ...close_symbols]

// const symbolschars = "()+-*/%=!<>?:{}[].,"

// const naive_parse = (code:string)=>{

//   type test = (c:string)=>Boolean

//   const look = (test:(c:string)=>Boolean)=>(i:number):number => (code[i] && test(code[i]))?(look(test)(i+1)):i
//   const lookparse = (i:number, test:test, type:(literal|identifier)['type']):[literal|identifier, number]|undefined => {
//     const j = look(test)(i)
//     return i === j?undefined:[lit(type, code.slice(i,j)), j]
//   }

//   type parsed <T> = [T,number] | undefined | false
//   type tryparse <T> = (i:number)=>parsed<T>
  
//   const match = (s:string)=>(i:number):Boolean => code.slice(i, i+s.length) === s
//   const matchparse = (i:number, s:string, t:literalop):parsed<expression>=>(match(s)(i) && [lit(t, s), nextc(i+s.length)])

//   const operator_weight = (op:expression["type"]):number =>
//     (op === "<")||(op === ">")||(op === "<=")||(op === ">=")||(op === "==")||(op === "!=")?7:
//   (op === "&&")|| (op === "||")?9:
//   (op === "+")||(op === "-") ?10:
//   (op === "/")|| (op === "%")|| (op === "*")?11:
//   (op === "idx") || op==="!" ?12:
//   (op === "app")||(op === "=>")||(op =="?:") || (op=="=;") ||(op=="spread")?13 : -1

  
//   const parse_atom:tryparse<expression> = (i:number) => {
//     return lookparse(i, c=>c<='9' && c>='0', "number")
//     || matchparse(i, "true", "boolean")
//     || matchparse(i, "false", "boolean")
//     || matchparse(i, "null", "null")
//     || lookparse(i, c=>(c<='z' && c >='a') || (c<='Z' && c >='A'),"identifier")
//     || (code[i] === '"' && lookparse(i+1, c=>c!='"', "string"))
//     || (code[i] === "'" && lookparse(i+1, c=>c!="'", "string"))
//     || undefined
//   }


//   // const parse_group

//   // const parse_tertiary

//   const parse_continue = ([left, i]:[expression, number]):parsed<expression> => {
//     log("continue", left, code.slice(i))
//     const symend = look(c=>symbolschars.includes(c))(i)
//     const next_symbol = code.slice(i, symend)
//     if (!next_symbol.length) return [left, i]
//     log({next_symbol})
//     const ni = nextc(symend-1)
//     if (binary_symbols.includes(next_symbol)){
//       const exr = log(parse_expression(ni))
//       if (!exr) return undefined
//       const [right, j] = exr
//       return parse_continue([newbinary(next_symbol as binaryop, left, right), j])
//     }
//   }

//   const parse_expression = (i:number):parsed<expression> => {
//     log("parse", code.slice(i))

//     const start = log("atom:",parse_atom(i))
//     if (!start) return undefined
//     return parse_continue(start)
//     // return [start[0], nextc(start[1])]
//   }

//   const nextc = (i:number):number=>code[i+1] == undefined || code[i+1].trim().length?i+1:nextc(i+1)
//   const res = parse_expression(nextc(-1))
//   return res?res[0]:"cant parse "+ code

// }

// const testParse = (code:string, expected: any, msg:string)=>{
//   try{
//     assertEq(naive_parse(code), ex(expected), msg)
//   }catch(e){
//     console.error(e)
//   }
// }



// log(ex(22))
// testParse("14 ", 14, "parse 14")
// testParse("abc", idn("abc"), "parse abc")
// testParse('"hello"', "hello", "parse 'hello'")
// testParse("true", true, "parse true")


// "(a + b) * c"

// testParse("11+2", alu("+", 11,2), "parse 1+2")





// var  x = "hallo mara"

// var fn = (x:number) => x + 1;

// log(fn(22))

// fn (22)

// var combine = (a:string, b:string) => a + " und " + b

// log(combine("a", "b"))


// var gruss = (a:string) => "hallöchen " + a


// log(gruss("mara"))
// log(gruss("Dominik"))

// log(gruss(combine("Mara", "Schlaumann")))







// var familie1 = ["mama", "papa", "kind"]
// var familie2 = ["mama", "papa"]


// var anzahl = (fam:string[]) => fam.length

// log("anzahl:")
// log(anzahl(familie1))



// var x = "mara" 

// log(x == "mara")
// log(x == "dominik")
// log(x == "22");

// (x == "mara") ? log("mara!") : log("nicht mara");
// (x == "22") ? log("mara!") : log("nicht mara")

var istfamilie = (name:string) =>
  (name == "papa") ? "ja" : (name =="mama") ? "ja" : "nein" 


log(istfamilie("bernd"))
log(istfamilie("mama"))
log(istfamilie("papa"))