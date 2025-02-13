## compiling simple functional script

fn (a:number) => a + 1
{
e: let a = 1 in
fn(a)
}

## syntax:

type Expression
  = primitive
  | identifier
  | lambda
  | application
  | let
  | if
  | binary
  | unary

type primitive = number | string | boolean | null | undefined

type lambda = {
  params: identifier[],
  body: Expression
}

type let = {
  binding: [identifier, Expression],
  body: Expression
}

type if = {
  condition: Expression,
  then: Expression,
  else: Expression
}

type binary = {
  right: Expression,
  operator: string,
  left: Expression
}

type unary = {
  operator: string,
  operand: Expression
}


