
// @ts-ignore
import {Root as Root, getData, setData, Child, Path, root, child} from './data'
import { htmlElement, htmlKey } from './_html'
import "./funscript"

import { assertEq, comp, log, last, LastT, stringify, setAttr, uuid, assert} from './helpers'
import { Store , store, teststore} from './_store'
import { 
  getAst,
  execAst,
  tokenize,
  highlighted,
  ast,
  } from './funscript'
import { highlighted_js, run_js } from './javascriptexec'
import { Greet, GetFile, OpenFileDialog } from './wailsjs/go/main/App'


type State = {
  r: Root,
  p: Rendered[],
  store: Store,
  mousestart?:{p: number, c: number},
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
  selection?: {start:number, end:number},
  colormap?:{cls:string}[],
}

type Rendered = Pelement & {
  el:HTMLElement
}

const islink = (s:string) => s.startsWith('#') && s.length > 1

function codelint(code:string){
  const toks = tokenize(code)
  const ast = getAst(toks)
  return [highlighted(toks, ast), ast] as [{cls:string}[][], ast]
}


const buildPage = (r:Root, path:Path, indent:number):Pelement[] => {
  const node = getData(r, path)
  const tit = node.path.join('.')

  const colormap = (last(path) == 'fs') ? codelint(node.Content)[0] as {cls:string}[][] : undefined

  return[
    {content:tit,path,indent,is_title:true, children:[]},
    ...node.Content.split('\n').map((c,i)=>({content:c, indent, path, children:[], cursor:-1, colormap:colormap?colormap[i]:undefined})),
    ...(last(path) == 'fs' ? 
      buildPage(r, path.concat(">>>"), indent+1)
      :[]),
  ]

}

const render = (par: Pelement, color?:{cls:string}[]):Rendered=>{

  const sel = par.selection? [par.selection.start, par.selection.end].sort((a,b)=>a-b) as [number, number]:undefined
  return {...par,
    el: htmlElement('p', '', 'line', {children:[
        ...Array.from({length:par.indent}, _=>htmlElement('div', '', 'pad')),
        ...par.is_title? [htmlElement('span', par.content, 'title')]
        :insert(
          color != undefined
          ? par.content.split('').map((c,i)=>htmlElement('span', c, 'char'+color[i].cls+ (
            sel && i >= sel[0] && i <sel[1] ? ".selected" : ""
          ),))
          : par.content.split(' ').map(w=>(' '+w).split('').map(c=>({c,w}))).flat().slice(1)
            .map(({c,w},i)=>htmlElement('span', c, (par.colormap? (par.colormap[i]?.cls ?? '') :islink(w)?'link':'char')  +
              (sel && i>=sel[0] && i<sel[1] ? ".selected" : "")
          )),
          par.selection?.end, cursor()
        )
      ],
      ...color?{color}:{}
    })
  }
}

const insert = <T>(arr:T[], idx:number|undefined, ...elements:T[])=>{
  return idx!=undefined && idx>=0?[...arr.slice(0,idx), ...elements, ...arr.slice(idx)]:arr
} 

const toggleLink = (lnum:number, start:number, end:number):Update=>s0=>{
  const s = pushhist(s0)
  const target = s.p[lnum]
  const link = target.content.slice(start,end)
  assertEq(islink(link), true, 'open non link:'+link)
  const rest = s.p.slice(lnum+1)
  const scope = rest.findIndex(p=>p.indent==target.indent)

  return (scope <= 0)
  ? setLine([lnum,lnum+1], {...target, content:target.content.slice(0,end), el:undefined},
    ...buildPage(s.r, link.slice(1).split("."), target.indent+1).map(p=>render(p)),
    {...target, content:target.content.slice(end), el:undefined})(s)
  : setLine([lnum,lnum+scope+2], render({...target, content: target.content+rest[scope].content, el:undefined}),)(s)

}

const cursor = ()=>htmlElement('div', '', 'cursor')

const getLines = (lnum:number|[number,number|undefined]) => (s:State) => 
  ((typeof lnum == 'number')?[s.p[lnum]]:s.p.slice(...lnum[0]> lnum[1]!? [lnum[1],lnum[0]]:lnum)).map(p=>p)

