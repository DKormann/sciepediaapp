
// @ts-ignore
import {Root as Root, getData, setData, Child, Path, root, child} from './data'
import { htmlElement, htmlKey } from './_html'
import "./funscript"

import { assertEq, comp, log, last, LastT, stringify, setAttr, uuid} from './helpers'
import { Store , store, teststore} from './_store'
import { 
  getAst,
  execAst,
  tokenize,
  highlighted,
  } from './funscript'


type State = {
  r: Root,
  p: Rendered[],
  store: Store,
  // selection?: {start:number, end:number},
  hist: State [],
}

const setStateVar = <K extends keyof State>(key: K, value: State[K]): Update => s => {
  return {
  ...s,
  store: key=='r'?s.store.set('root', value):s.store,
  [key]: uuid(value),
}}

type Pelement = {
  content:string,
  indent:number,
  children:Pelement[],
  path:Path,
  is_title ?: true,
  el?:HTMLElement,
  // cursor: number,
  selection?: {start:number, end:number},
}

type Rendered = Pelement & {
  el:HTMLElement
}

const islink = (s:string) => s.startsWith('#') && s.length > 1

const buildPage = (r:Root, path:Path, indent:number):Pelement[] => {
  const node = getData(r, path)
  const tit = node.path.join('.')
  return [
    {content:tit,path,indent,is_title:true, children:[]},
    ...node.Content.split('\n').map(c=>({content:c, indent, path, children:[], cursor:-1})),
    ...(last(path) == 'fs' ? 
    buildPage(r, path.concat(">>>"), indent+1)
    :[]),
  ]
}

const render = (par: Pelement, color?:{cls:string}[]):Rendered=>(
  
  {...par,
    el: htmlElement('p', '', 'line', {children:[
        ...Array.from({length:par.indent}, _=>htmlElement('div', '', 'pad')),
        ...par.is_title? [htmlElement('span', par.content, 'title')]
        :insert(
          color != undefined
          ? par.content.split('').map((c,i)=>htmlElement('span', c, 'char'+color[i].cls,))
          : par.content.split(' ').map(w=>(' '+w).split('').map(c=>htmlElement('span', c, islink(w)?'link':'char'))).flat().slice(1),
          par.selection?.end, cursor()
        )
      ],
      ...color?{color}:{}
    }
  )
})

const insert = <T>(arr:T[], idx:number|undefined, ...elements:T[])=>{
  return idx!=undefined && idx>=0?[...arr.slice(0,idx), ...elements, ...arr.slice(idx)]:arr
} 

const toggleLink = (lnum:number, start:number, end:number):Update=>s0=>{
  const s = pushhist(resetSelection(s0))
  const target = s.p[lnum]
  const link = target.content.slice(start,end)
  assertEq(islink(link), true, 'open non link:'+link)
  const prev = s.p.slice(0,lnum)
  const rest = s.p.slice(lnum+1)
  const scope = rest.findIndex(p=>p.indent==target.indent)
  return log(setStateVar('p',[...prev,
    ... (scope <= 0)?[
      {...target, content:target.content.slice(0,end), el:undefined},
      ...buildPage(s.r, link.slice(1).split("."), target.indent+1).map(p=>render(p)),
      {...target, content:target.content.slice(end), el:undefined},
      ...rest
    ]:[
      render({...target, content: target.content+rest[scope].content, el:undefined}),
      ...rest.slice(scope+1),
    ]
  ].map(p=>render(p)))(s))
}

const cursor = ()=>htmlElement('div', '', 'cursor')

const getLines = (lnum:number|[number,number|undefined]) => (s:State) => 
  ((typeof lnum == 'number')?[s.p[lnum]]:s.p.slice(lnum[0],lnum[1]))

const updateLines = (lnum:number|[number,number], f:(p:Pelement[])=>Pelement[]):Update=>s=>
  setLine(lnum, ...f(getLines(lnum)(s)))(s)

