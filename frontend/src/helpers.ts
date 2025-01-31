
export const comp = (a:any, p:any) => JSON.stringify(a) === JSON.stringify(p)

export const assertEq = (a:any, b:any,msg:string) => {comp(a,b) || console.error([a,b], msg)}

export const log=<T>(...x:LastT<any,T>)=>(
  console.log(...x.map(x=>(x instanceof HTMLElement|| x instanceof Event || x instanceof Node || typeof x == 'string') ? x :stringify(x))),
  last(x)
)

export const stringify = (x:any):string =>
  x == undefined? 'undefined':
  x instanceof Array?
  `[${
    x.length==0?'':
    x.map(x=>stringify(x)).join(', ').replaceAll('\n','\n  ')
  }]`:
  x instanceof HTMLElement || x instanceof Node?
  `<${x.nodeName} : "${x.textContent}">`:
  typeof x === 'object'?
  `{\n  ${Object.entries(x).filter(([k,_])=>k!='element' || (x.type!='page'&&x.type!='line')).map(([k,v])=>`${k}:${stringify(v)}`).join(',\n').replaceAll('\n','\n  ')}\n}`
  :JSON.stringify(x)

export type LastT <S,T> = [...S[], T]
export const setAttr=<T>(key:string, value:any)=>(item:T):T=>({...item, [key]:value})
export const last = <T>(arr:LastT<any,T>):T => arr[arr.length-1]
