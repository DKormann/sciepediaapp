import { seek, tokenize, parse, build, operator_weight, rearange, flat_errors, getAst, execAst } from './funscript'

describe('funscript tokenization', () => {
  test('seek finds index of first character matching predicate', () => {
    expect(seek('hello world', 0, c => c === ' ')).toBe(5)
    expect(seek('hello world', 6, c => c === 'd')).toBe(10)
    expect(seek('hello', 0, c => c === 'z')).toBe(5) // Should return code.length if not found
  })

  test('tokenize breaks code into tokens', () => {
    expect(tokenize('1')).toEqual([{type: 'number', value: '1', start: 0, end: 1}])
    expect(tokenize('1 + 2')).toEqual([
      {type: 'number', value: '1', start: 0, end: 1},
      {type: 'whitespace', value: ' ', start: 1, end: 2},
      {type: 'symbol', value: '+', start: 2, end: 3},
      {type: 'whitespace', value: ' ', start: 3, end: 4},
      {type: 'number', value: '2', start: 4, end: 5}
    ])
    expect(tokenize('true')).toEqual([{type: 'boolean', value: 'true', start: 0, end: 4}])
    
    // Additional tokenize tests from original file
    expect(tokenize('1 +  1')).toEqual([
      {type: 'number', value: '1', start: 0, end: 1},
      {type: 'whitespace', value: ' ', start: 1, end: 2},
      {type: 'symbol', value: '+', start: 2, end: 3},
      {type: 'whitespace', value: '  ', start: 3, end: 5},
      {type: 'number', value: '1', start: 5, end: 6}
    ])
    
    expect(tokenize('{"gello" + ]22', 0)).toEqual([
      {type: 'symbol', value: '{', start: 0, end: 1},
      {type: 'string', value: '"gello"', start: 1, end: 8},
      {type: 'whitespace', value: ' ', start: 8, end: 9},
      {type: 'symbol', value: '+', start: 9, end: 10},
      {type: 'whitespace', value: ' ', start: 10, end: 11},
      {type: 'symbol', value: ']', start: 11, end: 12},
      {type: 'number', value: '22', start: 12, end: 14}
    ])
    
    expect(tokenize("a + // comment\nb")).toEqual([
      {type: 'identifier', value: 'a', start: 0, end: 1},
      {type: 'whitespace', value: ' ', start: 1, end: 2},
      {type: 'symbol', value: '+', start: 2, end: 3},
      {type: 'whitespace', value: ' ', start: 3, end: 4},
      {type: 'comment', value: '// comment', start: 4, end: 14},
      {type: 'whitespace', value: '\n', start: 14, end: 15},
      {type: 'identifier', value: 'b', start: 15, end: 16}
    ])
  })
})

describe('funscript parsing', () => {
  test('parse creates AST from tokens', () => {
    expect(parse(tokenize('1'))).toEqual({type: 'number', value: '1', start: 0, end: 1, children: []})
    expect(parse(tokenize('2312'))).toEqual({type: 'number', value: '2312', start: 0, end: 4, children: []})
    expect(parse(tokenize('true'))).toEqual({type: 'boolean', value: 'true', start: 0, end: 4, children: []})
  })

  test('operator_weight returns correct precedence', () => {
    expect(operator_weight('+')).toBe(11)
    expect(operator_weight('*')).toBe(12)
    expect(operator_weight('app')).toBe(15)
    expect(operator_weight('&&')).toBe(9)
  })

  test('rearange restructures AST based on operator precedence', () => {
    const ast = parse(tokenize('a + b * c'))
    const rearranged = rearange(ast)
    expect(build(rearranged)).toBe('(a+(b*c))')
  })
})

describe('funscript building', () => {
  test('build converts AST back to string representation', () => {
    expect(build(parse(tokenize('1')))).toBe('1')
    expect(build(parse(tokenize('[1]')))).toBe('[1]')
    expect(build(parse(tokenize('x + y')))).toBe('(x+y)')
    expect(build(parse(tokenize('{a:1}')))).toBe('{"a":1}')
  })

  test('build handles various basic expressions', () => {
    const testBuild = (input: string, expected?: string) => {
      const built = build(parse(tokenize(input)))
      expect(built).toBe(expected || input)
    }
    
    testBuild('1', '1')
    testBuild('[1]', '[1]')
    testBuild('true', 'true')
    testBuild('false', 'false')
    testBuild('null', 'null')
    testBuild('123', '123')
    testBuild('{}', '{}')
    testBuild('{a,}', '{"a":a}')
    testBuild('-x', '-x')
  })
  
  test('build handles complex expressions', () => {
    const testBuild = (input: string, expected: string) => {
      const built = build(parse(tokenize(input)))
      expect(built).toBe(expected)
    }
    
    testBuild('x + y', '(x+y)')
    testBuild('[a+1]', '[(a+1)]')
    testBuild('[a+1,b-1]', '[(a+1),(b-1)]')
    testBuild('{a:1}', '{"a":1}')
    testBuild('...a', '...a')
    testBuild('{a:1, b:2,...c}', '{"a":1,"b":2,...c}')
  })

  test('flat_errors extracts error tokens from AST', () => {
    const ast = parse(tokenize('1 + @')) // @ should be a typo token
    expect(flat_errors(ast).length).toBeGreaterThan(0)
    
    const validAst = parse(tokenize('1 + 2'))
    expect(flat_errors(validAst).length).toBe(0)
  })

  test('getAst creates and rearranges AST from tokens', () => {
    const tokens = tokenize('a + b * c')
    const ast = getAst(tokens)
    expect(build(ast)).toBe('(a+(b*c))')
  })
})