const setLine = (line:number|[number, number], ...lines: Pelement[]):Update=>s=>{
  const [start,end] = (typeof line == 'number')?[line,line+1]:line
  assertEq(end>=start, true, `end>=start ${end}>=${start}`);
  const targetpath = (lines? lines[0] : s.p[start]).path
  const selected_lines = lines.filter(p=>p.selection)
  return cc(
    setStateVar('p',[
    ...s.p.slice(0,start),
    ...lines.map(p=>render(p)),
    ...s.p.slice(end)
    ]),

    s=>setStateVar("r", setData(s.r,
      child(targetpath.join("."),
      seekPage(start,s).slice(1).map(p=>p.content).join("\n"))))(s),
  )(s)
}


const runscript =(s:State, start:number)=> {

  const pg = seekPage(start, s)
  const code = getPageText(start, s)
  const codelines = code.split('\n')
  const toks = tokenize(code)
  try{
    const ast = getAst(toks) 
    const colormap = highlighted(toks, ast)
    
    const fcl = firstPageLine(start, s)
    const lol = lastPageLine(start, s)
    const lcl = firstPageLine(lol, s)
    
    const s1 = 
    setStateVar('p',[
      ...s.p.slice(0,fcl+1),
      ...colormap.map((l,i)=>render({...pg[i+1], content:codelines[i], is_title:undefined, }, l)),
      ...s.p.slice(lcl)
    ])(s);
    
    const displayres = (lns:string[])=>
      setLine([firstPageLine(lol, s1)+1,lol+1],
      ...lns.map(
        c=>render({
          ...s1.p[lol],
          content:c,
          // cursor:-1,
          is_title:undefined,
        })
      ))

      try{
        const res = stringify(execAst(ast)).split("\n")
        return displayres(res)(s1)  
      }catch(e){
        console.warn(e)
        return displayres((e as Error).message.split("\n"))(s1)
      }
    }catch(e){
      console.error(e)
      return
    }
}

const cc = <T> (...fs:((a:T)=>T|void)[]) => (a:T) => fs.reduce((r,f)=>f(r)??r,a)

const resetSelection:Update = s=> setStateVar('p', s.p.map(p=>(render({...p, selection:undefined, el:undefined}))))(s)

const clamp = (n:number, min:number, max:number) => Math.min(Math.max(n,min),max)

const setCursor = (lnum:number, cnum:number):Update=>cc(
  resetSelection,
  updateLines(lnum, ([p])=>(p==undefined?[]:[{...p, selection:{start:cnum, end:cnum}, el:undefined}])),
)

const getSelection = (s:State) =>{
  const start = s.p.findIndex(p=>p.selection)
  if (start == -1) return undefined
  return [start,s.p.slice(start).findIndex(p=>!p.selection) + start] as [number,number]
}

const findLine = (p:Rendered[],y:number):number=>p.findIndex(({el})=>el.clientHeight + el.offsetTop > y)

const letters = (p:Rendered) => (Array.from(p.el.children).filter(x=>x.nodeName=='SPAN') as HTMLElement[])

const findChar = (p:Rendered, x:number) =>{
  const ls = letters(p)
  const i = ls.findIndex(e=>(e.offsetLeft +e.offsetWidth/2) > x)
  return i == -1? ls.length:i
}

const lastPageLine = (pn:number, s:State) =>{
  const es = s.p.slice(pn).findIndex(p=>p.indent<s.p[pn].indent)
  return es>-1?es+pn-1:s.p.length-1
}

const firstPageLine = (pn:number, s:State) => pn - s.p.slice(0,pn).reverse().findIndex(p=>p.is_title && p.indent == s.p[pn].indent) - 1

const seekPage = (pn:number, s:State) => s.p.slice(firstPageLine(pn, s), lastPageLine(pn, s)+1).filter(p=>p.indent==s.p[pn].indent)

const getPageText = (pn:number, s:State) => seekPage(pn, s).slice(1).map(p=>p.content).join('\n')

