FunScript: pure functional script language similar to JS

## stuff that is like JS:

- arrow functions
- function calling
- numbers & strings
- arrays & objects
- if else shorthand with `? :`

```javascript
console.log("Hello, world!")
```

```javascript
x = 22 + 33;
arr = [x, 1, 3];
obj = {a: 1, b: 2};
```

```javascript
arrow = (x) => x + 1;
max = (a, b) => a > b ? a : b;
```

## stuff we dont have:

- no `var`, `let`, `const` - all variables are immutable
- no `this` - all functions are pure
- no `for` loops - use recursion instead
- no `if` else - use ? : notation instead
- statements (!) - everything is an expression

## stuff we have that JS doesn't:

- infix variable assigment - you can assign variables in the middle of any expression

```javascript
x = 1;
y = x + 1;
console.log(y);
```

```javascript
obj = {a: 1, mx: 
  q = 33;
  q + 1;
}
```

```javascript
[
  x = get_x();
  y = get_y();
  x + y,

  z = get_z();
  z + 1
] // this array will have to values: x + y and z + 1. x, y and z are local to the array not global
```
