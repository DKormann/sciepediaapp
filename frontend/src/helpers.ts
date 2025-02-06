import { htmlElement } from "./_html"

export const comp = (a:any, p:any) => JSON.stringify(a) === JSON.stringify(p)

export const assertEq = (a:any, b:any,msg:string) => {comp(a,b) || console.error([a,b], msg)}

export const log=<T>(...x:LastT<any,T>)=>(
  console.log(...x.map(x=>(x instanceof HTMLElement|| x instanceof Event || x instanceof Node || typeof x == 'string') ? x :stringify(x))),
  last(x)
)

export const stringify = (x:any):string =>
  x == undefined? 'undefined':
  typeof x  == 'bigint'? x.toString()+'n':
  x instanceof Array?
  `[${
    x.length==0?'':
    x.map(x=>stringify(x)).join(', ').replaceAll('\n','\n  ')
  }]`:
  x instanceof HTMLElement || x instanceof Node?
  `<${x.nodeName} : "${x.textContent}">`:
  typeof x === 'object'?
  `{\n  ${Object.entries(x).map(([k,v])=>`${k}:${stringify(v)}`).join(',\n').replaceAll('\n','\n  ')}\n}`
  :JSON.stringify(x)

export type LastT <S,T> = [...S[], T]
export const setAttr=<T>(key:string, value:any)=>(item:T):T=>({...item, [key]:value})
export const last = <T>(arr:LastT<any,T> | T[]):T => arr[arr.length-1]


function hash(input: string, seed: bigint = 0xcbf29ce484222325n): bigint {
  let hash = seed;
  const prime = 0x100000001b3n; // FNV prime
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i))
    hash *= prime
  }
  return hash & ((1n << 64n) - 1n)
}


export const uuid=<T >(x:T):T & {id:bigint}=>{

  const _id =(x:any):[any, bigint]=>{
    if (x == undefined) return [x, hash('undefined')]
    if (x.id != undefined) return [x, x.id]
    if (x instanceof Array){
      const dat = x.map(v=>_id(v))
      const id = hash(dat.map(([v,id])=>id).join(','))
      return [dat.map(([v,id])=>v), id]
    }
    if (x instanceof Object){
      const dat = Object.entries(x).map(([k,v])=>[k, _id(v)])
      const id = hash(dat.map(([k,[v,id]])=>`${k}:${id}`).join(','))
      const newob = Object.fromEntries(dat.map(([k,[v,id]])=>[k,v]).concat([['id', id]]))
      return [newob, id]
    }
    return [x, hash(stringify(x))]
  }
  return _id(x)[0]
}


export const range = (n:number):number[] => Array.from({length:n}, (_,i)=>i)
export const fori = (n:number, fn:()=>void) => Array.from({length:n}).forEach(fn)
export const mapi = (n:number, fn:(i:number)=>void) => Array.from({length:n}).map((_,i)=>fn(i))
export const redi = <T>(n:number, fn:(acc:T, i:number)=>T, acc:T=0 as T):T => Array.from({length:n}).reduce<T>((acc, _,i)=>fn(acc,i), acc)


type BTree = {
  key: number,
  left: BTree | null,
  right: BTree | null
}


export const btree = (key:number, left:BTree|null, right:BTree|null):BTree => ({key, left, right})
// export const 
