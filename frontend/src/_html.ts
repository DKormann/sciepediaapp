type htmlKey = 'innerText'|'onclick'|'children'|'class'|'id'|'contentEditable'

export const htmlElement = (tag:string, text:string, ...args:[htmlKey, any][]):HTMLElement =>{
  const _element = document.createElement(tag)
  _element.innerText = text

  args.forEach(([key, value])=>{
    if (key==='children'){
      (value as HTMLElement[]).forEach(c=>_element.appendChild(c))
    }else if (key==='class'){
      _element.setAttribute('class', value)
    }else{
      _element[key] = value
    }
  })
  return _element
}

