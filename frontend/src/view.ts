
// @ts-ignore
import {Root as Root, getData, setData, Child, Path, root, child} from './data'
import { htmlElement, htmlKey } from './_html'

import { assertEq, comp, log, last, LastT, stringify, setAttr} from './helpers'

type PageView = {
  type:'page'
  stack:PageStack
  element?:HTMLElement
  open : LineView[]
  editable:boolean
}

type LineView = {
  type:'line'
  stack:LineStack
  element?:HTMLElement
  open: PageView[]
  content:string
}

type ID = Path|number

type stack = ID[]
type PageStack = LastT<ID, Path>
type LineStack = LastT<ID, number>

type View = LineView|PageView

export type State = {
  pageState:PageView
  root:Root
  selection?:{node:ID[], offset:number}
  editable:ID[]
}

const islink = (s:string) => s.startsWith('#') && s.length > 1
const linkpath = (s:string) => s.slice(1).split('.')

const stack=(...x:(string| number)[])=>
  x.map(x=>typeof x === 'number'?x:linkpath(x))

assertEq(stack('#me'), [['me']], 'stack')
assertEq(stack('#me',0,'#link.other'), [['me'], 0, ['link','other']], 'stack')


const createView=(r:Root, stack:PageStack):PageView => {
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

const getID = (v:View)=>last(v.stack as LastT<ID, ID>)

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
        line.content == ''?[element('br',line.stack, '', 'line')]:
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

const getChild = (v:View|undefined, id:ID): View|undefined=>
  (v?.open as View[]).find(v=>comp(getID(v), id))
const getView = (s:State, stack:ID[])=> {
  if (stack.length === 0 || !comp(s.pageState.stack[0],stack[0])) return undefined
  return stack.slice(1).reduce(getChild, s.pageState)
}

const updateView=<T extends View>(stack:ID[], fn:(v:T)=>T):Update => s=>setView(stack, fn(getView(s, stack) as T))(s)

const openLink= (stack:PageStack):Update=>s =>updateView<LineView>(stack.slice(0,-1), (ln:LineView)=>({
  ... ln, open: ln.open.concat(createView(s.root, stack)) }))(s)


const toggleLink = (stack:ID[], path:Path) :Update=>s=> updateView<LineView>(stack, ln=>({
  ... ln,
  open: (ln.open.find(v=>comp(getID(v), path))?
  ln.open.filter(v=>!comp(getID(v), path)):
  ln.open.concat(createView(s.root, [...stack, path])))
}))(s)


type Fn <T,U> = (t:T)=>U
type Step <T> = Fn<T,T>
type Update = Step<State>

const _if = <T>(cond:Fn<T,boolean>, then:Step<T>|Step<T>[], els:Step<T>|Step<T>[]=s=>s):Fn<T,T> => t=>{
  const red = (t:T, f:Step<T>|Step<T>[])=>f instanceof Array?f.reduce((t,f)=>f(t), t):f(t)
  return cond(t)?red(t, then):red(t, els)
}

const cc = <T>(...f:Step<T>[]):Step<T> => t=>f.reduce((t,f)=>f(t), t)

const setViewAttr = (stack:ID[], key:string, val:any) => updateView(stack, setAttr<View>(key, val))
const setEditble = (stack:ID[])=>
    cc<State>(
    _if(s=>s.editable.length>0, s=>setViewAttr(s.editable, 'editable', false)(s)),
    setAttr<State>('editable', stack),
    _if(_=>stack.length>0, [
      updateView(stack, (v:PageView)=>({...v, open:v.open.map(l=>({...l, open:[]}))})),
      setViewAttr(stack, 'editable', true), 
    ]),
  )

const _setView=<T extends View>(r:Root, parent:T, stack:ID[], view:View):T => {
  if (stack.length === 0) return view as T
  const open = parent.open.map(v=>comp(getID(v), stack[0])?_setView(r, v as T, stack.slice(1), view):v)
  return {...parent,open}
}

const setView = (stack:ID[], view:View):Update=>
 s=> setAttr<State>('pageState', _setView(s.root, s.pageState, stack.slice(1), view))(s)

const chain = cc<State>;


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
  if (node instanceof HTMLParagraphElement) {
    if (node.children.length === 1 && node.children[0] instanceof HTMLBRElement) return '\n'
    if (node.textContent?.trim() === '') return '\n'
    return '\n'+Array.from(node.childNodes).map(getHTMLText).join('')
  }
  return Array.from(node.childNodes).map(getHTMLText).join('')
}
import { sanitizeText } from './editing'
export const view = (putHTML:(el:HTMLElement)=>void) => {
  
  const r = root(child(['me'], 'hello #link\nnl'), child(['link'], 'world #aka\nalso #akb #link'), child(['aka'], 'aka'))

  const s = {
    root:r,
    pageState:createView(r, [['me']]),
    editable:[]
  }



  const flatten = (node:ChildNode):{el:ChildNode, t:string}[]=>{
    if (node instanceof Text) return [{el:node, t:node.textContent!}]
    if (node instanceof HTMLBRElement) return [
      {el:node, t:''}
    ]
    const cres = Array.from(node.childNodes).map(flatten).flat()
    return (node instanceof HTMLParagraphElement)? [{el:node,t:'\n'}, ...cres]:[{el:node,t:''}, ...cres]
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
          const pagestack = stack.slice(0,-1)
          if (t.classList.contains('link')){
            cc(
              setEditble([]),
              toggleLink(stack, linkpath(t.textContent!)),
              show
            )(s)
          }else if (t.classList.contains('line')){
            if (!(getView(s, pagestack)as PageView).editable)show(setEditble(pagestack)(s))
          }
        },

        paste: (e:ClipboardEvent)=>{
          e.preventDefault()
          log(e.clipboardData?.getData('text'))
          log(e.target)

          const stack = parseEventStack(e)
          log(stack)
        },
        input: (e:InputEvent)=>{

          const stack = parseEventStack(e)
          if (!stack) return

          if (e.inputType == 'insertFromPaste') e.preventDefault()

          if ((e.target as HTMLElement).classList.contains('body')){

            const page = getView(s, stack) as PageView
            const pageText = page.element!.childNodes[1]!
            const ptext = getHTMLText(pageText).slice(pageText.childNodes[0]! instanceof HTMLParagraphElement?1:0)

            const fl = flatten(pageText)
            const sel = window.getSelection()!
            const nodeidx = fl.findIndex(t=>t.el==sel.anchorNode)
            if (nodeidx === -1) console.error('nodeidx', sel.anchorNode, fl);

            const cursorn = fl.slice(0,nodeidx).map(t=>t.t).join('').length + sel.anchorOffset
            if(e.inputType == 'deleteContentBackward') return

            cc(
              s=>({
                ...s,
                selection:{node:page.stack, offset: cursorn},
                root:setData(s.root, {...getData(s.root, getID(page) as Path), Content:ptext}),
              }),
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
      if(s.selection==undefined)return s
      const v = getView(s, s.selection.node) as PageView
      if (v === undefined) return s
      const fl = (node:ChildNode):Text[]=>{
        if (node instanceof Text) return [node]
        return Array.from(node.childNodes).map(fl).flat()
      }

      const fls = flatten(v.element!.childNodes[1]!)
      const [prevcount,ndx] = fls.reduce(([c, res], t, i)=>{
        if (res>=0) return [c,res]
        const cc = c+t.t.length
        if (cc>=s.selection!.offset) return [c, i]
        return [cc, -1]
      }, [0,-1] )

      const anchor = fls[ndx].el
      const anchorOffset = anchor.nodeName === 'P'?0: s.selection.offset - prevcount
      anchor.parentElement?.focus();
      window.getSelection()!.collapse(anchor, anchorOffset)
      return s
    },
  )

  {
    chain(
      s=>{
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
        return s
      },
      show
    )(s)
  }
}
