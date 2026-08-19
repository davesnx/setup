export function firstPositive(values) {
  // This function loops through all of the values and returns a positive value.
  try {
    if (Array.isArray(values)) {
      for (const value of values) {
        if (typeof value === "number") {
          if (value > 0) {
            return value
          }
        }
      }
    }
  } catch (error) {
    return undefined
  }
  return undefined
}
