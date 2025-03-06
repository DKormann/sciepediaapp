# Sciepedia Frontend

## Testing

This project uses Jest for unit testing. The tests are organized into separate files for each module:

- `funscript.test.ts`: Tests for the custom scripting language implementation
- `data.test.ts`: Tests for the tree-based data structure
- `helpers.test.ts`: Tests for utility functions
- `javascriptexec.test.ts`: Tests for JavaScript execution utilities

### Running Tests

To run the tests, use:

```bash
npm test
```

### Test Coverage

The tests cover the core functionality of the application, including:

- Tokenizing, parsing, and executing code in the custom scripting language
- Tree-based data structure operations
- Utility functions like comparing objects, creating hashes, and binary tree operations
- JavaScript code highlighting and execution

### Adding New Tests

When adding new functionality, follow these patterns to create corresponding tests:

1. Import the functions to test
2. Create a `describe` block for related functionality
3. Write individual `test` cases that verify specific behaviors
4. Use assertions like `expect().toBe()` to check results

Example:

```typescript
import { someFunction } from './module'

describe('Module functionality', () => {
  test('specific behavior', () => {
    const result = someFunction(input)
    expect(result).toBe(expectedOutput)
  })
})
```