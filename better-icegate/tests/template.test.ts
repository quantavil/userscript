import { expect, test } from 'bun:test';
import { defaultTemplate, renderTemplate, templateToHtml } from '../src/settings/template';

test('renders the default email template with tab-separated values', () => {
  expect(renderTemplate(defaultTemplate, { job: '61226', sb: '8112958', date: '27-10-2026', location: 'INMBD6' })).toBe(
    'Dear Sir,\n\nFind below Shipping Bill Number:\n\nJob No\tSB Number\tSB Date\n61226\t8112958\t27-10-2026');
});

test('supports location and leaves unknown braces alone', () => {
  expect(renderTemplate('{location} {job} {nope}', { job: '1', sb: '2', date: '3', location: 'INDER6' })).toBe('INDER6 1 {nope}');
});

test('turns tab-separated lines into a bordered table and escapes values', () => {
  const html = templateToHtml(renderTemplate(defaultTemplate, { job: '61226', sb: '8112958', date: '27-10-2026', location: '' }));
  expect(html).toContain('<div>Dear Sir,</div><div><br></div><div>Find below Shipping Bill Number:</div><div><br></div><table border="1"');
  expect(html.match(/<table /g)).toHaveLength(1);
  expect(html).toContain('<td style="border:1px solid #000;padding:4px 10px;font-weight:bold;">Job No</td>');
  expect(html).toContain('<td style="border:1px solid #000;padding:4px 10px;">61226</td><td style="border:1px solid #000;padding:4px 10px;">8112958</td>');
  expect(templateToHtml('a\t<b>&')).toContain('&lt;b&gt;&amp;');
  expect(templateToHtml('a\tb')).not.toContain('font-weight');
});
