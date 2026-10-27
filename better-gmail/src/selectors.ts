// Gmail's DOM is not a public API. Keep site-specific selectors here.
export const selectors = {
  row: 'tr.zA',
  subject: '.bog',
  snippet: '.y2',
  visibleSender: '.yW [email]',
  senderContainer: '.yW',
  attachmentCard: '[download_url]',
  message: '[role="listitem"]',
} as const;
