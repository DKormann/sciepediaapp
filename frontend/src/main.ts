
import "./style.css"
import { createView } from "./view"


const viewer = document.createElement('div')
viewer.setAttribute('id', 'viewer')
document.body.appendChild(viewer)


createView((el:HTMLElement)=>{
  viewer.childNodes.forEach(c=>c.remove())
  viewer.appendChild(el)
  el.tabIndex = el.tabIndex ?? 0
  el.focus()
})

// import "./funscript"