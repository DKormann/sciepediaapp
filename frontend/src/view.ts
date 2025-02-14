
// @ts-ignore
import {Root as Root, getData, setData, Child, Path, root, child} from './data'
import { htmlElement, htmlKey } from './_html'
import "./funscript"

import { assertEq, comp, log, last, LastT, stringify, setAttr, uuid} from './helpers'
import { Store , store, teststore} from './_store'
import { nice_error, runfun } from './funscript'



const max = Math.max
const abs = Math.abs

type State = {
  r: Root,
  p: Rendered[],
  store: Store,
  cursor: number,
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
  cursor:number ,
}


type Rendered = Pelement & {
  el:HTMLElement
}

const islink = (s:string) => s.startsWith('#') && s.length > 1

const buildPage = (r:Root, path:Path, indent:number):Pelement[] => {
  const node = getData(r, path)
  const tit = node.path.join('.')
  return [
    {content:tit,path,indent,is_title:true, children:[], cursor:-1},
    ...node.Content.split('\n').map(c=>({content:c, indent, path, children:[], cursor:-1})),
    ...(last(path) == 'fs' ? 
    buildPage(r, path.concat(">>>"), indent+1)
    :[]),
  ]
}

const render = (par: Pelement, style?:string):Rendered=>(
  {...par,
    el: htmlElement('p', '', 'line', {children:[
        ...Array.from({length:par.indent}, _=>htmlElement('div', '', 'pad')),
        ...par.is_title? [htmlElement('span', par.content, 'title')]
        :insert(
          par.content.split(' ').map(w=>(' '+w).split('').map(c=>htmlElement('span', c, islink(w)?'link':'char'))).flat().slice(1),
          par.cursor, cursor()
        )
      ],
      ...style?{style}:{}
    }
  )
})

const insert = <T>(arr:T[], idx:number|undefined, ...elements:T[])=>{
  return idx!=undefined && idx>=0?[...arr.slice(0,idx), ...elements, ...arr.slice(idx)]:arr
} 

const toggleLink = (lnum:number, start:number, end:number):Update=>s0=>{
  const s = pushhist(clearCursor(s0))
  const target = s.p[lnum]
  const link = target.content.slice(start,end)
  assertEq(islink(link), true, 'open non link:'+link)
  const prev = s.p.slice(0,lnum)
  const rest = s.p.slice(lnum+1)
  const scope = rest.findIndex(p=>p.indent==target.indent)
  return setStateVar('p',[...prev,
    ... (scope <= 0)?[
      {...target, content:target.content.slice(0,end), el:undefined},
      ...buildPage(s.r, link.slice(1).split("."), target.indent+1).map(p=>render(p)),
      {...target, content:target.content.slice(end), el:undefined},
      ...rest
    ]:[
      render({...target, content: target.content+rest[scope].content, el:undefined}),
      ...rest.slice(scope+1),
    ]
  ].map(p=>render(p)))(s)
}

const cursor = ()=>htmlElement('div', '', 'cursor')

const getLines = (lnum:number|[number,number|undefined]) => (s:State) => 
  ((typeof lnum == 'number')?[s.p[lnum]]:s.p.slice(lnum[0],lnum[1]))

const updateLines = (lnum:number|[number,number], f:(p:Pelement[])=>Pelement[]):Update=>s=>
  setLine(lnum, ...f(getLines(lnum)(s)))(s)



const setLine = (line:number|[number, number], ...lines: Pelement[]):Update=>s=>{
  const [start,end] = (typeof line == 'number')?[line,line+1]:line
  assertEq(end>=start, true, `end>=start ${end}>=${start}`);
  const focusline = lines.findIndex(p=>p.cursor>-1)
  return cc(
    setStateVar('p',[
    ...s.p.slice(0,start),
    ...lines.map(p=>render(p)),
    ...s.p.slice(end)
    ]),

    s=>setStateVar("r", setData(s.r,
      child(lines[0].path.join("."),
      seekPage(start,s).slice(1).map(p=>p.content).join("\n"))))(s),
    s=>{
      if (last(lines[0].path) == 'fs'){
        log("running fs")
        try{
          const code = getPageText(start, s)

          const ret = runfun(code)
          // const ret = {"status":"err","val":"not implemented"}
          const res = (ret.status == "err" ? nice_error(code, ret) : stringify(ret.val)).split("\n")
          const lpl = lastPageLine(start, s)
          return setLine([firstPageLine(lpl, s)+1,lpl+1],
          ...res.map(
            c=>render({
              ...s.p[lpl],
              content:c,
              cursor:-1,
              is_title:undefined,
            })
          ))(s)
        }catch(e){
          console.error(e)
        }
      }
      return s
    },

    setStateVar('cursor', focusline == -1? s.cursor: start+focusline)
  )(s)
}

const cc = <T> (...fs:((a:T)=>T|void)[]) => (a:T) => fs.reduce((r,f)=>f(r)??r,a)

const clearCursor:Update = cc(
  s=>s.cursor>-1?updateLines(s.cursor,([p])=>([{...p, cursor:-1, el:undefined}]))(s):s,
  setAttr('cursor', [-1,-1])
)

