/** Strip currency symbols, commas, and whitespace, then parse as a number.
 *  Returns null for empty, non-numeric, or malformed strings (e.g. multiple dots). */
export function cleanNumber(str: string): number | null {
  const cleaned = str.replace(/[₹,\s]/g, '').trim();
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export const fmtPrice = (p: number): string => '₹' + (Number(p) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/**
 * ponytail: simplified regex-based markdown to HTML parser to support lists, bold,
 * italics, headings, and spacing without importing full heavy AST parsers.
 */
export function formatMarkdownToHtml(text: string): string {
  if (!text) return '';
  
  // Strip code block wrappers if the model output wrapped everything
  let html = text.replace(/```html\s*([\s\S]*?)\s*```/gi, '$1');
  html = html.replace(/```xml\s*([\s\S]*?)\s*```/gi, '$1');
  html = html.replace(/```\s*([\s\S]*?)\s*```/gi, '$1');

  // Bold and italics
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Headings
  html = html.replace(/^###\s+(.*?)$/gm, '<h5 class="aiw-chat-h5">$1</h5>');
  html = html.replace(/^##\s+(.*?)$/gm, '<h4 class="aiw-chat-h4">$1</h4>');
  html = html.replace(/^#\s+(.*?)$/gm, '<h3 class="aiw-chat-h3">$1</h3>');

  // Unordered list items using placeholder to avoid wrapping existing HTML list elements
  html = html.replace(/^(?:-\s+|\*\s+)(.*?)$/gm, '<aiw-li>$1</aiw-li>');
  html = html.replace(/(<aiw-li>[\s\S]*?<\/aiw-li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/<aiw-li>/g, '<li>').replace(/<\/aiw-li>/g, '</li>');

  // Convert newlines to breaks
  html = html.replace(/\n/g, '<br>');

  // Clean up breaks adjacent to block-level HTML tags
  html = html.replace(/<br>\s*(<\/?(?:table|thead|tbody|tr|th|td|ul|ol|li|div|p|h[3-5])>)/gi, '$1');
  html = html.replace(/(<\/?(?:table|thead|tbody|tr|th|td|ul|ol|li|div|p|h[3-5])>)\s*<br>/gi, '$1');

  return html;
}

