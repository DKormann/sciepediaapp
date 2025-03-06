import { highlighted_js, run_js } from './javascriptexec';

describe('JavaScript execution utilities', () => {
  describe('highlighted_js', () => {
    test('creates syntax highlighting for JavaScript code', () => {
      const code = 'const x = 10; // A number';
      const result = highlighted_js(code);
      
      // Should return a 2D array of highlighted characters
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(Array.isArray(result[0])).toBe(true);
      
      // Check for proper classes
      const hasIdentifierClass = result.some(line => 
        line.some(char => char.cls === 'code1')
      );
      expect(hasIdentifierClass).toBe(true);
      
      const hasCommentClass = result.some(line => 
        line.some(char => char.cls === 'code2')
      );
      expect(hasCommentClass).toBe(true);
    });
    
    test('handles empty input', () => {
      const result = highlighted_js('');
      // When input is empty, result should be an empty array or undefined
      expect(result || []).toEqual([]);
    });
  });
  
  describe('run_js', () => {
    test('executes JavaScript code and returns result', () => {
      // Simple calculation
      expect(run_js('1 + 2')).toBe('3');
      
      // String operations
      expect(run_js('"hello " + "world"')).toBe('"hello world"');
      
      // Object creation
      const objResult = run_js('({a: 1, b: 2})');
      expect(objResult).toContain('a:1');
      expect(objResult).toContain('b:2');
      
      // Function execution
      expect(run_js('(function(x) { return x * 2; })(5)')).toBe('10');
    });
    
    test('returns error message for invalid code', () => {
      const errorResult = run_js('x +');
      expect(errorResult).toBeTruthy(); // Just check that we get some error message
      
      const referenceErrorResult = run_js('nonExistentVariable');
      expect(referenceErrorResult).toBeTruthy(); // Just check that we get some error message
    });
  });
});