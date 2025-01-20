
import {Root as Root, getData, setData, Child, Path, root, child} from './data'
import { htmlElement } from './_html'


type Page = {
  element:HTMLElement
  head: Head
  body: Body
  path: PagePath
}
type Head = {
  element:HTMLElement
}
type Body = {
  element:HTMLElement
  lines:Line[]
}
type Line = {
  element?:HTMLElement
  children:Page[]
}

type LinePath = [Path, number][]
type PagePath = [...LinePath, [Path, null]]

const linePath = (p:PagePath, l:number):LinePath => p.map(([p,n],_)=>[p,n===null?l:n])
const pagePath = (l:LinePath, p:Path):PagePath =>[...l, [p, null]]


type State = {
  root:Root
  page:Page
}

const last = <T>(arr:T[]):T => arr[arr.length-1]

const page = (r:Root, pagePath: PagePath):Page => {
  
  const pstring = JSON.stringify(pagePath)
  const head:Head = {element:htmlElement("h2", datapath(pagePath).join('.'), ['id', pstring])}
  const b = body(r, pagePath)
  const element = htmlElement("div", '', ['children',[head.element, b.element]])
  return {element, head, body:b, path:pagePath}
}

const isLink = (s:string):boolean => s.startsWith('#')
const linkPath = (s:string):Path => s.slice(1).split('.')

const lineElement=(path: LinePath, content: string, childPages:Page[]):HTMLElement =>
  htmlElement('p','', ['children', [htmlElement("span",'',  ['children',
    content.split(' ').map((w)=>isLink(w) ?
    htmlElement("span", w, ['class', 'link'], ['id', JSON.stringify(path)]) :htmlElement("span", w))
    .reduce((acc:HTMLElement[], c:HTMLElement, i)=>acc.concat(i?[htmlElement('text',' '), c]:[c]), [])
  ]),...childPages.map(c=>c.element)]])

const line = (r:Root, path:LinePath, content:string, openLinks?: Path[]):Line => {
  const children = openLinks?.map(l=>{
    const ppath = pagePath(path, l)
    return page(r, ppath)
  }) || []
  return {element:lineElement(path, content, children), children}
}

const datapath=(p:LinePath|PagePath):Path=>last(p)[0]

const body = (r:Root, path:PagePath):Body => {
  const data = getData(r, datapath(path))  
  const lines = data.Content.split('\n').map((c,i)=>line(r, linePath(path, i), c, data.linkstate[i]))
  return {lines, element:htmlElement("div", '', ['children', lines.map(l=>l.element)], ['id', JSON.stringify(pagePath)])}
}

type Update = (s:State) => State
type Jsonable = string|number|boolean|null|Jsonable[]|{[key:string]:Jsonable}

const comp = <T extends Jsonable>(a:T, b:T):boolean => JSON.stringify(a) === JSON.stringify(b)

const getPage = (s:State, path:PagePath):Page|undefined => {
  return path.slice(0,-1).reduce((acc:Page|undefined, addr:[Path, number|null], i:number)=>{
    const linnum = addr[1] as number
    const pt = path[i+1][0]
    return acc?.body.lines[linnum].children.find(ch=>comp(datapath(ch.path), pt))
  }, s.page)
}


const 

const toggleLink = (linePath:LinePath, path:Path):Update => (s)=>{
  return s
}


const assertEq = (a:Jsonable|undefined, b:Jsonable|undefined, message:string) => {
  if (a === undefined || b === undefined) if (a !== b) console.error(message, a, b)
  if (!comp(a!,b!)) console.error(message, a, b)
}

const pageText=(page:Page):string => page.body.lines.map(l=>l.element?.childNodes[0].textContent).join('\n')

{
  console.log("testing view")
  const r = root(child(["me"], "hello #note", [[['note']]]), child(["note"], "note."))

  const s:State = {root:r, page:page(r, [[["me"], null]])}
  assertEq(pageText(getPage(s, [[['me'], null]])!), 'hello #note', 'view test');
  assertEq(pageText(getPage(s, [[['me'], 0], [['note'], null]])!), 'note.', 'view test');
}

export const view = (show: (el:HTMLElement)=>void) => {
  const r = root(child(["me"], "hello #note", [[['note']]]), child(["note"], "note."))
  const s:State = {root:r, page:page(r, [[["me"],null]])}
  show(
    htmlElement("div", '', ['children', [s.page.element]], 
      ['onclick', (e:MouseEvent)=>{
        if (e.target instanceof HTMLElement){
          if (e.target.classList.contains('link')){
            const linePath: LinePath = JSON.parse(e.target.id)
            const path = linkPath(e.target.innerText)
            console.log('link:', linePath, path);
          }
        }
      }]
    )
  )
}


