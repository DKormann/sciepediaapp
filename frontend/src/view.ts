
// @ts-ignore
import {Root as Root, getData, setData, Child, Path, root, child} from './data'
import { htmlElement, htmlKey } from './_html'

import { assertEq, comp, log, last, LastT, stringify, setAttr} from './helpers'

type stack = (number|Path)[]
type State = {
  r: Root,
  p: Rendered[],
  cursor: number,
}

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


const build = (r:Root, path:Path, indent:number):Pelement[] => {
  const node = getData(r, path)
  const tit = node.path.join('.s')
  return [
    {content:tit,path,indent,is_title:true, children:[], cursor:-1},
    ...node.Content.split('\n').map(c=>({content:c, indent, path, children:[], cursor:-1}))
  ]
}

const render = (par: Pelement):Rendered=>(
  {...par,
    el: htmlElement('p', '', 'line', {children:[
        ...Array.from({length:par.indent}, _=>htmlElement('div', '', 'pad')),
        ...par.is_title? [htmlElement('span', par.content, 'title')]
        :insert(
          par.content.split(' ').map(w=>(' '+w).split('').map(c=>htmlElement('span', c, islink(w)?'link':'char'))).flat().slice(1),
          par.cursor, cursor()
        )
      ]
    }
  )
})

const insert = <T>(arr:T[], idx:number|undefined, ...elements:T[])=>{
  return idx!=undefined && idx>=0?[...arr.slice(0,idx), ...elements, ...arr.slice(idx)]:arr
} 


const toggleLink = (lnum:number, start:number, end:number):Update=>s0=>{
  const s = clearCursor(s0)
  const target = s.p[lnum]
  const link = target.content.slice(start,end)
  assertEq(islink(link), true, 'open non link:'+link)
  const prev = s.p.slice(0,lnum)
  const rest = s.p.slice(lnum+1)
  const scope = rest.findIndex(p=>p.indent==target.indent)
  return {...s,
    p:[...prev,
      ... (scope <= 0)?[
        {...target, content:target.content.slice(0,end), el:undefined},
        ...build(s.r, [link.slice(1)], target.indent+1).map(render),
        {...target, content:target.content.slice(end), el:undefined},
        ...rest
      ]:[
        render({...target, content: target.content+rest[scope].content, el:undefined}),
        ...rest.slice(scope+1),
      ]
    ].map(render)
  }
}

const cursor = ()=>htmlElement('div', '', 'cursor')

const getLines = (lnum:number|[number,number]) => (s:State) => 
  ((typeof lnum == 'number')?[s.p[lnum]]:s.p.slice(lnum[0],lnum[1]))

const updateLines = (lnum:number|[number,number], f:(p:Pelement[])=>Pelement[]):Update=>s=>
  setLine(lnum, ...f(getLines(lnum)(s)))(s)

const setLine = (line:number|[number, number], ...lines: Pelement[]):Update=>s=>{
  const [start,end] = log("set",(typeof line == 'number')?[line,line+1]:line)
  assertEq(end>=start, true, `end>=start ${end}>=${start}`);
  const focusline = lines.findIndex(p=>p.cursor>-1)
  return {
    ...s,
    p: log("new p",[
      ...s.p.slice(0,start),
      ...lines.map(render),
      ...s.p.slice(end)
    ]),
    cursor: focusline == -1? s.cursor: start+focusline,
  }
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

const findLine = (p:Rendered[],y:number):number=>
  p.findIndex(({el})=>el.clientHeight + el.offsetTop > y)

const letters = (p:Rendered) => (Array.from(p.el.children).filter(x=>x.nodeName=='SPAN') as HTMLElement[])

const findChar = (p:Rendered, x:number) =>{
  const ls = letters(p)
  // log(ls[0].clientWidth, ls[0].offsetWidth, ls[0].scrollWidth)
  const i = ls.findIndex(e=>(e.offsetLeft +e.offsetWidth/2) > x)
  return i == -1? ls.length:i
}

const seekWord = (p:Pelement, c:number) =>
  [c-last(p.content.slice(0,c).split(' ')).length , c+p.content.slice(c).split(' ')[0].length]

type Update = (s:State) => State

export const view = (putHTML:(el:HTMLElement)=>void) => {

  const show = (s:State)=>{

    const onclick = (e:MouseEvent)=>{
      const p = findLine(s.p, e.y+window.scrollY)
      if (p === -1) return
      const c = findChar(s.p[p], log(e.x)+window.scrollX)
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
          if (e.key.startsWith("Arrow")) return
          if (e.key == 'Enter') {
            cc(
              updateLines(s.cursor, ([p])=>([
                {...p, content:p.content.slice(0,p.cursor), cursor:-1},
                {...p, content:p.content.slice(p.cursor), cursor:0},
              ])),
              show
            )(s)
            return
          }
          if (e.key == 'Backspace') {
            cc(
              updateLines([s.cursor-1, s.cursor+1], ps=>{
                if (ps.length==0) return []
                if (ps.length==1) {
                  const p = ps[0]
                  return [{...p, content:p.content.slice(0,p.cursor-1)+p.content.slice(p.cursor), cursor:p.cursor!-1}]
                }else{
                  const [p1,p2] = ps
                  return p2.cursor>0 || p1.is_title?
                  [p1, {...p2, content:log(p2.content.slice(0,Math.max(0,p2.cursor-1)))+log(p2.content.slice(p2.cursor)), cursor:Math.max(0,p2.cursor-1)}]
                  :[{...p1, content:p1.content+p2.content, cursor:p1.content.length}]
                }
              }),
              show
            )(s)
            return 
          }
          if (e.key == 'Delete') return
          if (e.key == 'Tab') return
          if (e.key == 'Escape') return
          {
            if (s.cursor == -1) return
            cc<State>(
              updateLines(s.cursor, ([p])=>([{...p, cursor:0}])),
              show
            )(s)
            return
          }
        },
      },
    }));
  }

  const r = root(child(['hello'],'world is ok\nanother #link is ok too\nnn\nee'), child(['link'], 'this a normal #link\nee\nqq'))
  show({
    r,
    p: build(r, ['hello'], 1).map(render),
    cursor: 0,
  })  
}
