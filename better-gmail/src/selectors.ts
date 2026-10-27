// Gmail's DOM is not a public API. Keep site-specific selectors here.
export const selectors = {
  row: 'tr.zA',
  messageBody: '.a3s',
  subject: '.bog',
  snippet: '.y2',
  visibleSender: '.yW [email]',
  senderContainer: '.yW',
} as const;
