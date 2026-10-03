/**
 * Escape untrusted text before interpolating it into HTML markup.
 * Prefer textContent / DOM APIs for dynamic or player-controlled values.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    };
    return entities[character] ?? character;
  });
}
