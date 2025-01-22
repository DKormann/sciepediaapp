
// @ts-ignore
import {Root as Root, getData, setData, Child, Path, root, child} from './data'
import { htmlElement } from './_html'


const comp = (a:any, p:any) => JSON.stringify(a) === JSON.stringify(p)

const assertEq = (a:any, b:any,msg:string) => {comp(a,b) || console.error(a,b, msg)}

type PageView = {
  type:'page'
  stack:ID[]
  element?:HTMLElement
  open : LineView[]
}

type LineView = {
  type:'line'
  stack:ID[]
  element?:HTMLElement
  open: PageView[]
  content:string
  editable:boolean
}

type ID = Path|number

type View = LineView|PageView

type State = {
  root:Root
  pageState:PageView
  editable:ID[]
}

type Update = (s:State)=>State

const setAttr=<T>(key:string, value:any)=>(item:T):T=>({...item, [key]:value})

const islink = (s:string) => s.startsWith('#')
const linkpath = (s:string) => s.slice(1).split('.')

const createView=(r:Root, stack:ID[]):PageView => {
  const node = getData(r, last(stack) as Path)
  const lines = node.Content.split('\n')
  return {
    type:'page',
    stack,
    open: lines.map((l,i)=>({
      id:i,
      type:'line',
      stack:[...stack, i],
      content:l,
      open: [],
      editable: false
    }))
  }
}

const last = <T>(arr:T[]):T => arr[arr.length-1]

const getID = (v:View)=>last(v.stack) 

const pageHTML = (page:PageView):HTMLElement=>{
  const elid = JSON.stringify(page.stack)
  return htmlElement('div', '', ['id', elid],['class', 'page'],['children',[
    htmlElement('h2', (getID(page) as Path).join('.'), ['id', elid]),
    htmlElement('div', '', ['children', page.open.map(l=>l.element)])
  ]])
}


const lineHTML = (line:LineView):HTMLElement =>{
  if (line.editable){
    console.log('editable', line.stack);
  }
  const elid = JSON.stringify(line.stack)
  return htmlElement('p','' , ['id', elid],['children',
    [
    htmlElement('span', '', ['children',
      line.content.split(' ')
      .map(w=>htmlElement('span', w, ['class','stack '+(islink(w)?'link':'line')], ['id',elid]))
      .reduce((l:HTMLElement[],w)=>[...l, w, htmlElement('span', ' ')],[])
    ],['contentEditable' , line.editable.toString()]),
    
    ...line.open.map(p=>p.element)
    ]])
  }

const deepWalk = (v:View, fn:(v:View)=>View):View =>fn({...v, open:v.open.map(p=>deepWalk(p, fn)) } as View)
const render = (v:View)=>deepWalk(v,(v:View):View=>({...v, element:v.type === 'line'?lineHTML(v):pageHTML(v)})) 

const getChild = (v:View|undefined, id:ID): View|undefined=>v?.open.find(v=>comp(getID(v), id))
const getView = (s:State, stack:ID[])=> {
  if (stack.length === 0 || !comp(s.pageState.stack[0],stack[0])) return undefined
  return stack.slice(1).reduce(getChild, s.pageState)
}

const updateView=<T extends View>(stack:ID[], fn:(v:T)=>T):Update => s=>setView(stack, fn(getView(s, stack) as T))(s)

const openLink= (stack:ID[]):Update=>s =>updateView<LineView>(stack.slice(0,-1), (ln:LineView)=>({
    ... ln, open: ln.open.concat(createView(s.root, stack)) }))(s)

const toggleLink = (stack:ID[], path:Path) :Update=>s=> updateView<LineView>(stack, ln=>({
  ... ln,
  open: (ln.open.find(v=>comp(getID(v), path))?
  ln.open.filter(v=>!comp(getID(v), path)):
  ln.open.concat(createView(s.root, [...stack, path])))
}))(s)
  
const setEditble = (stack:ID[])=>
    chain(
    s=>s.editable.length? updateView(s.editable, setAttr<View>('editable', false))(s):s,
    s=> s.editable.length? assertEq((getView(s, s.editable)as LineView).editable, false, 'didnt reset editable' ):s,
    updateView(stack, setAttr<View>('editable', true)),
    setAttr<State>('editable', stack)
  )

const _setView=<T extends View>(r:Root, parent:T, stack:ID[], view:View):T => {
  if (stack.length === 0) return view as T
  const open = parent.open.map(v=>comp(getID(v), stack[0])?_setView(r, v as T, stack.slice(1), view):v)
  return {...parent,open}
}

const setView = (stack:ID[], view:View):Update=>
 s=> setAttr<State>('pageState', _setView(s.root, s.pageState, stack.slice(1), view))(s)

const chain = (...up:(Update|((s:State)=>void))[]):Update => s=>up.reduce((s, f)=>f(s)||s, s)

export const view = (putHTML:(el:HTMLElement)=>void) => {
  
  const r = root(child(['me'], 'hello #link'), child(['link'], 'world #aka\nalso #akb'), child(['aka'], 'aka'))

  const s = {
    root:r,
    pageState:createView(r, [['me']]),
    editable:[]
  }

  const show = (s:State)=>{

    const ren= render(s.pageState)
    const pg = ren.element!

    const listen=(type:string, fn:(v:View, e:Event)=>void)=>{
      pg.addEventListener(type, e=>{
        if (e.target instanceof HTMLElement && e.target.classList.contains('stack')){ 
          const v=getView(s, JSON.parse(e.target.id) as ID[])
          if (v) fn(v, e)
        }    
      })
    }

    listen('click', (v,e)=>{
      const t = e.target as HTMLElement
      if (t.classList.contains('link')){
        show(toggleLink(v.stack, linkpath(t.textContent!))(s))
      }else if (t.classList.contains('line')){
        if (!comp(s.editable, v.stack)) show(setEditble(v.stack)(s))
      }
    })


    listen('input', (v,e)=>{
      console.log('input', v)
    });
      

    pg.addEventListener('input', e=>{ 
      console.log(e);  
    })

    putHTML(pg)
    return pg
  }

  {
    chain(
      s=>{
        console.log('test view')

        const mev = createView(s.root, [['me']])
        assertEq(mev.open.length, 1, 'createView')
        assertEq(mev.type, 'page', 'createView')
        assertEq(mev.stack, [['me']], 'createView')

        const got = getView(s, [['me']])
        assertEq(got, mev, 'getView')
        
        assertEq(setView([['me']], getView(s, [['me']])!)(s), s, 'setView')
        const ln = getView(s, [['me'],0]) as LineView
        const res = setView([['me'],0], {...ln, content:"hiii"} as LineView)(s)
        assertEq(getView(res, [['me'],0]), {...ln, content:"hiii"}, 'setView')
        const op = openLink([['me'],0, ['link']])(s)
        assertEq((getView(op, [['me'],0]) as LineView).open.length, 1, 'openLink')
      },

      show,
    )(s)
  }
}
