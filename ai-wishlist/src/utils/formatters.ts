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
 * Simplified regex-based markdown to HTML parser to support lists, bold,
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

  // Ordered list items using placeholder to avoid wrapping
  html = html.replace(/^(?:\d+\.\s+)(.*?)$/gm, '<aiw-oli>$1</aiw-oli>');
  html = html.replace(/(<aiw-oli>[\s\S]*?<\/aiw-oli>)/g, '<ol>$1</ol>');
  html = html.replace(/<\/ol>\s*<ol>/g, '');
  html = html.replace(/<aiw-oli>/g, '<li>').replace(/<\/aiw-oli>/g, '</li>');

  // Convert newlines to breaks
  html = html.replace(/\n/g, '<br>');

  // Clean up breaks adjacent to block-level HTML tags
  html = html.replace(/<br>\s*(<\/?(?:table|thead|tbody|tr|th|td|ul|ol|li|div|p|h[3-5])>)/gi, '$1');
  html = html.replace(/(<\/?(?:table|thead|tbody|tr|th|td|ul|ol|li|div|p|h[3-5])>)\s*<br>/gi, '$1');

  return html;
}

export function sanitizeHtml(htmlStr: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return htmlStr;
  const doc = new DOMParser().parseFromString(htmlStr, 'text/html');
  const allowedTags = new Set([
    'strong', 'em', 'ul', 'ol', 'li', 'br', 'a', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'h3', 'h4', 'h5', 'p', 'span', 'div'
  ]);
  
  function sanitize(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      
      // If tag is not allowed, replace it with text content
      if (!allowedTags.has(tag)) {
        const textNode = doc.createTextNode(el.textContent || '');
        el.replaceWith(textNode);
        return;
      }
      
      // Remove all inline event handlers (on*) and unauthorized attributes
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
        } else if (name === 'href') {
          // Prevent javascript: links by stripping whitespaces and control characters
          const val = attr.value.replace(/[\x00-\x20\s]/g, '').toLowerCase();
          if (val.startsWith('javascript:') || val.startsWith('data:') || val.startsWith('vbscript:')) {
            el.removeAttribute(attr.name);
          }
        } else if (name !== 'class' && name !== 'target') {
          // Remove style and other unauthorized attributes to prevent markup injection
          el.removeAttribute(attr.name);
        }
      }
    }
    
    // Sanitize child elements
    const children = Array.from(node.childNodes);
    children.forEach(sanitize);
  }
  
  doc.body.childNodes.forEach(sanitize);
  return doc.body.innerHTML;
}
