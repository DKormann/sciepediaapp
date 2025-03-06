import { comp, stringify, hash, uuid, treeget, treeinsert, treemerge } from './helpers'

describe('helper utilities', () => {
  test('comp deep compares two values', () => {
    // Primitives
    expect(comp(1, 1)).toBe(true)
    expect(comp('hello', 'hello')).toBe(true)
    expect(comp(1, 2)).toBe(false)
    expect(comp('hello', 'world')).toBe(false)
    
    // Objects
    expect(comp({a: 1, b: 2}, {a: 1, b: 2})).toBe(true)
    expect(comp({a: 1, b: 2}, {b: 2, a: 1})).toBe(true) // Order shouldn't matter
    expect(comp({a: 1, b: 2}, {a: 1, b: 3})).toBe(false)
    
    // Arrays
    expect(comp([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(comp([1, 2, 3], [1, 2, 4])).toBe(false)
    
    // Nested structures
    expect(comp({a: [1, 2], b: {c: 3}}, {a: [1, 2], b: {c: 3}})).toBe(true)
    expect(comp({a: [1, 2], b: {c: 3}}, {a: [1, 2], b: {c: 4}})).toBe(false)
  })

  test('stringify converts value to string representation', () => {
    // Primitives
    expect(stringify(123)).toBe('123')
    expect(stringify('hello')).toBe('"hello"')
    expect(stringify(true)).toBe('true')
    expect(stringify(undefined)).toBe('undefined')
    
    // Objects 
    const objResult = stringify({a: 1, b: 2})
    expect(objResult).toContain('a:1')
    expect(objResult).toContain('b:2')
    
    // Arrays
    expect(stringify([1, 2, 3])).toBe('[1, 2, 3]')
    
    // Nested structures
    const nestedResult = stringify({a: [1, 2], b: {c: 3}})
    expect(nestedResult).toContain('a:[1, 2]')
    expect(nestedResult).toContain('b:{')
    expect(nestedResult).toContain('c:3')
  })

  test('hash creates a hash from a string', () => {
    // Hash should be deterministic for the same input
    const hash1 = hash('test')
    const hash2 = hash('test')
    expect(hash1).toBe(hash2)
    
    // Different inputs should produce different hashes
    const hash3 = hash('test')
    const hash4 = hash('different')
    expect(hash3).not.toBe(hash4)
  })

  test('uuid assigns unique IDs to objects', () => {
    // Basic objects
    const obj = {name: 'test'}
    const withId = uuid(obj)
    expect(withId.id).toBeDefined()
    expect(typeof withId.id).toBe('bigint')
    
    // Same content should get same ID
    const obj1 = {value: 123}
    const obj2 = {value: 123}
    expect(uuid(obj1).id).toBe(uuid(obj2).id)
    
    // Different content should get different ID
    const obj3 = {value: 123}
    const obj4 = {value: 456}
    expect(uuid(obj3).id).not.toBe(uuid(obj4).id)
  })

  describe('binary tree operations', () => {
    test('treeinsert adds value to tree', () => {
      let tree = null
      const val1 = {data: 'A'}
      const val2 = {data: 'B'}
      
      tree = treeinsert(tree, val1)
      expect(tree?.value.data).toBe('A')
      
      tree = treeinsert(tree, val2)
      expect(tree?.value.data).toBe('A')
      if (tree?.left) {
        expect(tree.left.value.data).toBe('B')
      } else if (tree?.right) {
        expect(tree.right.value.data).toBe('B')
      } else {
        fail('Tree did not insert second value')
      }
    })

    test('treeget retrieves value from tree by id', () => {
      let tree = null
      const val1 = {data: 'A'}
      const val2 = {data: 'B'}
      
      const withId1 = uuid(val1)
      const withId2 = uuid(val2)
      
      tree = treeinsert(tree, val1)
      tree = treeinsert(tree, val2)
      
      const retrieved1 = treeget(tree, withId1.id)
      expect(retrieved1?.data).toBe('A')
      
      const retrieved2 = treeget(tree, withId2.id)
      expect(retrieved2?.data).toBe('B')
      
      const nonExistent = treeget(tree, BigInt(12345))
      expect(nonExistent).toBeNull()
    })

    test('treemerge combines two trees', () => {
      let tree1 = null
      let tree2 = null
      
      tree1 = treeinsert(tree1, {data: 'A'})
      tree1 = treeinsert(tree1, {data: 'B'})
      
      tree2 = treeinsert(tree2, {data: 'C'})
      tree2 = treeinsert(tree2, {data: 'D'})
      
      const merged = treemerge(tree1, tree2)
      
      // Verify all values are in the merged tree
      const withIdA = uuid({data: 'A'})
      const withIdB = uuid({data: 'B'})
      const withIdC = uuid({data: 'C'})
      const withIdD = uuid({data: 'D'})
      
      expect(treeget(merged, withIdA.id)?.data).toBe('A')
      expect(treeget(merged, withIdB.id)?.data).toBe('B')
      expect(treeget(merged, withIdC.id)?.data).toBe('C')
      expect(treeget(merged, withIdD.id)?.data).toBe('D')
    })
  })
})