
// @ts-ignore
import {Root as Root, getData, setData, Child, Path, root, child} from './data'
import { htmlElement, htmlKey } from './_html'

import { assertEq, comp, log, last, LastT, stringify, setAttr} from './helpers'

type stack = (number|Path)[]
type State = {
  r: Root,
  p: Rendered[],
  cursor: [number, number],
}

type Pelement = {
  content:string,
  indent:number,
  children:Pelement[],
  path:Path,
  is_title ?: true,
  el?:HTMLElement,
  cursor?:number,
}

type Rendered = Pelement & {
  el:HTMLElement
}

const islink = (s:string) => s.startsWith('#') && s.length > 1


const build = (r:Root, path:Path, indent:number):Pelement[] => {
  const node = getData(r, path)
  const tit = node.path.join('.s')
  return [
    {content:tit,path,indent,is_title:true, children:[]},
    ...node.Content.split('\n').map(c=>({content:c, indent, path, children:[]}))
  ]
}

const render = (par: Pelement):Rendered=>
  (par.el !== undefined) ? par as Rendered : {...par,
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
}

const insert = <T>(arr:T[], idx:number|undefined, ...elements:T[])=>{
  return idx==undefined?arr:[...arr.slice(0,idx), ...elements, ...arr.slice(idx)]
} 


const toggleLink = (lnum:number, start:number, end:number):Update=>s=>{

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

const getLine = (lnum:number) => (s:State) => s.p[lnum]

const updateLine = (lnum:number, f:(p:Pelement)=>Pelement):Update=>s=>
  setLine(lnum, f(getLine(lnum)(s)))(s)

const setLine = (lnum: number, line: Pelement):Update=>s=>(
  {
    ...s,
    p: [
      ...s.p.slice(0,lnum),
      render(line),
      ...s.p.slice(lnum+1)
    ]
  })

const cc = <T> (fs:((a:T)=>T)[]) => (a:T) => fs.reduce((a,f)=>f(a),a)

const setCursor = (lnum:number, cnum:number):Update=>
  cc([
    updateLine(lnum, p=>({...p, cursor:cnum,el:undefined})), 
    s=>updateLine(s.cursor[0],p=>({...p, cursor:undefined}))(s),
    setAttr('cursor', [lnum,cnum]),
  ])

const findLine = (p:Rendered[],y:number):number=>
  p.findIndex(({el})=>el.clientHeight + el.offsetTop > y)

const letters = (p:Rendered) => (Array.from(p.el.children).filter(x=>x.nodeName=='SPAN') as HTMLElement[])

const findChar = (p:Rendered, x:number) =>{
  const ls = letters(p)
  log(ls[0].offsetLeft, ls[0].clientLeft, ls[0].scrollLeft)
  const i = ls.findIndex(e=>e.offsetLeft > x)
  return i == -1? ls.length-1:i
}

const seekWord = (p:Pelement, c:number) =>
  [c-last(p.content.slice(0,c).split(' ')).length , c+p.content.slice(c).split(' ')[0].length]

type Update = (s:State) => State

export const view = (putHTML:(el:HTMLElement)=>void) => {

  const show = (s:State)=>{

    const onclick = (e:MouseEvent)=>{
      const p = findLine(s.p, e.y+window.scrollY)
      if (p === -1) return
      const c = findChar(s.p[p], log(e.x)+window.scrollX-Number(window.getComputedStyle(s.p[p].el).fontSize.slice(0,-2))/2)
      const [a,b] = seekWord(s.p[p],c)
      if (islink(s.p[p].content.slice(a,b))){
        show(toggleLink(p,a,b)(s))
      }else{
        show(setCursor(p,c)(s))
      }
    }

    putHTML(htmlElement('div', '', 'root',{
      children: s.p.map(p=>p.el),
      onclick
    }));
    {
      const e= {x: 67, y:111}
    }
  }

  const r = root(child(['hello'],'world is ok\nanother #link is ok too\nnn\nee'), child(['link'], 'this a normal #link\nee\nqq'))
  show({
    r,
    p: build(r, ['hello'], 1).map(render),
    cursor: [0,-1]
  })  
}
