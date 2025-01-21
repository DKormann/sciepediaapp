
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


// const islink = (s:string):boolean => s.startsWith('#')
// const linktopath = (s:string):Path => s.slice(1).split('.')

const createView=(r:Root, path:Path):PageView => {
  const node = getData(r, path)
  const lines = node.Content.split('\n')
  console.log("create",node.path, node.Content);
  console.log(lines);
  return {
    id:path,
    open: lines.map((l,i)=>({
      id:i,
      content:l,
      open: []
    }))
  }
}

const showView = (page:PageView, stack?:ID[]):HTMLElement =>{

  if (stack === undefined) stack = [page.id]
  const elid = JSON.stringify(stack)
  console.log('view', page.id, page.open);
  
  return htmlElement('div', '', ['id', elid],['children',[
    htmlElement('h2', page.id.join('.'), ['id', elid]),
    htmlElement('div', '', ['children', page.open.map((l,i)=>showLine(l, [...(stack as ID[]), i]))]),
  ]])
}

const showLine = (line:LineView, stack:ID[]):HTMLElement =>{
  const elid = JSON.stringify(stack)
  return htmlElement('p','' , ['id', elid],['children',
    [
    htmlElement('span', line.content),
    ...line.open.map(p=>showView(p, [...stack, p.id]))
  ]])
}

const getChild = (v:View|undefined, id:ID): View|undefined=>v?.open.find(v=>comp(v.id, id))
const getView = (s:State, stack:ID[])=> stack.reduce(getChild,{id:0, open: [s.pageState]} as View)


const openLink = (r:Root, line:LineView, path:Path):LineView =>{
  return {
    ...line,
    open: line.open.concat([createView(r, path)])
  }
}
const closeLink = (_:Root, line:LineView, path:Path):LineView =>{
  return {
    ...line,
    open: line.open.filter(v=>!comp(v.id, path))
  }
}

const _setView=<T extends View>(r:Root, parent:T, stack:ID[], view:View):T => {
  if (stack.length === 0) return view as T
  console.log('set', stack[0]);
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

const r = root(child(['me'], 'hello #link'), child(['link'], 'world'))

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
  const show = (s:State)=>putHTML(showView(s.pageState, [s.pageState.id]))

  document.body.addEventListener('click', e=>{
    console.log(e.target);
  })
  {
    console.log('test view');
    chain(s,
      s=>console.log(getView(s,[['me']])),
      s=> assertEq(setView(s, [['me']], getView(s, [['me']])!), s),
      s=>{
        const ln = getView(s, [['me'],0])!
        const res = setView(s, [['me'],0], {...ln, content:"hiii"} as LineView)!
        assertEq(getView(res, [['me'],0]), {...ln, content:"hiii"})
      },
      show,
    )
  }
  // chain(s,show)
}