const updateLines = (lnum:number|[number,number], f:(p:Pelement[])=>Pelement[]):Update => s=>
  setLine(lnum, ...f(getLines(lnum)(s)))(s)

const setLine = (line:number|[number, number], ...lines: Pelement[]):Update=>s=>{
  
  const [start,end] = ((typeof line == 'number')?[line,line+1]:line).sort((a,b)=>a-b)

  assert(end>=start, `end>=start ${end}>=${start}`);
  const targetpath = (lines.length? lines[0] : s.p[start]).path
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
  const code = pg.slice(1).map(p=>p.content).join('\n')

  const codelines = code.split('\n')
  const [colormap, ast] = codelint(code)

  try{
    
    const fcl = firstPageLine(start, s)
    const lol = lastPageLine(start, s)
    const lcl = firstPageLine(lol, s)
    
    const s1 = 
    setStateVar('p',[
      ...s.p.slice(0,fcl+1),
      ...colormap.map((l,i)=>render({...pg[i+1], selection: pg[i+1].selection, content:codelines[i], is_title:undefined, }, 
      l
    )),
      ...s.p.slice(lcl)
    ])(s);

    const displayres = (lns:string[])=>
      setLine([firstPageLine(lol, s1)+1,lol+1],
      ...lns.map(
        c=>render({
          ...s1.p[lol],
          content:c,
          is_title:undefined,
        })
    ))

    try{
      const ret = execAst(ast)
      
      if (ret != undefined && ret.__repr__ != undefined) return displayres([ret.__repr__()]) (s1)
      const res = stringify(ret).split("\n")
      return displayres(res)(s1)
    }catch(e){
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

const setSelection = ([[sl, sc], [el, ec]]:[[number,number],[number,number]]):Update=>{
  const rev = sl>el || (sl==el && sc>ec)
  return cc(
  resetSelection,
  rev? updateLines([el,sl+1], (ps)=>ps.map((p,i)=>({...p, selection:{start: i==ps.length-1?sc:p.content.length, end: i==0?ec:0}})))
  : updateLines([sl,el+1], (ps)=>ps.map((p,i)=>({...p, selection:{start: i==0?sc:0, end: i==ps.length-1?ec:p.content.length}}))),
  )
}

const getSelection = (s:State):[number,number]|[undefined,undefined] =>{
  const start = s.p.findIndex(p=>p.selection)
  if (start == -1) return [undefined, undefined]
  const rng = s.p.slice(start).findIndex(p=>!p.selection)
  return [start, rng==-1?s.p.length: rng+start]
}

const getSelectionText = (s:State):string => {
  const [st,en] = log("METAC",getSelection(s))
  if (st == undefined) ""
  return s.p.slice(st,en).map(p=> p.selection?p.content.slice(...[p.selection.start, p.selection.end].sort((a,b)=>a-b)):'').join('\n')
}

function findLine (p:Rendered[],y:number):number 
{return p.findIndex(({el})=>el.clientHeight + el.offsetTop > y)}

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



try{
  Greet("alice").then(console.log)
  GetFile("script.fs").then(console.log)

}catch{}

export const createView = (putDisplay:(el:HTMLElement)=>void) => {

  const getPos = (e:MouseEvent, s:State)=>{
    const p = findLine(s.p, e.y+window.scrollY)
    if (p === -1) return [undefined,undefined] as [undefined, undefined]
    const c = findChar(s.p[p], e.x+window.scrollX)
    return [p,c] as [number, number]
  }

  const show = (s:State)=>cc<State>(

    s=>{
      const [sel,_] = getSelection(s)
      if (sel == undefined || last(s.p[sel].path)!='fs') return
      return runscript(s, sel)
    },

    s=>{
      putDisplay(htmlElement('div', '', 'root',{
        children: s.p.map(p=>p.el),
        eventListeners:{

          mousedown: (e:MouseEvent)=>{
            const [p,c] = getPos(e, s)
            if (e.shiftKey) return
            cc<State>(
              setStateVar('mousestart', p?{p,c}:undefined),
              s=>p?setSelection([[p,c],[p,c]])(s):s,
              show,
            )(s)
              
          },
          mouseup: (e:MouseEvent)=>{
            return cc<State>(
              s=>{
                const [p,c] = getPos(e, s)
                if (p == undefined) return
                if (e.shiftKey){
                  const [st,en] = getSelection(s)
                  if (st == undefined) return
                  return setSelection([[st, s.p[st].selection!.start],[p,c]])(s)
                }
                if (!s.mousestart) return
                if (comp(s.mousestart, {p,c})){
                  const [a,b] = seekWord(s.p[p],c)
                  if (islink(s.p[p].content.slice(a,b))){
                    return toggleLink(p,a,b)(s)
                  }
                }
              },
              setStateVar('mousestart', undefined),
              show,
            )(s)
            


          },
          mousemove: (e:MouseEvent)=>{
            if (!s.mousestart) return
            const [p,c] = getPos(e, s)
            if (p == undefined) return
            show(setSelection([[s.mousestart!.p, s.mousestart!.c],[p,c]])(s))
          },
          keydown: async (e:KeyboardEvent)=>{

            if (['Meta', 'Alt', 'Control', 'Shift'].includes(e.key)) return

            if (e.key.startsWith('Arrow')||!e.metaKey) e.preventDefault()
            if (e.key == 'Escape') return

            const sel = getSelection(s)
            if (sel[0] == undefined) return

            const insertText = (text:string):Update=>cc(
              updateLines(sel, (ps=>{
                const b1 = ps[0]
                const b2 = last(ps)
                const end = b2.content.slice(Math.max(b2.selection!.start, b2.selection!.end))
                const newlines = (b1.content.slice(0,Math.min(b1.selection!.start, b1.selection!.end)) + text).split('\n')
                return newlines.map((content,i)=>(i==newlines.length-1?{...b1, content:content+end, selection:{start:content.length, end:content.length}}:{...b1, content:content, selection:undefined}))
              })),
              pushhist,
            )

            if (e.key.length==1 && (e.metaKey || e.ctrlKey)){
              const actioncode = (e.metaKey ? 'Meta' : '') + (e.ctrlKey ? 'Ctrl' : '') + e.key

              if (actioncode == 'Metao')
                OpenFileDialog().then(console.log)

              if (actioncode == 'Metac') navigator.clipboard.writeText(getSelectionText(s))
              if (actioncode == 'Metav') return show(insertText(await navigator.clipboard.readText())(s))
              if (actioncode == 'Metax'){
                navigator.clipboard.writeText(getSelectionText(s))
                return show(insertText('')(s))
              }
              if (actioncode == "Meta/"){
                return show(updateLines(sel, (ps)=>
                  ps.filter(p=>p.content.startsWith('//')).length > 0
                  ? ps.map(p=>(p.content.startsWith('//')?{...p, content: p.content.slice(2)}:p))
                  : ps.map(p=>({...p, content: p.content.startsWith('//')?p.content.slice(2):'//'+p.content, selection:p.selection?{start:2+p.selection.start, end:2+p.selection.end}:undefined}))
                )(s))
              }
            }
            
            return cc<State>(
              s=>{
                if (["Tab", "Enter", "Backspace"].includes(e.key) || e.key.length == 1){
                  if (e.metaKey) return 

                  return insertText(e.key.length == 1? e.key: e.key == 'Tab'? '  ' : e.key == 'Enter'? 
                    '\n'+ s.p[sel[1]-1].content.match(/^\s*/)?.[0] ?? '' : '')(s)
                }
              },
              s=>{

                const sel = getSelection(s)
                if (sel[0] == undefined) return
    
                const y = sel[0]
                const l = s.p[y]
                const x = l.selection!.start
    
                if (e.key.startsWith('Arrow')){
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
                  return setCursor(nny,nnx)(s)
                }


                if (e.key == 'Backspace'){
                  const newx = Math.max(0, x- (e.altKey ? 5 : e.metaKey ? 100 : 1))
                  if (x == 0){
                    const prev = s.p[sel[0]-1]
                    if (prev == undefined || prev.is_title) return
                    return updateLines([sel[0]-1,sel[0]+1], ([p1,p2])=>[{...p1, content:p1.content+p2.content, selection:{start:p1.content.length, end:p1.content.length}}])(s)
                  }
                  return updateLines(sel, ([p])=>[{...p, content:p.content.slice(0,newx)+p.content.slice(x), selection:{start:newx, end:newx}}])(s)
                }
              },
              show,
            )(s)
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



