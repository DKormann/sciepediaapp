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


### tradeoffs:
- you dont need curly braces for anything except objects
- semicolons specifically for variable assignment
- code becomes dense but concise
- no implicit control flow
- no mutable states
- no monads (yet?)


### example:

```javascript

// fibonacci

fib = n => 
  n < 2 ?
  n :
  fib(n - 1) + fib(n - 2);

_ = console.log(fib(10));

fast_fib = n => 
  _fib = (a, b, n) =>
    n == 0 ?
    a :
    _fib(b, a + b, n - 1);
  _fib(0, 1, n);

console.log(fast_fib(100))


```