const setCursor = (lnum:number, cnum:number):Update=>cc(
  clearCursor,
  updateLines(lnum, ([p])=>([{...p, cursor:cnum, el:undefined}])),
  setAttr('cursor', lnum),
)

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
  const old = getLines(s.cursor)(s)[0]
  const [ln, cn] = [s.cursor+dl, old.cursor+dc]
  const newp = getLines(ln)(s)[0]
  if (newp == undefined || newp.is_title) return s
  if (cn<0) {
    const ln = s.cursor-1
    const newp = getLines(ln)(s)[0]
    if (newp == undefined || newp.is_title) return s
    return setCursor(ln, newp.content.length)(s)
  }
  if (cn>newp.content.length && dc){
      const newp = getLines(ln+1)(s)[0]
      if (newp == undefined || newp.is_title) return s
      return setCursor(ln+1, 0)(s)
  }
  return setCursor(ln,cn)(s)
}

const pushhist:Update = s=> (
  log('push'),(last (s.hist) == undefined || uuid(s).id != 
uuid(last(s.hist)).id
) ?setStateVar('hist', [...s.hist.slice(-10), s])(s):(log('no change'), s))

const flatprint = (p:Rendered[])=> p.map((p,i)=>`${i}:`+"->".repeat(p.indent)+p.content).join("\n")

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

export const view = (putHTML:(el:HTMLElement)=>void) => {

  const show = (s:State)=>{
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

    putHTML(htmlElement('div', '', 'root',{
      children: s.p.map(p=>p.el),
      eventListeners:{
        click: onclick,
        keydown: (e:KeyboardEvent)=>{
          
          if (['Meta','Control', 'Alt', 'Shift'].includes(e.key)) return

          if (e.key.startsWith("Arrow")){
            e.preventDefault()

            const par = getLines(s.cursor)(s)[0];
            const st = e.altKey?5
            :e.metaKey?(
              e.key == 'ArrowUp'?s.p.slice(0,s.cursor).reverse().findIndex(p=>p.is_title)
              :e.key == 'ArrowDown'?(s.p.slice(s.cursor).concat({...par,indent:par.indent-1})).findIndex(p=>p.indent<par.indent)-1
              :e.key == 'ArrowLeft'?par.cursor
              :par.content.length-par.cursor
            )
            :1

            return show(cursorMove(
              e.key == 'ArrowUp'?-st:e.key == 'ArrowDown'?st:0,
              e.key == 'ArrowLeft'?-st:e.key == 'ArrowRight'?st:0)(s))
          }
          if (e.key == 'Enter') {
            cc(
              pushhist,
              updateLines(s.cursor, ([p])=>([
                {...p, content:p.content.slice(0,p.cursor), cursor:-1},
                {...p, content:p.content.slice(p.cursor), cursor:0},
              ])),
              show
            )(s)
            return
          }
          if (e.key == 'Backspace') {
            const speed = e.altKey?5:e.metaKey?getLines(s.cursor)(s)[0].cursor:1
            return show(updateLines([s.cursor-1, s.cursor+1], ps=>{
              if (ps.length==0) return []

              if (ps.length==1) {
                const p = ps[0]
                return [{...p, content:p.content.slice(0,p.cursor-speed)+p.content.slice(p.cursor), cursor:Math.max(0, p.cursor!-speed)}]
              }else{
                const [p1,p2] = ps
                return (p2.cursor>0 || p1.indent!=p2.indent)?
                [p1, {...p2, content:p2.content.slice(0,Math.max(0,p2.cursor-speed))+p2.content.slice(p2.cursor), cursor:Math.max(0,p2.cursor-speed)}]
                :[{...p1, content:p1.content  +p2.content, cursor:p1.content.length+1-speed}]
              }
            })(pushhist(s)))
          }
          if (e.key == 'Delete') return
          if (e.key == 'Tab') {
            if (e.metaKey || e.shiftKey) return
            e.preventDefault()
            return show(updateLines(s.cursor, ([p])=>([{...p, content:p.content.slice(0,p.cursor)+'  '+p.content.slice(p.cursor) , cursor:p.cursor+2}]))(s))
          }

          if (e.key == 'Escape') return
          if (e.key.length==1){
          
            if (e.metaKey) {
              if (e.key == 'z'){
                log('undo')
                if (s.hist.length) show({
                  ...last(s.hist),
                  hist: s.hist.slice(0,-1)
                })
              }
              return
            }
            if (s.cursor == -1) return
            cc<State>(
              pushhist,
              updateLines(s.cursor, ([p])=>([{...p, content:p.content.slice(0,p.cursor)+e.key+p.content.slice(p.cursor) , cursor:p.cursor+1}])),
              show
            )(s)
            return
          }
        },
      },
    }));
  }

  const r = 
   store.get('root') ??
   root(child('hello', 'hello #world'))

  cc(
    show
  )({
      r,
      p: buildPage(r, ['hello'], 1).map(p=>render(p)),
      cursor: 0,
      store:store,
      hist: [],
  })
}
