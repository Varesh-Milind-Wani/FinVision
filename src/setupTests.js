// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// JSDOM doesn't implement ResizeObserver, but some components rely on it.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// eslint-disable-next-line no-undef
global.ResizeObserver = global.ResizeObserver || MockResizeObserver;

// JSDOM doesn't implement IntersectionObserver, but some components rely on it.
class MockIntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

// eslint-disable-next-line no-undef
global.IntersectionObserver = global.IntersectionObserver || MockIntersectionObserver;

// JSDOM defines canvas.getContext but throws "Not implemented". Chart.js needs it.
// Force override with a minimal stub so charts don't error in tests.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  writable: true,
  value: () => ({
    canvas: {},
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  }),
});

// Avoid Chart.js initialization in JSDOM (it logs errors and isn't needed for our UI smoke tests).
// This does not affect production; it's test-only.
// eslint-disable-next-line no-undef
jest.mock('react-chartjs-2', () => ({
  Chart: () => null,
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  Doughnut: () => null,
}));
