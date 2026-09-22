export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value)
}

// Aceita o hex com ou sem "#" e devolve em maiúsculas, como os do seed
// (#F5F5F0). Devolve null se não for uma cor de 6 dígitos.
export function normalizeHex(value: string): string | null {
  const trimmed = value.trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  return isHexColor(withHash) ? withHash.toUpperCase() : null
}
