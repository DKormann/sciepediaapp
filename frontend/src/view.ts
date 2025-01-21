
// @ts-ignore
import {Root as Root, getData, setData, Child, Path, root, child} from './data'
import { htmlElement } from './_html'


const comp = (a:any, p:any) => JSON.stringify(a) === JSON.stringify(p)

const assertEq = (a:any, b:any) => {comp(a,b) || console.error(a,b)}

type PageView = {
  id:Path
  open : LineView[]
}

type LineView = {
  content:string
  id:number
  open: PageView[]
}

type ID = Path|number

type View = {
  id:ID
  open: View[]
}

type State = {
  root:Root
  pageState:PageView
}


const islink = (s:string) => s.startsWith('#')
const linkpath = (s:string) => s.slice(1).split('.')

const createView=(r:Root, path:Path):PageView => {
  const node = getData(r, path)
  const lines = node.Content.split('\n')
  return {
    id:path,
    open: lines.map((l,i)=>({
      id:i,
      content:l,
      open: []
    }))
  }
}

const pageHTML = (page:PageView, stack?:ID[]):HTMLElement =>{

  if (stack === undefined) stack = [page.id]
  const elid = JSON.stringify(stack)

  return htmlElement('div', '', ['id', elid],['children',[
    htmlElement('h2', page.id.join('.'), ['id', elid]),
    htmlElement('div', '', ['children', page.open.map((l,i)=>lineHTML(l, [...(stack as ID[]), i]))]),
  ]])
}

const lineHTML = (line:LineView, stack:ID[]):HTMLElement =>{
  const elid = JSON.stringify(stack)
  return htmlElement('p','' , ['id', elid],['children',
    [
    htmlElement('span', '', ['children',
      line.content.split(' ')
      .map(w=>islink(w)?htmlElement('span', w, ['class', 'link'], ['id',elid]):htmlElement('span', w))
      .reduce((l:HTMLElement[],w)=>[...l, w, htmlElement('span', ' ')],[])
    ]),
    
    ...line.open.map(p=>pageHTML(p, [...stack, p.id]))
  ]])
}

const getChild = (v:View|undefined, id:ID): View|undefined=>v?.open.find(v=>comp(v.id, id))
const getView = (s:State, stack:ID[])=> stack.reduce(getChild,{id:0, open: [s.pageState]} as View)

const updateView=<T extends View>(s:State, stack:ID[], fn:(v:T)=>T) => setView(s, stack, fn(getView(s, stack) as T))

const openLink= (s:State, stack:ID[]) => updateView(s, stack.slice(0,-1), (ln)=>({
    ... ln, open: ln.open.concat(createView(s.root, stack[stack.length-1] as Path)) }))

// const closeLink= (s:State, stack:ID[]) => updateView(s, stack.slice(0,-1), ln=>({
//     ... ln, open: ln.open.filter(v=>!comp(v.id, stack[stack.length-1])) }))

const toggleLink = (s:State, stack:ID[]) => updateView(s, stack.slice(0,-1), ln=>({
  ... ln,
  open: ln.open.find(v=>comp(v.id, stack[stack.length-1]))?
  ln.open.filter(v=>!comp(v.id, stack[stack.length-1])):
  ln.open.concat(createView(s.root, stack[stack.length-1] as Path)) }))
  

const _setView=<T extends View>(r:Root, parent:T, stack:ID[], view:View):T => {
  if (stack.length === 0) return view as T
  const ch = getChild(parent, stack[0])
  if (ch === undefined) {
    console.error("not found", stack[0]);
    return parent
  }
  const res = {
    ...parent,
    open: parent.open.filter(v=>!comp(v.id, stack[0])).concat(_setView(r, ch, stack.slice(1), view))
  }
  console.log("res:",res);
  return res
  
}

const setView = (s:State, stack:ID[], view:View):State => {
  console.log('setView', stack);
  
  assertEq(stack[0], s.pageState.id)
  return {
    ...s,
    pageState: _setView(s.root, s.pageState, stack.slice(1), view)
  }}

const chain=(s:State, ...fn:((s:State)=>State|void)[])=>fn.reduce((s, f)=>f(s)??s,s )

const r = root(child(['me'], 'hello #link'), child(['link'], 'world #link'))

const s = {
  root:r,
  pageState:createView(r, ['me'])
}

{
  console.log('test view');
  chain(s,
  )
}

export const view = (putHTML:(el:HTMLElement)=>void) => {
  const show = (s:State)=>{
    const pg = pageHTML(s.pageState, [s.pageState.id]);
    pg.addEventListener('click', e=>{
      if (e.target instanceof HTMLElement && e.target.classList.contains('link')){
        const path = [...JSON.parse(e.target.id), linkpath(e.target.textContent!)] as ID[]
        show(toggleLink(s, path))
      }
    })
    putHTML(pg)
  }

  {
    chain(s,
      s=>console.log('test view'),
      s=> assertEq(setView(s, [['me']], getView(s, [['me']])!), s),
      s=>{
        const ln = getView(s, [['me'],0]) as LineView
        const res = setView(s, [['me'],0], {...ln, content:"hiii"} as LineView)!
        assertEq(getView(res, [['me'],0]), {...ln, content:"hiii"})
        const op = openLink(s, [['me'],0, ['link']])
        assertEq((getView(op, [['me'],0]) as LineView).open.length, 1)
        assertEq((getView(op, [['me'],0, ['link']]) as PageView), createView(s.root, ['link']))
        
      },
      s=>{
        return openLink(s, [['me'],0, ['link']])
      },
      show,
    )
  }
}
