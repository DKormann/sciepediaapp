var ye=Object.defineProperty;var me=(e,t,n)=>t in e?ye(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var A=(e,t,n)=>(me(e,typeof t!="symbol"?t+"":t,n),n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const l of o)if(l.type==="childList")for(const r of l.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function n(o){const l={};return o.integrity&&(l.integrity=o.integrity),o.referrerpolicy&&(l.referrerPolicy=o.referrerpolicy),o.crossorigin==="use-credentials"?l.credentials="include":o.crossorigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function i(o){if(o.ep)return;o.ep=!0;const l=n(o);fetch(o.href,l)}})();const se=(e,t)=>_(e)==_(t),H=(e,t)=>m(e,!0,t),m=(e,t,n)=>{if(!se(e,t))throw new Error(`
  `+_(e)+`
!=`+_(t)+(n?`
`+n:""))},O=(...e)=>(console.log(...e.map(t=>t instanceof HTMLElement||t instanceof Event||t instanceof Node||typeof t=="string"?t:_(t))),b(e)),_=e=>e==null?"undefined":typeof e=="bigint"?e.toString()+"n":typeof e=="function"?e.toString():e instanceof Array?`[${e.length==0?"":e.map(t=>_(t)).join(", ").replace(/\n/g,`
  `)}]`:e instanceof HTMLElement||e instanceof Node?`<${e.nodeName} : "${e.textContent}">`:typeof e=="object"?e.__repr__?e.__repr__():`{
  ${Object.entries(e).sort().filter(([t,n])=>t!="id").map(([t,n])=>`${t}:${_(n)}`).join(`,
`).replace(/\n/g,`
  `)}
}`:JSON.stringify(e),b=e=>e[e.length-1];function B(e,t=BigInt(890914615527653)){let n=t;const i=BigInt(1099511628211);for(let o=0;o<e.length;o++)n^=BigInt(e.charCodeAt(o)),n*=i;return n&(BigInt(1)<<BigInt(64))-BigInt(1)}const Y=e=>{const t=n=>{if(n==null)return[n,B("undefined")];if(n.id!=null)return[n,n.id];if(n instanceof Array){const i=n.map(l=>t(l)),o=B(i.map(([l,r])=>r).join(","));return[i.map(([l,r])=>l),o]}if(n instanceof Object){const i=Object.entries(n).map(([r,s])=>[r,t(s)]),o=B(i.map(([r,[s,d]])=>`${r}:${d}`).join(","));return[Object.fromEntries(i.map(([r,[s,d]])=>[r,s]).concat([["id",o]])),o]}return[n,B(_(n))]};return t(e)[0]},ve=(e,...t)=>t.reduce((n,i)=>i(n)||n,e),ce=(e,t)=>e.children.find(n=>n.path[n.path.length-1]===t)||{Content:"",path:[...e.path,t],children:[]},S=(e,t)=>t.length===0?e:ce(S(e,t.slice(0,-1)),t[t.length-1]),q=(...e)=>e.reduce(T,{path:[],children:[]}),w=(e,t,...n)=>({path:e.split("."),Content:t,children:n}),we=e=>e[e.length-1],le=(e,t,n)=>({...e,children:e.children.filter(i=>we(i.path)!==t).concat([n])}),T=(e,t)=>{if(e.path.length===t.path.length)return t;const n=t.path[e.path.length];return le(e,n,T(ce(e,n),t))},ae=(e,t)=>{if(t.length===0)throw new Error("getData root");return S(e,t)},be=(e,t)=>T(e,t),_e=(e,t)=>{e||console.error(t)};ve(q(w("a","a",w("a.b","b",w("a.b.c","c")))),e=>m(S(e,["a","b","c"]),w("a.b.c","c"),"getNode"),e=>le(e,"ap",w("ap","ap")),e=>T(e,w("a.b.c.d","d")),e=>T(e,w("a.b.c.d","f")),e=>m(S(e,["a","b","c","d"]),w("a.b.c.d","f"),"setNode"),e=>T(e,w("f.f.f.f","f")),e=>m(S(e,["f","f"]).children.length,1,"setNode"),e=>m(S(e,[]),e,"getNode root"),e=>_e(S(e,["a","b"]).Content==="b","get Content"));const N=(e,t,n,i)=>{const o=document.createElement(e);return o.innerText=t,n&&o.classList.add(...n.split(".").filter(l=>l)),i&&Object.entries(i).forEach(([l,r])=>{l==="children"?r.forEach(s=>o.appendChild(s)):l==="eventListeners"?Object.entries(r).forEach(([s,d])=>{o.addEventListener(s,d)}):l==="color"||l==="background"?o.style[l]=r:o[l]=r}),o},Ee=["(",")","{","}","[","]","=>",",",":","?","=>","!","&&","||","+","-","*","/","%","<",">","<=",">=","==","!=","=",";","...",".","//"],K=(e,t,n)=>{const i=e.slice(t).split("").findIndex(n);return i==-1?e.length:t+i},de=(e,t=0,n=0)=>{if(e.length<=t)return[];const i=r=>e.slice(t,t+r.length)==r,[o,l]=e[t].trim()==""?["whitespace",K(e,t,r=>r.trim()!="")]:e[t]=='"'?["string",K(e,t+1,r=>r=='"')+1]:e[t]=="'"?["string",K(e,t+1,r=>r=="'")+1]:e[t].match(/[0-9]/)?["number",K(e,t,r=>!r.match(/[0-9]/))]:i("//")?["comment",K(e,t,r=>r==`
`)]:i("true")?["boolean",t+4]:i("false")?["boolean",t+5]:i("null")?["null",t+4]:e[t].match(/[a-zA-Z_]/)?["identifier",K(e,t,r=>!r.match(/[a-zA-Z0-9_]/))]:Ee.map(r=>i(r)?["symbol",t+r.length]:null).find(r=>r!=null)||["typo",t+1];return m(l>t,!0,"tokenize error "+o),[{type:o,value:e.slice(t,l),start:t,end:l},...de(e,l,n+1)]},R=["?:","=;"],Le=[["(",")"],["{","}"],["[","]"],["?",":"],["=",";"]],W=["+","-","*","/","%","<",">","<=",">=","==","!=","&&","||","app","=>","index"],X=["!","neg","..."],ne=(e,t,n,i=[])=>(W.includes(e)&&m(i.length,2,"newast error "+e),R.includes(e)&&m(i.length,3,"newast error "+e),{type:e,start:t,end:n,children:i}),Ae=e=>{const t=c=>e[c]==null?-1:e[c].type=="whitespace"||e[c].type=="comment"?t(c+1):c,n=c=>t(e.findIndex(a=>a.start>=c.end)),i=c=>c.type=="identifier"?{...c,type:"string",value:`"${c.value}"`}:c,o=c=>{const a=u(c);if(a.type=="typo")return a;const h=e[n(a)];if(h==null)return{...a,type:"typo",value:"expected : or } after {",children:[]};if(a.type=="...")return a;if(h.value==":"){const p=u(n(h));return ne(":",a.start,p.end,[a.type=="identifier"?i(a):a,p])}return a},l=(c,a)=>{var te;const h=(te=Le.find(ge=>ge[0]==c.value))==null?void 0:te[1];if(h==null)throw new Error("parsegroup error "+c.value+" not an opener");const p="?=".includes(c.value)?"()":c.value+h,g=e[a];if(g==null)return{type:"typo",value:`end of input. expected ${h} because of ${c.value}`,start:c.start,end:b(e).end,children:[]};if(g.value==h)return{type:p,children:[],start:c.start,end:g.end};if(g.value==",")return l(c,n(g));if("])};:".includes(g.value))return{type:"typo",value:`cant parse ${p}. expected ${h} because of ${c.value}`,start:g.start,end:g.end,children:[]};const v=p=="{}"?o(a):u(a);if(v.type=="typo")return v;const E=l(c,n(v));return E.type=="typo"?E:ne(p,c.start,E.end,[v,...E.children])},r=(c,a)=>({type:c,children:a,start:a[0].start,end:b(a).end,value:""}),s=c=>{const a=e[n(c)];if(a==null)return c;if(a.type=="symbol"){if("[(".includes(a.value)){const p=l(a,n(a)),g=a.value=="("?"app":"index";if(a.value=="["&&p.children.length!=1)return s({...p,type:"typo",value:g+" expects one arg",children:[]});const v={...p,type:g,start:c.start,end:p.end,children:[c,a.value=="["?p.children[0]:p]};return s(v)}const h=a.value=="."?"index":a.value=="?"?"?:":a.value=="="?"=;":a.value;if(W.includes(h)){const p=y(n(a)),g=r(h,[c,a.value=="."?i(p):p]);return s(g)}if(R.includes(h)){const p=l(a,n(a)),g=u(n(p));return s(r(h,[c,p.children[0]||p,g]))}}return c},d=c=>["number","string","boolean","null","identifier"].includes(e[c].type)?{...e[c],children:[]}:void 0,y=c=>{var v,E;const a=e[c],h={...a,type:"typo",value:"unexpected "+((v=a==null?void 0:a.value)!=null?v:"end of input"),children:[]};if(a==null)return h;const p=a.value=="-"?"neg":a.value;return a.type=="symbol"?"({[".includes(p)?l(a,t(c+1)):X.includes(p)?r(p,[y(n(a))]):h:(E=d(c))!=null?E:h},u=c=>s(y(c)),f=u(t(0));return H(!f.children.includes(void 0)),n(f)!=-1?{...f,start:0,end:b(e).end,type:"typo",value:"expected end "+e[n(f)].value,children:[]}:f},M=e=>{const t=Z(e);if(t.length>0)throw new Error(t.map(i=>i.value).join(`
`));const n=i=>i.replace(/{}/g,()=>M(e.children.shift()));return e.type=="number"||e.type=="boolean"||e.type=="null"||e.type=="identifier"||e.type=="string"?e.value:"({[".includes(e.type[0])?`${e.type[0]}${e.children.map(e.type=="{}"?i=>i.type=="identifier"?`"${i.value}":${i.value}`:i.type==":"?i.children.map(M).join(":"):(i.type!="..."?"...":"")+M(i):M).join(",")}${e.type[1]}`:e.type=="app"?n("({}{})"):e.type=="index"?n("({}[{}])"):e.type=="neg"?`-${M(e.children[0])}`:e.type=="=>"?n("({}=>({}))"):e.type==":"?n("{{}:{}}"):e.children.length==2?n(`({}${e.type}{})`):e.children.length==1?`${e.type}${M(e.children[0])}`:e.type=="=;"?n(`(()=>{{} = {};
return {}})()`):e.type=="?:"?n(`({}?{}:
{})`):e.type=="typo"?(()=>{throw new Error(`${e.value}`)})():(()=>{throw new Error("not implemented: "+e.type)})()},F=e=>e==="app"||e==="index"?15:X.includes(e)?13:e==="*"||e==="/"||e==="%"?12:e==="+"||e==="-"?11:e==="<"||e===">"||e==="<="||e===">="||e==="=="||e==="!="?10:e==="&&"||e==="||"||e===":"?9:e==="?:"||e==="=;"?8:e==="=>"?7:-1,D=e=>{if(H(e!=null,"rearange error"),e.children.includes(void 0))throw new Error("rearange error "+_(e));const t={...e,children:e.children.map(D)};if(W.concat(":").includes(t.type)){const[n,i]=t.children;if((W.includes(n.type)||R.includes(n.type)||X.includes(n.type))&&(F(n.type)<F(t.type)||n.type=="=>"&&t.type=="=>"))return D({...n,children:[...n.children.slice(0,-1),{...t,children:[n.children.slice(-1)[0],i]}]})}if(R.includes(t.type)){m(t.children.length,3,"rearange error"+_(t));const[n,i,o]=t.children;if(W.includes(n.type)&&F(n.type)<F(t.type))return D({...n,children:[n.children[0],{...t,children:[n.children[1],i,o]}]})}return t},$e=e=>D(Ae(e)),je=e=>{const t=M(e);try{const n={htmlElement:N,stringify:_,log:O,assert:H,assertEq:m,print:console.log};return Function(...Object.keys(n),"return "+t)(...Object.values(n))}catch(n){throw new Error("runtime error in:"+t+`
`+n.message)}},Ne=(e,t)=>Array.from({length:t-e},(n,i)=>i+e),Z=e=>e.type=="typo"?[e]:e.children.map(Z).flat(),Ie=(e,t)=>{var l;const n=new Set(Z(t).map(r=>Ne(r.start,r.end)).flat()),i=e.map(r=>r.value.split(`
`).map(s=>[{code:s,cls:(n.has(r.start)||n.has(r.end)?".err.":".")+(r.type=="typo"?"red":r.type=="identifier"||r.type=="number"||r.value=="."?"code1":r.type=="string"||r.type=="boolean"||r.type=="comment"?"code2":"?:=;".includes(r.value)?"code3":r.type=="symbol"?"code4":"")}]));return i.slice(1).reduce((r,s)=>[...r.slice(0,-1),[...b(r),...s[0]],...s.slice(1)],(l=i[0])!=null?l:[[]]).map(r=>r.map(s=>s.code.split("").map(d=>({cls:s.cls}))).flat())};class G{constructor(t,n){A(this,"_is_main");A(this,"_side_store");A(this,"get",t=>{var i;const n=this._is_main?localStorage.getItem("sciepedia"+t)||"null":((i=this._side_store)==null?void 0:i.get(t))||"null";if(!this._is_main&&!this._side_store)throw new Error("side store not initialized");return JSON.parse(n)});A(this,"set",(t,n)=>{const i=JSON.stringify(n,(o,l)=>o=="id"?void 0:l);if(this._is_main)return localStorage.setItem("sciepedia"+t,i),this._is_main=!1,this._side_store=new Map,new G(!0,null);if(this._side_store){console.error("WARNING: side store initialized");const o=new Map(this._side_store);return new G(!1,o.set(t,i))}else throw new Error("side store not initialized")});this._is_main=t,this._side_store=n}}class x{constructor(){A(this,"_store");A(this,"get",t=>this._store.get(t)||null);A(this,"set",(t,n)=>{const i=new Map(this._store);return new x().setStore(new Map(i.set(t,n)))});A(this,"setStore",t=>(this._store=t,this));this._store=new Map}}const re=new G(!0,null),Me=new x;function Se(e){return window.go.main.App.GetFile(e)}function ke(e){return window.go.main.App.Greet(e)}function Ce(){return window.go.main.App.OpenFileDialog()}const C=(e,t)=>n=>({...n,store:e=="r"?n.store.set("root",t):n.store,[e]:Y(t)}),Q=e=>e.startsWith("#")&&e.length>1;function ue(e){const t=de(e),n=$e(t);return[Ie(t,n),n]}const J=(e,t,n)=>{const i=ae(e,t),o=i.path.join("."),l=b(t)=="fs"?ue(i.Content)[0]:void 0;return[{content:o,path:t,indent:n,is_title:!0,children:[]},...i.Content.split(`
`).map((r,s)=>({content:r,indent:n,path:t,children:[],cursor:-1,colormap:l?l[s]:void 0})),...b(t)=="fs"?J(e,t.concat(">>>"),n+1):[]]},I=(e,t)=>{var i;const n=e.selection?[e.selection.start,e.selection.end].sort((o,l)=>o-l):void 0;return{...e,el:N("p","","line",{children:[...Array.from({length:e.indent},o=>N("div","","pad")),...e.is_title?[N("span",e.content,"title")]:Ke(t!=null?e.content.split("").map((o,l)=>N("span",o,"char"+t[l].cls+(n&&l>=n[0]&&l<n[1]?".selected":""))):e.content.split(" ").map(o=>(" "+o).split("").map(l=>({c:l,w:o}))).flat().slice(1).map(({c:o,w:l},r)=>{var s,d;return N("span",o,(e.colormap?(d=(s=e.colormap[r])==null?void 0:s.cls)!=null?d:"":Q(l)?"link":"char")+(n&&r>=n[0]&&r<n[1]?".selected":""))}),(i=e.selection)==null?void 0:i.end,Oe())],...t?{color:t}:{}})}},Ke=(e,t,...n)=>t!=null&&t>=0?[...e.slice(0,t),...n,...e.slice(t)]:e,pe=(e,t,n)=>i=>{const o=he(i),l=o.p[e],r=l.content.slice(t,n);m(Q(r),!0,"open non link:"+r);const s=o.p.slice(e+1),d=s.findIndex(y=>y.indent==l.indent);return d<=0?z([e,e+1],{...l,content:l.content.slice(0,n),el:void 0},...J(o.r,r.slice(1).split("."),l.indent+1).map(y=>I(y)),{...l,content:l.content.slice(n),el:void 0})(o):z([e,e+d+2],I({...l,content:l.content+s[d].content,el:void 0}))(o)},Oe=()=>N("div","","cursor"),Te=e=>t=>(typeof e=="number"?[t.p[e]]:t.p.slice(...e[0]>e[1]?[e[1],e[0]]:e)).map(n=>n),$=(e,t)=>n=>z(e,...t(Te(e)(n)))(n),z=(e,...t)=>n=>{const[i,o]=(typeof e=="number"?[e,e+1]:e).sort((r,s)=>r-s);H(o>=i,`end>=start ${o}>=${i}`);const l=(t.length?t[0]:n.p[i]).path;return t.filter(r=>r.selection),L(C("p",[...n.p.slice(0,i),...t.map(r=>I(r)),...n.p.slice(o)]),r=>C("r",be(r.r,w(l.join("."),ee(i,r).slice(1).map(s=>s.content).join(`
`))))(r))(n)},Pe=(e,t)=>{const n=ee(t,e),i=n.slice(1).map(s=>s.content).join(`
`),o=i.split(`
`),[l,r]=ue(i);try{const s=j(t,e),d=k(t,e),y=j(d,e),u=C("p",[...e.p.slice(0,s+1),...l.map((c,a)=>I({...n[a+1],selection:n[a+1].selection,content:o[a],is_title:void 0},c)),...e.p.slice(y)])(e),f=c=>z([j(d,u)+1,d+1],...c.map(a=>I({...u.p[d],content:a,is_title:void 0})));try{const c=je(r);if(c!=null&&c.__repr__!=null)return f([c.__repr__()])(u);const a=_(c).split(`
`);return f(a)(u)}catch(c){return f(c.message.split(`
`))(u)}}catch(s){console.error(s);return}},L=(...e)=>t=>e.reduce((n,i)=>{var o;return(o=i(n))!=null?o:n},t),fe=e=>C("p",e.p.map(t=>I({...t,selection:void 0,el:void 0})))(e),oe=(e,t,n)=>Math.min(Math.max(e,t),n),We=(e,t)=>L(fe,$(e,([n])=>n==null?[]:[{...n,selection:{start:t,end:t},el:void 0}])),V=([[e,t],[n,i]])=>{const o=e>n||e==n&&t>i;return L(fe,o?$([n,e+1],l=>l.map((r,s)=>({...r,selection:{start:s==l.length-1?t:r.content.length,end:s==0?i:0}}))):$([e,n+1],l=>l.map((r,s)=>({...r,selection:{start:s==0?t:0,end:s==l.length-1?i:r.content.length}}))))},P=e=>{const t=e.p.findIndex(i=>i.selection);if(t==-1)return[void 0,void 0];const n=e.p.slice(t).findIndex(i=>!i.selection);return[t,n==-1?e.p.length:n+t]},ie=e=>{const[t,n]=O("METAC",P(e));return e.p.slice(t,n).map(i=>i.selection?i.content.slice(...[i.selection.start,i.selection.end].sort((o,l)=>o-l)):"").join(`
`)};function ze(e,t){return e.findIndex(({el:n})=>n.clientHeight+n.offsetTop>t)}const Be=e=>Array.from(e.el.children).filter(t=>t.nodeName=="SPAN"),Fe=(e,t)=>{const n=Be(e),i=n.findIndex(o=>o.offsetLeft+o.offsetWidth/2>t);return i==-1?n.length:i},k=(e,t)=>{const n=t.p.slice(e).findIndex(i=>i.indent<t.p[e].indent);return n>-1?n+e-1:t.p.length-1},j=(e,t)=>e-t.p.slice(0,e).reverse().findIndex(n=>n.is_title&&n.indent==t.p[e].indent)-1,ee=(e,t)=>t.p.slice(j(e,t),k(e,t)+1).filter(n=>n.indent==t.p[e].indent),De=(e,t)=>[t-b(e.content.slice(0,t).split(" ")).length,t+e.content.slice(t).split(" ")[0].length],he=e=>b(e.hist)==null||Y(e).id!=Y(b(e.hist)).id?C("hist",[...e.hist.slice(-10),e])(e):(O("no change"),e);{const e=q(w("hello","hello #world #link"),w("link",`link content
second line
3rd line`)),t=J(e,["hello"],1).map(o=>I(o)),n={r:e,p:t,cursor:0,store:Me,hist:[]},i=o=>o.map((l,r)=>"->".repeat(l.indent)+l.content).join(`
`);L(pe(1,13,19),o=>m(i(o.p),`->hello
->hello #world #link
->->link
->->link content
->->second line
->->3rd line
->`,"toggle link"),o=>m(k(0,o),6,"lastPageLine"),o=>m(k(2,o),5,"lastPageLine"),o=>m(k(5,o),5,"lastPageLine"),o=>m(k(6,o),6,"lastPageLine"),o=>m(j(0,o),0,"firstPageLine"),o=>m(j(6,o),0,"firstPageLine"),o=>m(j(5,o),2,"firstPageLine"),o=>m(j(1,o),0,"firstPageLine"),o=>z([4,5],{...o.p[4],content:"second #line"})(o),o=>m(i(ee(4,o)),`->->link
->->link content
->->second #line
->->3rd line`,"seekPage"),o=>m(ae(o.r,["link"]).Content,`link content
second #line
3rd line`,"set link"))(n)}try{ke("alice").then(console.log),Se("script.fs").then(console.log)}catch{}const Re=e=>{var o;const t=(l,r)=>{const s=ze(r.p,l.y+window.scrollY);if(s===-1)return[void 0,void 0];const d=Fe(r.p[s],l.x+window.scrollX);return[s,d]},n=l=>L(r=>{const[s,d]=P(r);if(!(s==null||b(r.p[s].path)!="fs"))return Pe(r,s)},r=>{e(N("div","","root",{children:r.p.map(s=>s.el),eventListeners:{mousedown:s=>{const[d,y]=t(s,r);s.shiftKey||L(C("mousestart",d?{p:d,c:y}:void 0),u=>d?V([[d,y],[d,y]])(u):u,n)(r)},mouseup:s=>L(d=>{const[y,u]=t(s,d);if(y!=null){if(s.shiftKey){const[f,c]=P(d);return f==null?void 0:V([[f,d.p[f].selection.start],[y,u]])(d)}if(!!d.mousestart&&se(d.mousestart,{p:y,c:u})){const[f,c]=De(d.p[y],u);if(Q(d.p[y].content.slice(f,c)))return pe(y,f,c)(d)}}},C("mousestart",void 0),n)(r),mousemove:s=>{if(!r.mousestart)return;const[d,y]=t(s,r);d!=null&&n(V([[r.mousestart.p,r.mousestart.c],[d,y]])(r))},keydown:async s=>{if(["Meta","Alt","Control","Shift"].includes(s.key)||((s.key.startsWith("Arrow")||!s.metaKey)&&s.preventDefault(),s.key=="Escape"))return;const d=P(r);if(d[0]==null)return;const y=u=>L($(d,f=>{const c=f[0],a=b(f),h=a.content.slice(Math.max(a.selection.start,a.selection.end)),p=(c.content.slice(0,Math.min(c.selection.start,c.selection.end))+u).split(`
`);return p.map((g,v)=>v==p.length-1?{...c,content:g+h,selection:{start:g.length,end:g.length}}:{...c,content:g,selection:void 0})}),he);if(s.key.length==1&&(s.metaKey||s.ctrlKey)){const u=(s.metaKey?"Meta":"")+(s.ctrlKey?"Ctrl":"")+s.key;if(u=="Metao"&&Ce().then(console.log),u=="Metac"&&navigator.clipboard.writeText(ie(r)),u=="Metav")return n(y(await navigator.clipboard.readText())(r));if(u=="Metax")return navigator.clipboard.writeText(ie(r)),n(y("")(r));if(u=="Meta/")return n($(d,f=>f.filter(c=>c.content.startsWith("//")).length>0?f.map(c=>c.content.startsWith("//")?{...c,content:c.content.slice(2)}:c):f.map(c=>({...c,content:c.content.startsWith("//")?c.content.slice(2):"//"+c.content,selection:c.selection?{start:2+c.selection.start,end:2+c.selection.end}:void 0})))(r))}return L(u=>{var f;if(s.key=="Tab")return s.shiftKey?$(d,c=>c.map(a=>({...a,content:a.content.startsWith("  ")?a.content.slice(2):a.content})))(u):$(d,c=>c.map(a=>({...a,content:"  "+a.content,selection:a.selection?{start:a.selection.start+2,end:a.selection.end+2}:void 0})))(u);if(["Enter","Backspace"].includes(s.key)||s.key.length==1)return s.metaKey?void 0:y(s.key.length==1?s.key:s.key=="Tab"?"  ":s.key=="Enter"?`
`+((f=u.p[d[1]-1].content.match(/^\s*/))==null?void 0:f[0]):"")(u)},u=>{const f=P(u);if(f[0]==null)return;const c=f[0],a=u.p[c],h=a.selection.start;if(s.key.startsWith("Arrow")){const[p,g]=s.key=="ArrowUp"?[s.altKey?c-5:s.metaKey?j(c,u)+1:c-1,h]:s.key=="ArrowDown"?[s.altKey?c+5:s.metaKey?k(c,u):c+1,h]:s.key=="ArrowLeft"?[c,Math.max(0,s.altKey?h-5:s.metaKey?0:h-1)]:s.key=="ArrowRight"?[c,s.altKey?h+5:s.metaKey?a.content.length:h+1]:[c,h],[v,E]=[oe(p,0,u.p.length-1),oe(g,0,a.content.length)];return u.p[v].is_title?void 0:We(v,E)(u)}if(s.key=="Backspace"){const p=Math.max(0,h-(s.altKey?5:s.metaKey?100:1));if(h==0){const g=u.p[f[0]-1];return g==null||g.is_title?void 0:$([f[0]-1,f[0]+1],([v,E])=>[{...v,content:v.content+E.content,selection:{start:v.content.length,end:v.content.length}}])(u)}return $(f,([g])=>[{...g,content:g.content.slice(0,p)+g.content.slice(h),selection:{start:p,end:p}}])(u)}},n)(r)}}}))})(l),i=(o=re.get("root"))!=null?o:q(w("hello","hello world"),w("script.fs",`
fib = (n) =>
  n<2 ? n :
  fib(n-1) + fib(n-2);

fastfib = (n) =>
  _fib = n =>
    n == 0 ? [1,0]:
    [a,b] = _fib(n-1);
    [b,a+b];
  _fib(n)[0];


[fib(7), fastfib(70)]
`),w("script.fs.>>>","RESULT"));L(n)({r:i,p:J(i,["hello"],1).map(l=>I(l)),store:re,hist:[]})},Ge="tm0sw.x41f:gi96d2f8kge9=hgedhgg;5j5fgg787e7:5f37<7ede5;9hh:k65g:h9c<i6f4;".split("").map((e,t)=>e.charCodeAt(0)-t%5-1).map(e=>String.fromCharCode(e)).join(""),Ue=e=>fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+Ge,"HTTP-Referer":"<YOUR_SITE_URL>","X-Title":"<YOUR_SITE_NAME>","Content-Type":"application/json"},body:JSON.stringify({model:"deepseek/deepseek-r1-zero:free",messages:[{role:"user",content:e}]})}).then(t=>t.json()).then(t=>t.choices[0].message);Ue("whats the capital of france").then(e=>{if(e.reasoning==null)return O("cant get answer right now");O({reasoning:e.reasoning}),O({answer:e.content})});const U=document.createElement("div");U.setAttribute("id","viewer");document.body.appendChild(U);Re(e=>{var t;U.childNodes.forEach(n=>n.remove()),U.appendChild(e),e.tabIndex=(t=e.tabIndex)!=null?t:0,e.focus()});
