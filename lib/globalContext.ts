type GlobalContextKey = (...args: never[]) => void;
type GlobalContextValue = unknown;

export const globalContext = new Map<GlobalContextKey, GlobalContextValue>();

export function addGlobalContext(
  key: GlobalContextKey,
  value: GlobalContextValue,
) {
  if (globalContext.has(key)) {
    throw new Error("This dimension is already defined");
  }
  globalContext.set(key, value);
}

export function removeGlobalContext(key: GlobalContextKey) {
  if (!globalContext.has(key)) {
    throw new Error("Trying to remove a dimension that is not defined");
  }
  globalContext.delete(key);
}
