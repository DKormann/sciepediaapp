
// @ts-ignore
import {Root as Root, getData, setData, Child, Path, root, child} from './data'
import { htmlElement, htmlKey } from './_html'

import { assertEq, comp, log, last, LastT, stringify, setAttr} from './helpers'

type stack = (number|Path)[]
type State = {
  r:Root,
  p: Pelement[],
}

type Pelement = {
  el:HTMLElement,
  content:string,
  indent:number,
  children:Pelement[],
  path:Path,
}

const build = (r:Root, p:Path, indent:number):Pelement[] => {
  const node = getData(r, p)

  const line = (s:string) =>({
    indent,
    path:p,
    content:s,
    el: htmlElement('p', '', 'line', {children:s.split('').map(c=>htmlElement('span', c, 'char'))}),
    children:[]
  })
  const tit = node.path.join('.s')
  return [
    {...line(tit), el: htmlElement('p', tit, 'title')}
    ,...node.Content.split('\n').map(line)
  ]
}

const findLine = (p:Pelement[],y:number):Pelement|undefined=>
  p.find(({el})=>el.offsetTop < y && el.clientHeight + el.offsetTop > y)

const findChar = (p:Pelement, x:number) =>{

  return (Array.from(p.el.children) as HTMLElement[]).findIndex(e=>e.offsetLeft > x)
}
  


type Update = (s:State) => State

export const view = (putHTML:(el:HTMLElement)=>void) => {

  const show = (s:State)=>{
    

    putHTML(htmlElement('div', '', 'root',{
      children: s.p.map(p=>p.el),
      onclick: (e:MouseEvent)=>{
        log(e.target)
        log(e.x, e.y)
        log('word:',findChar(log(findLine(s.p, e.y))!, e.x))
      }
    }))
    {
      const e= {x: 67, y:111}
      log(e.x, e.y)
      log('word:',findChar(log(findLine(s.p, e.y))!, e.x))
    }
  }

  const r = root(child(['hello'],'world is ok\n#link is ok too'), child(['link'], 'this a normal link'))
  show({
    r,
    p: build(r, ['hello'], 0),
  })  
}
