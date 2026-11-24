// Gmail's DOM is not a public API. Keep site-specific selectors here.
export const selectors = {
  row: 'tr.zA',
  messageBody: '.a3s',
  subject: '.bog',
  snippet: '.y2',
  visibleSender: '.yW [email]',
  senderContainer: '.yW',
  thread: '[role="main"]',
  threadSubject: 'h2.hP',
  message: '.adn',
  messageSender: '.gD',
  messageEmail: '.go',
  messageDate: '.g3',
} as const;
