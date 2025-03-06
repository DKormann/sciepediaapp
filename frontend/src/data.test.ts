import { Root, Child, Path, root, child, getData, setData, getChild, getNode, setChild, setNode } from './data'

describe('data structure operations', () => {
  let testRoot: Root

  beforeEach(() => {
    // Create a test tree structure for each test
    testRoot = root(
      child('a', 'a content', 
        child('a.b', 'b content',
          child('a.b.c', 'c content')
        )
      ),
      child('x', 'x content')
    )
  })

  test('getChild retrieves a child node by title', () => {
    const parent = getNode(testRoot, ['a']) as Child
    const childNode = getChild(parent, 'b')
    
    expect(childNode.path).toEqual(['a', 'b'])
    expect(childNode.Content).toBe('b content')
  })

  test('getChild returns empty node if child not found', () => {
    const parent = getNode(testRoot, ['a']) as Child
    const nonExistentChild = getChild(parent, 'nonexistent')
    
    expect(nonExistentChild.path).toEqual(['a', 'nonexistent'])
    expect(nonExistentChild.Content).toBe('')
    expect(nonExistentChild.children).toEqual([])
  })

  test('getNode traverses tree to find node at path', () => {
    const node = getNode(testRoot, ['a', 'b', 'c'])
    expect((node as Child).Content).toBe('c content')
    
    // Root node
    const rootNode = getNode(testRoot, [])
    expect(rootNode).toBe(testRoot)
  })

  test('setChild updates or adds a child to a parent node', () => {
    const parent = getNode(testRoot, ['a']) as Child
    const updatedParent = setChild(parent, 'b', child('a.b', 'updated content'))
    
    expect(getChild(updatedParent, 'b').Content).toBe('updated content')
    
    // Add new child
    const withNewChild = setChild(parent, 'new', child('a.new', 'new child'))
    expect(getChild(withNewChild, 'new').Content).toBe('new child')
  })

  test('setNode updates or adds a node at a specific path', () => {
    // Update existing node
    const updatedRoot = setNode(testRoot, child('a.b.c', 'updated c content'))
    const updatedNode = getNode(updatedRoot, ['a', 'b', 'c']) as Child
    expect(updatedNode.Content).toBe('updated c content')
    
    // Add node at new path
    const rootWithNewPath = setNode(testRoot, child('new.path.node', 'new node content'))
    const newNode = getNode(rootWithNewPath, ['new', 'path', 'node']) as Child
    expect(newNode.Content).toBe('new node content')
  })

  test('getData gets data at a specific path', () => {
    const data = getData(testRoot, ['a', 'b', 'c'])
    expect(data.Content).toBe('c content')
    expect(data.path).toEqual(['a', 'b', 'c'])
    
    // Error for root path
    expect(() => getData(testRoot, [])).toThrow('getData root')
  })

  test('setData sets data at a specific path', () => {
    const newRoot = setData(testRoot, child('a.b.c', 'new content'))
    const data = getData(newRoot, ['a', 'b', 'c'])
    expect(data.Content).toBe('new content')
  })

  test('child function creates Child node from path string', () => {
    const newChild = child('parent.child.grandchild', 'content')
    expect(newChild.path).toEqual(['parent', 'child', 'grandchild'])
    expect(newChild.Content).toBe('content')
    expect(newChild.children).toEqual([])
  })

  test('root function creates Root node with children', () => {
    const newRoot = root(
      child('a', 'a content'),
      child('b', 'b content')
    )
    
    expect(newRoot.path).toEqual([])
    expect(newRoot.children.length).toBe(2)
    expect(getChild(newRoot, 'a').Content).toBe('a content')
    expect(getChild(newRoot, 'b').Content).toBe('b content')
  })
})