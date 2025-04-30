import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMapWithLocalStorage } from './MapWithLocalStorage'; // Adjust path if needed

describe('useMapWithLocalStorage Hook', () => {
  const TEST_KEY = 'test-map-storage';

  // Clear localStorage before each test to ensure isolation
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
      localStorage.clear(); // Clean up after just in case
  });

  it('should initialize with an empty map if localStorage is empty', () => {
    const { result } = renderHook(() => useMapWithLocalStorage<string, number>(TEST_KEY));
    expect(result.current.size).toBe(0);
    expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify([])); // Mantine's useLocalStorage might initialize it
  });

  it('should initialize with data from localStorage if present', () => {
    const initialData = [['a', 1], ['b', 2]];
    localStorage.setItem(TEST_KEY, JSON.stringify(initialData));

    const { result } = renderHook(() => useMapWithLocalStorage<string, number>(TEST_KEY));

    expect(result.current.size).toBe(2);
    expect(result.current.get('a')).toBe(1);
    expect(result.current.get('b')).toBe(2);
  });

   it('should initialize with an empty map if localStorage contains invalid JSON', () => {
    localStorage.setItem(TEST_KEY, 'invalid-json-string');

    // Suppress console.error expected from JSON.parse failure inside the hook/dependency
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useMapWithLocalStorage<string, number>(TEST_KEY));

    expect(result.current.size).toBe(0);
    // Depending on useLocalStorage implementation, it might reset the invalid value
    // expect(localStorage.getItem(TEST_KEY)).toBe('invalid-json-string'); // Or it might clear/reset it
     expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify([])); // Mantine likely resets it

    consoleErrorSpy.mockRestore();
  });


  it('should set a new value and update localStorage', () => {
    const { result } = renderHook(() => useMapWithLocalStorage<string, string>(TEST_KEY));

    act(() => {
      result.current.set('key1', 'value1');
    });

    expect(result.current.size).toBe(1);
    expect(result.current.get('key1')).toBe('value1');
    expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify([['key1', 'value1']]));
  });

   it('should update an existing value and update localStorage', () => {
    localStorage.setItem(TEST_KEY, JSON.stringify([['key1', 'value1']]));
    const { result } = renderHook(() => useMapWithLocalStorage<string, string>(TEST_KEY));

     expect(result.current.get('key1')).toBe('value1'); // Pre-check

    act(() => {
      result.current.set('key1', 'newValue');
    });

    expect(result.current.size).toBe(1);
    expect(result.current.get('key1')).toBe('newValue');
    expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify([['key1', 'newValue']]));
  });

  it('should delete a value and update localStorage', () => {
     localStorage.setItem(TEST_KEY, JSON.stringify([['key1', 'value1'], ['key2', 'value2']]));
     const { result } = renderHook(() => useMapWithLocalStorage<string, string>(TEST_KEY));

     expect(result.current.size).toBe(2); // Pre-check

    act(() => {
      result.current.delete('key1');
    });

    expect(result.current.size).toBe(1);
    expect(result.current.has('key1')).toBe(false);
    expect(result.current.get('key2')).toBe('value2');
    expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify([['key2', 'value2']]));
  });

   it('should not change localStorage when deleting a non-existent key', () => {
     localStorage.setItem(TEST_KEY, JSON.stringify([['key1', 'value1']]));
     const { result } = renderHook(() => useMapWithLocalStorage<string, string>(TEST_KEY));

     expect(result.current.size).toBe(1); // Pre-check
     const initialStorage = localStorage.getItem(TEST_KEY);

    act(() => {
      result.current.delete('nonExistentKey');
    });

    expect(result.current.size).toBe(1);
    expect(localStorage.getItem(TEST_KEY)).toBe(initialStorage);
  });


  it('should clear the map and update localStorage', () => {
     localStorage.setItem(TEST_KEY, JSON.stringify([['key1', 'value1'], ['key2', 'value2']]));
     const { result } = renderHook(() => useMapWithLocalStorage<string, string>(TEST_KEY));

     expect(result.current.size).toBe(2); // Pre-check

    act(() => {
      result.current.clear();
    });

    expect(result.current.size).toBe(0);
    expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify([])); // Should be empty array stringified
  });

   it('should handle different keys independently', () => {
    const KEY_1 = 'map-key-1';
    const KEY_2 = 'map-key-2';

    localStorage.setItem(KEY_1, JSON.stringify([['a', 1]]));
    localStorage.setItem(KEY_2, JSON.stringify([['b', 2]]));

    const { result: result1 } = renderHook(() => useMapWithLocalStorage<string, number>(KEY_1));
    const { result: result2 } = renderHook(() => useMapWithLocalStorage<string, number>(KEY_2));

    // Check initial state
    expect(result1.current.size).toBe(1);
    expect(result1.current.get('a')).toBe(1);
    expect(result2.current.size).toBe(1);
    expect(result2.current.get('b')).toBe(2);

    // Modify map 1
    act(() => {
      result1.current.set('c', 3);
    });

    // Verify map 1 changed, map 2 didn't
    expect(result1.current.size).toBe(2);
    expect(result1.current.get('c')).toBe(3);
    expect(result2.current.size).toBe(1); // Should remain unchanged

    // Verify localStorage for both keys
    expect(localStorage.getItem(KEY_1)).toBe(JSON.stringify([['a', 1], ['c', 3]]));
    expect(localStorage.getItem(KEY_2)).toBe(JSON.stringify([['b', 2]])); // Should remain unchanged

     // Modify map 2
    act(() => {
      result2.current.delete('b');
    });

     // Verify map 2 changed, map 1 didn't
    expect(result1.current.size).toBe(2); // Should remain unchanged
    expect(result2.current.size).toBe(0);

     // Verify localStorage for both keys
    expect(localStorage.getItem(KEY_1)).toBe(JSON.stringify([['a', 1], ['c', 3]])); // Should remain unchanged
    expect(localStorage.getItem(KEY_2)).toBe(JSON.stringify([]));

  });

});
