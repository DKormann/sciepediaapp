
// @ts-ignore
import {Root as Root, getData, setData, Child, Path, root, child} from './data'
import { htmlElement, htmlKey } from './_html'


const comp = (a:any, p:any) => JSON.stringify(a) === JSON.stringify(p)

const assertEq = (a:any, b:any,msg:string) => {comp(a,b) || console.error([a,b], msg)}

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
  pageState:PageView
  root:Root
  editable:ID[]
}

const islink = (s:string) => s.startsWith('#')
const linkpath = (s:string) => s.slice(1).split('.')

const stack=(...x:(string| number)[])=>
  x.map(x=>typeof x === 'number'?x:linkpath(x))

assertEq(stack('#me'), [['me']], 'stack')
assertEq(stack('#me',0,'#link.other'), [['me'], 0, ['link','other']], 'stack')

const log=<T>(tag:string, t:T, ...x:any[])=>
  (t instanceof HTMLElement? console.log(tag,t,...x) : console.log(tag,":",[t,...x].map(x=>stringify(x)).join(' ')), t)
  

const stringify = (x:any):string =>
  x == undefined? 'undefined':
  x instanceof Array?
  `[${
    x.length==0?'':
    x.map(x=>stringify(x)).join(', ').replaceAll('\n','\n  ')
  }]`:
  typeof x === 'object'?
  `{\n  ${Object.entries(x).filter(([k,_])=>k!='element' || (x.type!='page'&&x.type!='line')).map(([k,v])=>`${k}:${stringify(v)}`).join(',\n').replaceAll('\n','\n  ')}\n}`
  :JSON.stringify(x)

type Update = (s:State)=>State

const setAttr=<T>(key:string, value:any)=>(item:T):T=>({...item, [key]:value})
const delAttr=<T>(key:string)=>(item:T):T=>({...item, [key]:undefined})


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

const pageHTML = (page:PageView):HTMLElement=>
  element('div', page.stack, '', 'page', {
    children:[
      element('h2', page.stack, (getID(page) as Path).join('.'), 'head'),
      element('div', page.stack, '', 'body', {children:page.open.map(l=>l.element)})
    ],
  })

const element = (tag:string, stack:ID[], w:string, cls:string, attr:Partial<Record<htmlKey, any>>={})=>
  htmlElement(tag, w, ['class', 'stack '+cls], ['id', JSON.stringify(stack)], ...Object.entries(attr) as [htmlKey, any][])

const lineHTML = (line:LineView):HTMLElement =>
  element('p',line.stack, '', 'line', {
    children: [
      element('span',line.stack, '', 'line span', {children:
        line.content.split(' ')
        .map(w=>element('span',line.stack, w, islink(w)?'link':'line'))
        .reduce((l:(HTMLElement)[],w,i)=>[...l,element('span',line.stack, i?' ':'', 'line'), w], []),
        contentEditable:line.editable
      }),
      ...line.open.map(p=>p.element!)
    ]
  })

const deepWalk = (v:View, fn:(v:View)=>View):View =>fn({...v, open:v.open.map(p=>deepWalk(p, fn)) } as View)
const render = (v:View)=>{
  const res = deepWalk(v,(v:View):View=>({...v, element:v.type === 'line'?lineHTML(v):pageHTML(v)}))
  log('renderd', res.element)
  return res

}

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
    s=>s.editable.length? assertEq((getView(s, s.editable)as LineView).editable, false, 'didnt reset editable' ):s,
    updateView(stack, setAttr<View>('editable', true)),
    setAttr<State>('editable', stack),
    s=>log('setEditable', s),
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
  
  const r = root(child(['me'], 'hello #link\nnl'), child(['link'], 'world #aka\nalso #akb'), child(['aka'], 'aka'))

  const s = {
    root:r,
    pageState:createView(r, [['me']]),
    editable:[]
  }

  const show = chain(

    s=>setAttr<State>('pageState', render(s.pageState))(s),
    s=>{
      const parseEventStack = (e:Event):ID[]|undefined=>
        (e.target instanceof HTMLElement && e.target.classList.contains('stack'))?
        JSON.parse(e.target.id) as ID[]
        :undefined

      const listnr = htmlElement('div', '', ['eventListeners', {
        click: (e:Event)=>{
          const stack = parseEventStack(e)
          if (!stack) return
          const t = e.target as HTMLElement
          if (t.classList.contains('link')){
            show(toggleLink(stack, linkpath((e.target as HTMLElement).textContent!))(s))   
          }else if (t.classList.contains('line')){
            if (!(getView(s, stack)as LineView).editable)show(setEditble(stack)(s))
          }
        },
        input: (e:Event)=>{
          const stack = parseEventStack(e)
          if (!stack) return
          if ((e.target as HTMLElement).classList.contains('line')){

            const newtext = (getView(s, stack) as LineView).element!.textContent!
            chain(
              updateView<LineView>(stack, setAttr<LineView>('content', newtext)),
              show
            )(s)
          }
        },
      }],['children', [s.pageState.element!]], ['id', 'eventListener'])

      putHTML(listnr)
      log("listnr",listnr)
      return s
    }

  )

  {
    chain(
      s=>{
        console.log('test view')

        const mev = createView(s.root, [['me']])
        assertEq(mev.open.length, 2, 'createView')
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
        const el = render(op.pageState).element!
        assertEq(el.children[0].tagName, 'H2', 'render')
        assertEq(el.children[1].children[0].children[0].tagName, 'SPAN', 'render')
        assertEq(el.children[1].children[0].children[0].textContent, "hello #link", 'render')
      },
      show
    )(s)
  }
}
