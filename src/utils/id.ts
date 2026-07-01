// crypto.randomUUID() requires a secure context (HTTPS or localhost) and is
// undefined on plain http:// (e.g. testing over LAN on a phone). Fall back to
// crypto.getRandomValues (available in insecure contexts too), and finally to
// Math.random if crypto itself is unavailable.
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex
      .slice(8, 10)
      .join('')}-${hex.slice(10, 16).join('')}`;
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
