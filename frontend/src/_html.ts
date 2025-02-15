export type htmlKey = 'innerText'|'onclick'|'children'|'class'|'id'|'contentEditable'|'eventListeners'|'style'



export const htmlElement = (tag:string, text:string, cls:string, args?:Partial<Record<htmlKey, any>>):HTMLElement =>{
  const _element = document.createElement(tag)
  _element.innerText = text
  _element.setAttribute('class', cls)
  if (args) Object.entries(args).forEach(([key, value])=>{
    if (key==='children'){
      (value as HTMLElement[]).forEach(c=>_element.appendChild(c))
    }else if (key==='eventListeners'){
      Object.entries(value as Record<string, (e:Event)=>void>).forEach(([event, listener])=>{
        _element.addEventListener(event, listener)
      })
    }else{
      _element[(key as 'innerText' | 'onclick' | 'id' | 'contentEditable')] = value
    }
  })
  return _element
}

