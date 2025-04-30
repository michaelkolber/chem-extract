// Mock localStorage for Vitest/jsdom environment
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem(key: string): string | null {
      return store[key] || null;
    },
    setItem(key: string, value: string): void {
      store[key] = value.toString();
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      store = {};
    },
    // Optional: Add length and key(index) if needed by dependencies
    get length() {
      return Object.keys(store).length;
    },
    key(index: number): string | null {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Optional: Extend Vitest's `expect` with jest-dom matchers
// If you installed @testing-library/jest-dom
import '@testing-library/jest-dom';