describe('funscript compilation tests', () => {
  const compile = (code: string): string => build(getAst(tokenize(code)))
  
  test('basic expressions compile correctly', () => {
    expect(compile('1')).toBe('1')
    expect(compile('a + 3')).toBe('(a+3)')
    expect(compile('!a+b')).toBe('(!a+b)')
    expect(compile('a + b + c')).toBe('((a+b)+c)')
  })
  
  test('operator precedence is respected during compilation', () => {
    expect(compile('a + b * c')).toBe('(a+(b*c))')
    expect(compile('[a + b * c]')).toBe('[(a+(b*c))]')
    expect(compile('a + b * c . d')).toBe('(a+(b*(c["d"])))')
    expect(compile('a * b + c')).toBe('((a*b)+c)')
    expect(compile('!a * b +c')).toBe('((!a*b)+c)')
  })
  
  test('ternary expressions compile correctly', () => {
    expect(compile('a ? b : c')).toBe('(a?b:\nc)')
    expect(compile('a>b?c:d')).toBe('((a>b)?c:\nd)')
  })
  
  test('assignment expressions compile correctly', () => {
    expect(compile('a=b;c')).toBe('(()=>{a = b;\nreturn c})()')
    expect(compile('e=1;2')).toBe('(()=>{e = 1;\nreturn 2})()')
    expect(compile('e={};44')).toBe('(()=>{e = {};\nreturn 44})()')
  })
  
  test('object and array literals compile correctly', () => {
    expect(compile('{a:1, b:2}')).toBe('{"a":1,"b":2}')
    expect(compile('{a, ...b}')).toBe('{"a":a,...b}')
    expect(compile('[fn(x),2]')).toBe('[(fn(x)),2]')
    expect(compile('[x[3],e.r,2,]')).toBe('[(x[3]),(e["r"]),2]')
    expect(compile('[-x, !true]')).toBe('[-x,!true]')
    expect(compile('[...fn]')).toBe('[...fn]')
    expect(compile('[fn(2)]')).toBe('[(fn(2))]')
    expect(compile('[...fn(2)]')).toBe('[...(fn(2))]')
  })
  
  test('property access compiles correctly', () => {
    expect(compile('x.y')).toBe('(x["y"])')
    expect(compile('x[y]')).toBe('(x[y])')
    expect(compile('a.b')).toBe('(a["b"])')
    expect(compile('a.b.c')).toBe('((a["b"])["c"])')
    expect(compile('a(b).c')).toBe('((a(b))["c"])')
  })
  
  test('function expressions compile correctly', () => {
    expect(compile('x=>y')).toBe('(x=>(y))')
    expect(compile('x=>x.y')).toBe('(x=>((x["y"])))')
    expect(compile('a=>b=>c')).toBe('(a=>((b=>(c))))')
    expect(compile('n=>n<2?n:2')).toBe('(n=>(((n<2)?n:\n2)))')
  })
  
  test('function calls compile correctly', () => {
    expect(compile('fn(22)')).toBe('(fn(22))')
    expect(compile('fn(22) + 3')).toBe('((fn(22))+3)')
    expect(compile('fn(x-2)')).toBe('(fn((x-2)))')
    expect(compile('a+b(c)')).toBe('(a+(b(c)))')
    expect(compile('a.b(22)')).toBe('((a["b"])(22))')
    expect(compile('a.b(f(22))')).toBe('((a["b"])((f(22))))')
    expect(compile('f(a, b)')).toBe('(f(a,b))')
  })
  
  test('string operations compile correctly', () => {
    expect(compile('"a"+"b"')).toBe('("a"+"b")')
    expect(compile('"hello " + "world"')).toBe('("hello "+"world")')
  })
  
  test('complex object expressions compile correctly', () => {
    expect(compile('{x:x=2;x}')).toBe('{"x":(()=>{x = 2;\nreturn x})()}')
    expect(compile('{x=2;x:x}')).toBe('{...(()=>{x = 2;\nreturn {x:x}})()}')
  })
})

describe('funscript execution', () => {
  const runfun = (code: string): any => execAst(getAst(tokenize(code)))
  
  test('basic execution works', () => {
    expect(runfun('\n1')).toBe(1)
    expect(runfun('1 + 2')).toBe(3)
  })
  
  test('string operations work', () => {
    expect(runfun('"hello" + "world"')).toBe('helloworld')
  })
  
  test('variable assignments work', () => {
    expect(runfun('x=1;x')).toBe(1)
    expect(runfun('x="hello";x+x')).toBe('hellohello')
  })
  
  test('destructuring assignments work', () => {
    expect(runfun('[a,b] = [1,2]; a')).toBe(1)
  })
  
  test('object expressions with assignments work', () => {
    expect(runfun('{x=2;x:x}')).toEqual({x:2})
    expect(runfun('{x:x=2;x}')).toEqual({x:2})
  })
  
  test('expressions with side effects return correctly', () => {
    expect(runfun('e={};44')).toBe(44)
  })
})