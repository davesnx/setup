class NameFormatter {
  format(value) {
    return value.trim()
  }
}

export function formatName(value) {
  const formatter = new NameFormatter()
  return formatter.format(value)
}
