


// console.log(22)


// type State = {[key:string]:any}
// const state: State = {}


// type Update = (s:State) => State

// const letin = (obj: {[key:string]:any}):Update =>s=>({...s,...obj})


const ids = new WeakMap()

const id = (obj:any):string => {
  if (ids.has(obj)) return ids.get(obj)
  const newid = Math.random().toString(36).slice(2)
  ids.set(obj, newid)
  return newid
}

// console.log(id({a:1}));
console.log(id({a:1}));


export {}