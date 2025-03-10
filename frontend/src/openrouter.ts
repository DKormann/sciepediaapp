import { log } from "./helpers"

const stringthing = "tm0sw.x41f:gi96d2f8kge9=hgedhgg;5j5fgg787e7:5f37<7ede5;9hh:k65g:h9c<i6f4;".split('').map((c,i)=>c.charCodeAt(0) - (i%5) - 1).map(c=>String.fromCharCode(c)).join('')



const answer = (question:string)=>fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + stringthing,
    'HTTP-Referer': '<YOUR_SITE_URL>', // Optional. Site URL for rankings on openrouter.ai.
    'X-Title': '<YOUR_SITE_NAME>', // Optional. Site title for rankings on openrouter.ai.
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    // model: 'qwen/qwq-32b:free',
    model: "deepseek/deepseek-r1-zero:free",
    messages: [
      {
        role: 'user',
        content: question,
      },
    ],
  }),
}).then(r=>r.json()).then(r=>r.choices[0].message);


answer("whats the capital of france").then(d=>{
  if (d.reasoning == undefined) return log("cant get answer right now")
  log({reasoning: d.reasoning});
  log({answer:d.content})
})