const seekWord = (p:Pelement, c:number) => [c-last(p.content.slice(0,c).split(' ')).length , c+p.content.slice(c).split(' ')[0].length]

type Update = (s:State) => State

const cursorMove=(dl:number, dc:number):Update => s=>{
  const cl = (getSelection(s)??[0])[0]
  return setCursor(Math.min(s.p.length-1, Math.max(0,cl+dl)), getLines(cl)(s)[0].selection!.start+dc)(s)
}

const pushhist:Update = s=> (
  (last (s.hist) == undefined || uuid(s).id != 
uuid(last(s.hist)).id
) ?setStateVar('hist', [...s.hist.slice(-10), s])(s):(log('no change'), s))


{
  // unit tests
  const r = root(child('hello', 'hello #world #link'), child("link", "link content\nsecond line\n3rd line"))
  const p = buildPage(r, ['hello'], 1).map(p=>render(p))
  const s = {
    r,
    p,
    cursor: 0,
    store:teststore,
    hist: [],
  }

  const flatprint = (p:Rendered[])=> p.map((p,i)=>"->".repeat(p.indent)+p.content).join("\n")

  cc<State>(
    toggleLink(1,13,19),
    s=>assertEq(flatprint(s.p), `->hello
->hello #world #link
->->link
->->link content
->->second line
->->3rd line
->`, 'toggle link'),
    s=>assertEq(lastPageLine(0,s), 6, 'lastPageLine'),
    s=>assertEq(lastPageLine(2,s), 5, 'lastPageLine'),
    s=>assertEq(lastPageLine(5,s), 5, 'lastPageLine'),
    s=>assertEq(lastPageLine(6,s), 6, 'lastPageLine'),
    s=>assertEq(firstPageLine(0,s), 0, 'firstPageLine'),
    s=>assertEq(firstPageLine(6,s), 0, 'firstPageLine'),
    s=>assertEq(firstPageLine(5,s), 2, 'firstPageLine'),
    s=>assertEq(firstPageLine(1,s), 0, 'firstPageLine'),
    s=>setLine([4,5], {...s.p[4], content:"second #line"})(s),
    s=>assertEq(flatprint(seekPage(4,s)), `->->link
->->link content
->->second #line
->->3rd line`, 'seekPage'),
    s=>assertEq(getData(s.r, ["link"]).Content, "link content\nsecond #line\n3rd line", 'set link'),
  )(s)

}

