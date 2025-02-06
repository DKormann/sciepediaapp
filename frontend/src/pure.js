"use strict";
// console.log(22)
Object.defineProperty(exports, "__esModule", { value: true });
exports.ids = void 0;
// type State = {[key:string]:any}
// const state: State = {}
// type Update = (s:State) => State
// const letin = (obj: {[key:string]:any}):Update =>s=>({...s,...obj})
exports.ids = new WeakMap();
var id = function (obj) {
    if (exports.ids.has(obj))
        return exports.ids.get(obj);
    var newid = Math.random().toString(36).slice(2);
    exports.ids.set(obj, newid);
    return newid;
};
// console.log(id({a:1}));
// console.log(id({a:1}));
print(22);
