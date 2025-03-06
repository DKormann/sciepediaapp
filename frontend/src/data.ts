
export type Path = string[]
import { log } from "./helpers"

export type Root = {
  path:[],
  children:Child[]
}

export type Child = {
  path:Path,
  Content:string,
  children:Child[]
}

const s = "sdlkfj"

type ND = Root|Child
type Step = (root:Root)=>Root|void
const chain = (root:Root, ...steps:Step[]):Root => steps.reduce((state, step) => step(state) || state, root) 

export const getChild = (parent:Root|Child, title:string):Child =>
  parent.children.find(c=>c.path[c.path.length-1] === title) || {Content:'', path: [...parent.path, title], children: []}

export const getNode = (root:Root, path:Path):Child|Root =>{
  if (path.length === 0){
    return root
  }
  return getChild(getNode(root, path.slice(0,-1)), path[path.length-1])
}

export const root = (...children:Child[]):Root =>
  children.reduce(setNode, {path:[], children:[]} as Root)


export const child = (path:string, Content:string,...children:Child[]):Child=> 
  ({path:path.split(".") as Path, Content, children})

const displayNode = (node:Root|Child):string => {
  const childrep = node.children.length?'  \n'+node.children.map(displayNode).join(',\n').replace(/\n/g, '\n  '):''
  if (node.path.length === 0){
    return `root(${childrep})`
  }else{
    const n = node as Child
    return `child("${n.path.join('.')}", ${JSON.stringify(n.Content)}, ${childrep})`
  }
}

const last = <T>(arr:T[]):T => arr[arr.length-1]

export const setChild = <T extends ND>(parent:T, title:string, child:Child):T => {
  return {
    ...parent,
    children: parent.children.filter(c=>last(c.path) !== title).concat([child])
  }
}

export const setNode = <T extends ND>(root:T, node:Child):T=>{
  if (root.path.length === node.path.length) return node as T
  const title = node.path[root.path.length]
  return setChild(root, title, setNode(getChild(root, title), node))
}

export const getData = (root:Root, path:Path) => {
  if (path.length === 0) throw new Error('getData root')
  return getNode(root, path) as Child
}
export const setData = (r:Root, n:Child)=>{
  const res = setNode(r, n)
  return res
}

// @ts-ignore
const print = (node:Root|Child) => console.log(displayNode(node))

const assert = (condition:boolean, message:string) => {
  if (!condition) console.error(message)
}

import { assertEq } from "./helpers"

{
  chain(
    root(child('a', 'a',  child('a.b', 'b', child('a.b.c','c')))),

    // r=>assertEq(r, eval(displayNode(r)) as Root, 'display'),
    r=>assertEq(getNode(r, ['a', 'b', 'c']), child('a.b.c', 'c'), 'getNode'),
    r=>setChild(r, 'ap', child('ap', 'ap')),
    r=>setNode(r, child('a.b.c.d', 'd')),
    r=>setNode(r, child('a.b.c.d', 'f')),
    r=>assertEq(getNode(r, ['a', 'b', 'c', 'd']), child('a.b.c.d', 'f'), 'setNode'),
    r=>setNode(r, child('f.f.f.f', 'f')),

    r=>assertEq(getNode(r, ['f','f']).children.length, 1, 'setNode'),

    r=>assertEq(getNode(r, []), r, 'getNode root'),
    r=>assert((getNode(r, ['a', 'b']) as Child ).Content === 'b', 'get Content'),
  )
}
