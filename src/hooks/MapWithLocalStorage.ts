import { useLocalStorage, useMap } from '@mantine/hooks';

export function useMapWithLocalStorage<K, V>(storageKey: string) {
  const [storedCompounds, setStoredCompounds] = useLocalStorage<Map<K, V>>({
    key: storageKey,
    serialize: (value) => {
      return JSON.stringify(Array.from(value.entries()));
    },
    deserialize: (localStorageValue) => {
      let stored = localStorageValue ? JSON.parse(localStorageValue) : [];
      return new Map<K, V>(stored);
    },
    defaultValue: new Map<K, V>(),
    // Immediately populate storedCompounds, see https://help.mantine.dev/q/local-storage-effect
    getInitialValueInEffect: false,
  });

  // @ts-expect-error: storeCompounds is a Map, which is iterable, but useMap's type definition is
  // too strict.
  const m = useMap<K, V>(storedCompounds);

  const withLocalStorage = (f: (...args: any) => any) => {
    return (...args: any) => {
      const r = f(...args);
      setStoredCompounds(m);
      return r;
    };
  };

  m.set = withLocalStorage(m.set);
  m.clear = withLocalStorage(m.clear);
  m.delete = withLocalStorage(m.delete);

  return m;
}
