# sciepediaapp

## About
<!-- this is gonna be the sciepedia desktop app + web app -->



interactive code editor and execution

evailable languages:

### funscript

minimal pure functional language
everything is an expression

from JS:
  - we have immutable list and objects 
  - define a function : `(a, b) => a + b`
  - assign a variable: `x = 22 + 33; x`
  - call a function: `func(a, b)`

we dont have:
  - for loops
  - if else
  - mutable state

more information in the [funscript.md](frontend/src/funscript.md) file

### musicscript



## Live Development

frontend is functional style typescript
right now only the frontend part is being developed.

### Frontend

```bash
cd frontend
npm install .
npm run dev
```