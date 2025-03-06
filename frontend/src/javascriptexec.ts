import { token, tokenize } from "./funscript";
import { last, stringify } from "./helpers";


type colored_line = {code:string, cls:string}[]

export const highlighted_js = (code: string):{cls:string}[][] =>{
  if (!code || code.trim() === '') {
    return [];
  }

  const toks = tokenize(code)
  if (toks.length === 0) {
    return [];
  }

  const chs:colored_line[][] = toks.map(tok=> tok.value.split("\n").map(s=>[{code:s, cls:
    (tok.type == "typo" ? 'red' :
    tok.type == "identifier" || tok.type == "number" || tok.value=='.' ? "code1" :
    tok.type=="string" || tok.type == "boolean" || tok.type== "comment" ? "code2" :
    "?:=;".includes(tok.value) ? "code3" :
    tok.type == "symbol" ? "code4" :
    "")}]))
  
  // Handle empty array case
  if (chs.length === 0 || !chs[0]) {
    return [];
  }
  
  const lines = chs.slice(1).reduce((p, c)=>[...p.slice(0,-1), [...last(p), ...c[0]], ...c.slice(1)], chs[0])
  
  return lines.map(l=>l.map(c=>c.code.split('').map(ch=>({cls:c.cls}))).flat())
}


export const run_js = (code: string):string => {
  try {
    const res = new Function('return '+code)()
    return stringify(res)
  }catch(e){
    return (e as Error).message
  }
}
