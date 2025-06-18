// refactoring this funscript copy to actually be a music generator

import { htmlElement } from "./_html"
import { assertEq, assertErr, last, log, stringify, Res, Ok, Err, ok, err, assert } from "./helpers"

import { Sampler } from "tone"

import { code, token, ast, tokenize , parse, getAst } from "./funscript"


export {type code, tokenize, parse, getAst}

// const ternaryops = ["?:", "=;"]
// const symbolpairs = [["(", ")"], ["{", "}"], ["[", "]"], ["?", ":"], ["=", ";"]]
const binaryops = ["+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "&&", "||", "app", "=>", "index",]
const unaryops = ["!", "neg", "..."]


export const build = (ast:ast):string =>{

  const errs = flat_errors(ast)
  if (errs.length > 0) throw new Error(errs.map(e=>e.value).join('\n'))

  const sfill = (template:string):string => template.replace(/{}/g, ()=>build(ast.children.shift() as ast))
  return ast.type == "number" || ast.type == "boolean" || ast.type == "null" || ast.type == "identifier" || ast.type == "string" ? ast.value:
  "({[".includes(ast.type[0]) ? `${ast.type[0]}${ast.children.map(
    ast.type == "{}" ? (e)=>
      e.type == "identifier" ? `"${e.value}":${e.value}`:
      e.type == ":" ? e.children.map(build).join(":") :
      (e.type != "..." ? "..." : "" )+ build(e)
    : build
  
  ).join(",")}${ast.type[1]}`:


  (ast.type == "app")? sfill("({}{})"):
  (ast.type == "index")? sfill("({}[{}])"):
  (ast.type == 'neg')? `-${build(ast.children[0])}`:
  (ast.type == '=>')? sfill("({}=>({}))"):
  ast.type == ":" ? sfill("{{}:{}}"):
  ast.children.length == 2 ? sfill(`({}${ast.type}{})`):
  ast.children.length == 1 ? `${ast.type}${build(ast.children[0])}`:
  ast.type == "=;" ? sfill("(()=>{{} = {};\nreturn {}})()"):
  ast.type == "?:" ? sfill(`({}?{}:\n{})`):
  ast.type == "typo" ? (()=>{throw new Error(`${ast.value}`)})():
  (()=>{throw new Error("not implemented: "+ast.type)})()
}



export const execAst = (parsed:ast):any => {

  const compt = build(parsed)
  try{

    const args = {htmlElement, stringify, log, assert, assertEq, print:console.log}

    const FN = Function(...Object.keys(args), "return "+compt)
    return FN(...Object.values(args))
  }catch(e){
    throw new Error("runtime error in:" + compt + "\n" + (e as Error).message)
  }
}


type colored_line = {code:string, cls:string}[] 

const range = (start:number, end:number):number[] => Array.from({length:end-start}, (_,i)=>i+start)

export const flat_errors = (ast:ast):token[] =>
  ast.type == "typo" ? [ast]:
  ast.children.map(flat_errors).flat()

export const highlighted = (toks: token[], ast:ast):{cls:string}[][] =>{

  const errors = new Set<number>(flat_errors(ast).map(e=>range(e.start, e.end)).flat())

  const chs:colored_line[][] = toks.map(tok=> tok.value.split("\n").map(s=>[{code:s, cls:
    (errors.has(tok.start) || errors.has(tok.end) ? '.err.' : '.')+
    (tok.type == "typo" ? 'red' :
    tok.type == "identifier" || tok.type == "number" || tok.value=='.' ? "code1" :
    tok.type=="string" || tok.type == "boolean" || tok.type== "comment" ? "code2" :
    "?:=;".includes(tok.value) ? "code3" :
    tok.type == "symbol" ? "code4" :
    "")}]))
  const lines =  chs.slice(1).reduce((p, c)=>[...p.slice(0,-1), [...last(p), ...c[0]], ...c.slice(1)], chs[0]??[[]])
  
  return lines.map(l=>l.map(c=>c.code.split('').map(ch=>({cls:c.cls}))).flat())
}

