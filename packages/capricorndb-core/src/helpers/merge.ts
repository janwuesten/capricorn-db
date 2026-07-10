export function deepMerge<T extends object>(original: T, updates: Partial<T>): T {
  const result = { ...original }
  for (const key of Object.keys(updates) as (keyof T)[]) {
    const updateValue = updates[key]
    const originalValue = result[key]
    if (updateValue !== null && typeof updateValue === 'object' && !Array.isArray(updateValue) && originalValue !== null && typeof originalValue === 'object' && !Array.isArray(originalValue)) {
      result[key] = deepMerge(originalValue as object, updateValue as object) as T[keyof T]
    } else if (updateValue !== undefined) {
      result[key] = updateValue as T[keyof T]
    }
  }
  return result
}
