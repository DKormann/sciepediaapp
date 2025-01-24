
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
  editable:boolean
}

type LineView = {
  type:'line'
  stack:ID[]
  element?:HTMLElement
  open: PageView[]
  content:string
}

type ID = Path|number

type View = LineView|PageView

type State = {
  pageState:PageView
  root:Root
  selection?:{node:ID[], offset:number}
}

const islink = (s:string) => s.startsWith('#')
const linkpath = (s:string) => s.slice(1).split('.')

const stack=(...x:(string| number)[])=>
  x.map(x=>typeof x === 'number'?x:linkpath(x))

assertEq(stack('#me'), [['me']], 'stack')
assertEq(stack('#me',0,'#link.other'), [['me'], 0, ['link','other']], 'stack')

const log=<T>(tag:string, t:T, ...x:any[])=>
  (t instanceof HTMLElement || t instanceof Event || t instanceof Node
    ? console.log(tag,t,...x) : console.log(tag,":",[t,...x].map(x=>stringify(x)).join(' ')), t)
  

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
    editable: false,
    open: lines.map((l,i)=>({
      id:i,
      type:'line',
      stack:[...stack, i],
      content:l,
      open: [],
    }))
  }
}

const last = <T>(arr:T[]):T => arr[arr.length-1]

const getID = (v:View)=>last(v.stack) 

const pageHTML = (page:PageView):HTMLElement=>
  element('div', page.stack, '', 'page', {
    children:[
      element('h2', page.stack, (getID(page) as Path).join('.'), 'head'),
      element('div', page.stack, '', 'body', {children:page.open.map(l=>l.element), contentEditable:page.editable}),
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
      }),
      ...line.open.map(p=>p.element!)
    ]
  })

const deepWalk = (v:View, fn:(v:View)=>View):View =>fn({...v, open:v.open.map(p=>deepWalk(p, fn)) } as View)
const render = (v:View)=>{
  const res = deepWalk(v,(v:View):View=>({...v, element:v.type === 'line'?lineHTML(v):pageHTML(v)}))
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


type Tree<T> = {value:T, children?:Tree<T>[]}
const treeMap = <T,U> (f:(t:T)=>U, t:Tree<T>):Tree<U> =>
  ({value:f(t.value), children:t.children?.map(c=>treeMap(f,c))})
const treeFilter = <T> (f:(t:T)=>boolean, t:Tree<T>):Tree<T> =>
  ({value:t.value, children:t.children?.map(c=>treeFilter(f,c))?.filter(c=>f(c.value))})
const flatten = <T> (t:Tree<T>):T[] =>
  t.children==undefined?[t.value]:[...t.children.map(flatten)].flat()


function getHTMLText(node:Node):string{
  if (node instanceof Text) return node.textContent!
  if (node instanceof HTMLBRElement) return '\n'
  if (node instanceof HTMLParagraphElement) return '\n'+Array.from(node.childNodes).map(getHTMLText).join('')
  return Array.from(node.childNodes).map(getHTMLText).join('')
}


export const view = (putHTML:(el:HTMLElement)=>void) => {
  
  const r = root(child(['me'], 'hello #link\nnl'), child(['link'], 'world #aka\nalso #akb #link'), child(['aka'], 'aka'))

  const s = {
    root:r,
    pageState:createView(r, [['me']]),
    editable:[]
  }

  const show = chain(

    s=>setAttr<State>('pageState', render(s.pageState))(s),
    // s=>log('show',s),
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
            const pagestack = stack.slice(0,-1)
            if (!(getView(s, pagestack)as PageView).editable)show(setEditble(pagestack)(s))
          }
        },
        input: (e:InputEvent)=>{
          console.log('input', e)
          const stack = parseEventStack(e)
          if (!stack) return
          if ((e.target as HTMLElement).classList.contains('body')){

            const page = getView(s, stack) as PageView
            const pageText = page.element!.childNodes[1]!
            const ptext = getHTMLText(pageText).slice(pageText.childNodes[0]! instanceof HTMLParagraphElement?1:0)

            const flatten = (node:ChildNode):Text[]=>{
              if (node instanceof Text) return [node]
              if (node instanceof HTMLBRElement) return [new Text('\n')]
              return Array.from(node.childNodes).map(flatten).flat()
            }

            const fl = flatten(pageText)
            const sel = window.getSelection()!
            const nodeidx = fl.findIndex(t=>t==sel.anchorNode)
            const cursorn = fl.slice(0,nodeidx).map(t=>t.textContent).join('').length + sel.anchorOffset
            chain(
              setAttr<State>('selection', {node:page.stack, offset: cursorn}),
              setAttr<State>('root', setData(s.root, {...getData(s.root, log('path',getID(page) as Path)), Content:log('ptext',ptext)})),
              s=>{return setView(page.stack, setAttr<PageView>('editable', true)(createView(s.root, page.stack)))(s)},
              show
            )(s)
          }
        },
      }],['children', [s.pageState.element!]], ['id', 'eventListener'])
      putHTML(listnr)
      return s
    },

    s=>{
      if(s.selection==undefined)return
      const v = getView(s, s.selection.node) as PageView
      if (v === undefined) return
      const fl = (node:ChildNode):Text[]=>{
        if (node instanceof Text) return [node]
        return Array.from(node.childNodes).map(fl).flat()
      }
      const fls = fl(v.element!.childNodes[1]!)
      const [prevcount,ndx] = fls.reduce(([c, res], t, i)=>{
        if (res>=0) return [c,res]
        const cc = c+t.textContent!.length
        if (cc>=s.selection!.offset) return [c, i]
        return [cc, -1]
      }, [0,-1] )

      const anchor = fls[ndx]
      const anchorOffset = s.selection.offset - prevcount
      log('selection', anchor, anchorOffset, document.contains(anchor))
      anchor.parentElement!.focus()
      window.getSelection()!.collapse(anchor, anchorOffset)
      console.log(window.getSelection());
    },
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
