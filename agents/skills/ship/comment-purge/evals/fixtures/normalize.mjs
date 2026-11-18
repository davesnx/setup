// Copyright 2026 Example Authors. MIT License.
export function normalize(value) {
  // IMPORTANT: Keep trimming before lowercasing until the legacy importer contract is confirmed.
  // Convert the value to a string.
  const text = String(value);
  return text.trim().toLowerCase();
}
