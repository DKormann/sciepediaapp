


console.log(22)


type State = {[key:string]:any}
const state: State = {}


type Update = (s:State) => State

const letin = (obj: {[key:string]:any}):Update =>s=>({...s,...obj})


