// Mock browser objects for Node.js environment
class MockHTMLElement {
  constructor() {
    this.nodeName = 'DIV';
    this.textContent = '';
  }
}

class MockNode {
  constructor() {
    this.nodeName = 'NODE';
    this.textContent = '';
  }
}

// Mock Event class
class MockEvent {
  constructor() {
    this.type = 'click';
  }
}

// Set up global mocks
global.HTMLElement = MockHTMLElement;
global.Node = MockNode;
global.Event = MockEvent;
global.document = {
  createElement: () => new MockHTMLElement()
};