export const createView = (putDisplay:(el:HTMLElement)=>void) => {

  const show = (s:State)=>cc<State>(

    s=>{
      // log(s.selection)
      // if (s.selection) {
      //   const l = getLines([sel[0], s.selection.end])(s)[0]
      //   if (last(l.path) == "fs"){
      //     return runscript(s, sel[0])
      //   }
      // }
    },
    s=>{
      const onclick = (e:MouseEvent)=>{
        const p = findLine(s.p, e.y+window.scrollY)
        if (p === -1) return
        const c = findChar(s.p[p], e.x+window.scrollX)
        const [a,b] = seekWord(s.p[p],c)
        if (islink(s.p[p].content.slice(a,b))){
          show(toggleLink(p,a,b)(s))
        }else{
          show(setCursor(p,c)(s))
        }
      }

      putDisplay(htmlElement('div', '', 'root',{
        children: s.p.map(p=>p.el),
        eventListeners:{
          click: onclick,
          keydown: (e:KeyboardEvent)=>{
            
            if (['Meta','Control', 'Alt', 'Shift'].includes(e.key)) return

            if (e.key.startsWith("Arrow")){
              e.preventDefault()
              const sel = getSelection(s)
              if (sel == undefined) return

              const y = sel[0]
              const l = s.p[y]
              const x = l.selection!.start

              const [ny,nx]:[number,number] = e.key == 'ArrowUp' ?
                [e.altKey ? y-5 : e.metaKey ? firstPageLine(y, s)+1 : y-1, x]
                : e.key == 'ArrowDown' ?
                [e.altKey ? y+5 : e.metaKey ? lastPageLine(y, s) : y+1, x]
                : e.key == 'ArrowLeft' ?
                [y, Math.max(0,e.altKey ? x-5 : e.metaKey ? 0 : x-1)]
                : e.key == 'ArrowRight' ?
                [y, e.altKey ? x+5 : e.metaKey ? l.content.length : x+1]
                : [y,x]
              const [nny, nnx]= [clamp(ny,0,s.p.length-1), clamp(nx,0,l.content.length)]
              if (s.p[nny].is_title) return
              return show(setCursor(nny,Math.min(nx, l.content.length))(s))
            }

            if (e.key == 'Backspace'){
              const sel = getSelection(s)
              if (sel == undefined) return
              const x = s.p[sel[0]].selection!.start
              const newx = Math.max(0, x- (e.altKey ? 5 : e.metaKey ? 100 : 1))
              return cc<State>(
                s=>{
                  if (x == 0){
                    const prev = s.p[sel[0]-1]
                    if (prev == undefined || prev.is_title) return
                    return updateLines([sel[0]-1,sel[0]+1], ([p1,p2])=>[{...p1, content:p1.content+p2.content, selection:{start:p1.content.length, end:p1.content.length}}])(s)
                  }
                  return updateLines(sel[0], ([p])=>[{...p, content:p.content.slice(0,newx)+p.content.slice(x), selection:{start:newx, end:newx}}])(s)
                },
                pushhist,
                show,
              )(s)

            }
            if (e.key == 'Tab') {
              if (e.metaKey || e.shiftKey) return
              e.preventDefault()
              const sel = getSelection(s)
              if (sel == undefined) return
              return show(updateLines(sel[0] ?? 0, ([p])=>([{...p, content:p.content.slice(0,p.selection?.start ?? 0)+'  '+p.content.slice(p.selection?.start ?? 0) , selection:{start:(p.selection?.start ?? 0) + 2, end:(p.selection?.start ?? 0) + 2}}]))(s))
            }

            if (e.key == 'Enter'){
              const sel = getSelection(s)
              if (sel == undefined) return
              const x = s.p[sel[0]].selection!.start
              // const x = 
              return cc<State>(
                updateLines(sel[0], ([p])=>[{...p, content:p.content.slice(0,x), selection:undefined}, {...p, content:p.content.slice(x), selection:{start:0, end:0}}]),
                pushhist,
                show,
              )(s)
            }

            if (e.key == 'Escape') return
            if (e.key.length==1){ // letter
            
              // if (e.metaKey) {
              //   if (e.key == 'z'){
              //     log('undo')
              //     if (s.hist.length) show({
              //       ...last(s.hist),
              //       hist: s.hist.slice(0,-1)
              //     })
              //   }
              //   return
              // }
              const sel = getSelection(s)
              if (sel == undefined) return
              cc<State>(
                pushhist,
                updateLines(log("sel:",sel[0]), 
                  ([p])=>([{...log(p), content:p.content.slice(0,p.selection?.start ?? 0)+e.key+p.content.slice(p.selection?.start ?? 0), selection:log('newp s',{start:(p.selection?.start ?? 0) + 1, end:(p.selection?.start ?? 0) + 1})}])),
                show,
              )(s)
              return
            }
          },
        },
      }));
    }
  )(s)

  const r = 
  store.get('root') ??
  root(
    child('hello', 'hello world'),
    child('script.fs', "\nfib = (n) =>\n  n<2 ? n :\n  fib(n-1) + fib(n-2);\n\nfastfib = (n) =>\n  _fib = n =>\n    n == 0 ? [1,0]:\n    [a,b] = _fib(n-1);\n    [b,a+b];\n  _fib(n)[0];\n\n\n[fib(7), fastfib(70)]\n"),
    child('script.fs.>>>',"RESULT")
)

  cc(
    show
  )({
      r,
      p: buildPage(r, ['hello'], 1).map(p=>render(p)),
      store:store,
      hist: [],
  })
}
