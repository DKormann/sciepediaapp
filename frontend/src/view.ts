
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

type Update = (s:State)=>State

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

const updateView=<T extends View>(stack:ID[], fn:(v:T)=>T):Update => s=>setView(stack, fn(getView(s, stack) as T))(s)

const openLink= (stack:ID[]):Update=>s =>updateView<LineView>(stack.slice(0,-1), (ln:LineView)=>({
    ... ln, open: ln.open.concat(createView(s.root, stack[stack.length-1] as Path)) }))(s)

const toggleLink = (stack:ID[], path:Path) :Update=>s=> updateView(stack, ln=>({
  ... ln,
  open: ln.open.find(v=>comp(v.id, path))?
  ln.open.filter(v=>!comp(v.id, path)):
  ln.open.concat(createView(s.root, path)) }))(s)
  
const setEditble = (stack:ID[]) :Update=>

    chain(
    s=>s.editable.length?updateView(s.editable, setAttr<View>('editable', false))(s):s,
    s=>{
      if (s.editable.length)assertEq((getView(s, s.editable)as LineView).editable, false)
      return updateView(stack, setAttr<View>('editable', true))(s)
    },
    setAttr<State>('editable', stack)
  )


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

const setView = (stack:ID[], view:View):Update=>
 s=> setAttr<State>('pageState', _setView(s.root, s.pageState, stack.slice(1), view))(s)

const chain = (...up:Update[]):Update => s=>up.reduce((s, f)=>f(s), s)

export const view = (putHTML:(el:HTMLElement)=>void) => {
  
  const r = root(child(['me'], 'hello #link'), child(['link'], 'world #link'))

  const s = {
    root:r,
    pageState:createView(r, ['me']),
    editable:[]
  }

  const show = (s:State)=>{
    const pg = pageHTML(s.pageState, [s.pageState.id]);
    pg.addEventListener('click', e=>{
      if (e.target instanceof HTMLElement){
        const stack = [...JSON.parse(e.target.id)] as ID[]
        if (e.target.classList.contains('link')){
          show(toggleLink(stack, linkpath(e.target.textContent!))(s))
        }else if (e.target.classList.contains('line')){
          if (!comp(s.editable, stack)) show(setEditble(stack)(s))
        }
      }
    })
    putHTML(pg)
    return s
  }

  {
    chain(
      s=>{
        console.log('test view')
        assertEq(setView([['me']], getView(s, [['me']])!)(s), s)
        const ln = getView(s, [['me'],0]) as LineView
        const res = setView([['me'],0], {...ln, content:"hiii"} as LineView)(s)
        assertEq(getView(res, [['me'],0]), {...ln, content:"hiii"})
        const op = openLink([['me'],0, ['link']])(s)
        assertEq((getView(op, [['me'],0]) as LineView).open.length, 1)
        assertEq((getView(op, [['me'],0, ['link']]) as PageView), createView(s.root, ['link']))
        return s
      },

      openLink([['me'],0, ['link']]),
      show,
    )(s)
  }
}
