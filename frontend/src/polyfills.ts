// Polyfills for AWS Amplify compatibility with Vite

// Global polyfill
if (typeof global === 'undefined') {
  (window as any).global = window;
}

// Process polyfill for Node.js compatibility
if (typeof process === 'undefined') {
  (window as any).process = {
    env: {},
    nextTick: (fn: Function) => setTimeout(fn, 0),
    version: '',
    platform: 'browser'
  };
}

// Buffer polyfill (if needed)
if (typeof Buffer === 'undefined') {
  (window as any).Buffer = {
    from: (str: string) => new TextEncoder().encode(str),
    isBuffer: () => false
  };
}

export {};