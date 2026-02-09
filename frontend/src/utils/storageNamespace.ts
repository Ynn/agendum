const rawNamespace = `${import.meta.env.VITE_STORAGE_NAMESPACE || ''}`.trim();

const sanitizeNamespace = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9_-]/g, '');

export const STORAGE_NAMESPACE = sanitizeNamespace(rawNamespace);
export const IS_NAMESPACED_STORAGE = STORAGE_NAMESPACE.length > 0;

export const namespacedStorageKey = (baseKey: string) => {
  if (!IS_NAMESPACED_STORAGE) return baseKey;
  return `${STORAGE_NAMESPACE}__${baseKey}`;
};

export const namespacedDbName = (baseName: string) => {
  if (!IS_NAMESPACED_STORAGE) return baseName;
  return `${baseName}__${STORAGE_NAMESPACE}`;
};
