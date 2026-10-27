import { expect, test } from 'vite-plus/test';
import { detectOtp } from './otp';

test('recognizes common code formats and avoids unrelated numbers', () => {
  expect(detectOtp('Your OTP is 123 456')).toBe('123456');
  expect(detectOtp('G-123456 is your Google verification code')).toBe('123456');
  expect(detectOtp('123456 is your verification code')).toBe('123456');
  expect(detectOtp('Security report for 2024')).toBeUndefined();
  expect(detectOtp('Your verification code costs $1234.50')).toBeUndefined();
  expect(detectOtp('Your order number is 123456')).toBeUndefined();
  expect(detectOtp('Electronic copy for Shipping Bill No8116075')).toBeUndefined();
});
