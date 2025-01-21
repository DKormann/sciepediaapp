
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
  editable:boolean
}

type ID = Path|number

type View = {
  id:ID
  open: View[]
}

type State = {
  root:Root
  pageState:PageView
  editable:ID[]
}

const setAttr=<T>(key:string, value:any)=>(item:T):T=>({...item, [key]:value})

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
      open: [],
      editable: false
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
  if (line.editable){
    console.log('editable', stack);
  }
  const elid = JSON.stringify(stack)
  return htmlElement('p','' , ['id', elid],['children',
    [
    htmlElement('span', '', ['children',
      line.content.split(' ')
      .map(w=>htmlElement('span', w, ['class', islink(w)?'link':'line'], ['id',elid]))
      .reduce((l:HTMLElement[],w)=>[...l, w, htmlElement('span', ' ')],[])
    ],['contentEditable' , line.editable.toString()]),
    
    ...line.open.map(p=>pageHTML(p, [...stack, p.id]))
  ]])
}

const getChild = (v:View|undefined, id:ID): View|undefined=>v?.open.find(v=>comp(v.id, id))
const getView = (s:State, stack:ID[])=> stack.reduce(getChild,{id:0, open: [s.pageState]} as View)

const updateView=<T extends View>(s:State, stack:ID[], fn:(v:T)=>T) => setView(s, stack, fn(getView(s, stack) as T))

const openLink= (s:State, stack:ID[]) => updateView(s, stack.slice(0,-1), (ln)=>({
    ... ln, open: ln.open.concat(createView(s.root, stack[stack.length-1] as Path)) }))

const toggleLink = (s:State, stack:ID[], path:Path) => updateView(s, stack, ln=>({
  ... ln,
  open: ln.open.find(v=>comp(v.id, path))?
  ln.open.filter(v=>!comp(v.id, path)):
  ln.open.concat(createView(s.root, path)) }))
  
const setEditble = (s:State, stack:ID[]) => {

    return chain(s,
    s=>s.editable.length?updateView(s, s.editable, setAttr<View>('editable', false)):s,
    s=>{if (s.editable.length)assertEq((getView(s, s.editable)as LineView).editable, false)},
    s=>updateView(s, stack, setAttr<View>('editable', true)),
    setAttr<State>('editable', stack)
  )
}

const _setView=<T extends View>(r:Root, parent:T, stack:ID[], view:View):T => {
  if (stack.length === 0) return view as T
  const ch = getChild(parent, stack[0])
  if (ch === undefined) {
    console.error("not found", stack[0]);
    return parent
  }
  return {
    ...parent,
    open: parent.open.filter(v=>!comp(v.id, stack[0])).concat(_setView(r, ch, stack.slice(1), view))
  }
}

const setView = (s:State, stack:ID[], view:View):State => {  
  assertEq(stack[0], s.pageState.id)
  return {
    ...s,
    pageState: _setView(s.root, s.pageState, stack.slice(1), view)
  }}

const chain=(s:State, ...fn:((s:State)=>State|void)[])=>fn.reduce((s, f)=>f(s)??s,s )

const r = root(child(['me'], 'hello #link'), child(['link'], 'world #link'))

console.log(JSON.stringify(r));

const s = {
  root:r,
  pageState:createView(r, ['me']),
  editable:[]
}

export const view = (putHTML:(el:HTMLElement)=>void) => {
  const show = (s:State)=>{
    const pg = pageHTML(s.pageState, [s.pageState.id]);
    pg.addEventListener('click', e=>{
      if (e.target instanceof HTMLElement){
        const stack = [...JSON.parse(e.target.id)] as ID[]
        if (e.target.classList.contains('link')){
          show(toggleLink(s, stack, linkpath(e.target.textContent!)))
        }else if (e.target.classList.contains('line')){
          if (!comp(s.editable, stack)) show(setEditble(s, stack))
        }
      }
    })
    putHTML(pg)
  }

  {
    chain(s,
      s=>{
        console.log('test view')
        assertEq(setView(s, [['me']], getView(s, [['me']])!), s)
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
