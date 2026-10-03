/**
 * Escape untrusted text before interpolating it into HTML markup.
 *
 * This covers both element text and quoted HTML attribute values. Prefer
 * textContent / DOM APIs when practical; use this helper where the UI is
 * intentionally rendered from template strings.
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
