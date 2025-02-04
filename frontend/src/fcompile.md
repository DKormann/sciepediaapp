## compiling simple functional script

fn (a:number) => a + 1
{
e: let a = 1 in
fn(a)
}



## syntax:

type Expression
  = Number
  | Identifier
  | Function
  | Application
  | Let
  | If
  | Binary
  | Unary

type Identifier = string

type Function = {
  params: Identifier[],
  body: Expression
}

