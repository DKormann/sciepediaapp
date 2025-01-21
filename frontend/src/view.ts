
// @ts-ignore
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


type PagePath = [Path] | [Path, ...(Path|number)[], Path]
type LinePath = [...PagePath, number]


const linePath = (p:PagePath, l:number):LinePath => [...p, l]
const pagePath = (l:LinePath, p:Path):PagePath =>[...l, p]

// const parentLine = (p:PagePath) => p.slice(0,-1) as LinePath
// const parentPage = (l:LinePath) => l.slice(0,-1) as PagePath 


type State = {
  root:Root
  page:Page
}

const last = <T>(arr:T[]):T => arr[arr.length-1]

const page = (r:Root, pagePath: PagePath):Page => {
  
  const pstring = JSON.stringify(pagePath)
  const head:Head = {element:htmlElement("h2", (last(pagePath) as Path).join('.'), ['id', pstring])}
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



const body = (r:Root, path:PagePath):Body => {
  const data = getData(r, last(path) as Path)  
  const lines = data.Content.split('\n').map((c,i)=>line(r, linePath(path, i), c, data.linkstate[i]))
  return {lines, element:htmlElement("div", '', ['children', lines.map(l=>l.element)], ['id', JSON.stringify(pagePath)])}
}


// type Update = (s:State) => State
type Jsonable = string|number|boolean|null|Jsonable[]|{[key:string]:Jsonable}

const comp = <T extends Jsonable | undefined>(a:T, b:T):boolean => JSON.stringify(a) === JSON.stringify(b)

const getPage = (s:State, path:PagePath) => {
  const _getPage=(l:Line, path:PagePath):Page|undefined=>{
    const [pt, nm, ...rest] = path
    const pp = l.children.find(ch=>comp(last(ch.path), pt))
    const ll = pp?.body.lines[nm as number]
    return ll ? _getPage(ll, rest as PagePath) : pp
  }
  return _getPage({children:[s.page], element:document.body}, path)
}

// const setPage = (s:State, page:Page):State =>{

//   const _setPage = (parent:Page, page:Page):Page =>{
//     assertEq(parent.path.slice(0,-1), page.path.slice(0,parent.path.length-1), 'setPage path')

//     return {
//       ...parent,
//       // child: parent.childrend.concat(_setPage(
//     }
//   }

//   return {...s, page:_setPage(s.page, page)}
// }

// const toggleLink = (linePath:LinePath, path:Path):Update => (s)=>{
//   return s
// }


const assertEq = (a:Jsonable|undefined, b:Jsonable|undefined, message:string) => {
  if (!comp(a!,b!)) console.error(message, a, b)
}

// const assertNeq = (a:Jsonable|undefined, b:Jsonable|undefined, message:string) => {
//   if (comp(a!,b!)) console.error(message, a, b)
// }

const pageText=(page:Page):string => page.body.lines.map(l=>l.element?.childNodes[0].textContent).join('\n')

{
  console.log("testing view")
  const r = root(child(["me"], "hello #note", [[['note']]]), child(["note"], "note."))

  const s:State = {root:r, page:page(r, [["me"]])}
  assertEq(pageText(getPage(s, [['me']])!), 'hello #note', 'view test');
  assertEq(pageText(getPage(s, [['me'],0, ['note']])!), 'note.', 'view test');
}

export const view = (show: (el:HTMLElement)=>void) => {
  const r = root(child(["me"], "hello #note", [[['note']]]), child(["note"], "note."))
  const s:State = {root:r, page:page(r, [["me"]])}
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


