// Polyfills for AWS Amplify compatibility with Vite

// Global polyfill
if (typeof global === 'undefined') {
  (window as Record<string, unknown>).global = window;
}

// Process polyfill for Node.js compatibility
if (typeof process === 'undefined') {
  (window as Record<string, unknown>).process = {
    env: {},
    nextTick: (fn: () => void) => setTimeout(fn, 0),
    version: '',
    platform: 'browser'
  };
}

// Buffer polyfill (if needed)
if (typeof Buffer === 'undefined') {
  (window as Record<string, unknown>).Buffer = {
    from: (str: string) => new TextEncoder().encode(str),
    isBuffer: () => false
  };
}

export {};