
import { describe, test, expect } from 'vitest';

import { inputFormats } from './input-formats';

describe('input-formats', () => {
  describe('email addresses', () => {
    test('valid email addresses', () => {
      let emails = [
        'hello@example.com',
        'a@b.c',
        'me@example.io',
        '123@example.com',
        'abc+123@example.com',
        '123+abc@example.com',
      ];
      emails.forEach((email) => {
        expect(inputFormats.checkEmailAddr(email), email).toBe(true);
      });
    });
    test('invalid email address', () => {
      let emails = [
        'hello@example',
        'a@b.',
        '@example.io',
        'a@',
        'a@.',
        'etc',
        'etc.ai',
      ];
      emails.forEach((email) => {
        expect(inputFormats.checkEmailAddr(email), `'${email}'`).toBe(false);
      });
    });
  });

  describe('usernames', () => {
    test('valid username', () => {
      let validUsernames = [
        'eaglelizard',
        'eagle_lizard',
        'abc',
        'a00',
        'b_1',
        'c__',
      ];
      validUsernames.forEach((username) => {
        expect(inputFormats.checkUserName(username), `'${username}'`).toBe(true);
      });
    });
    test('invalid username', () => {
      let validUsernames = [
        'eagle-lizard',
        'eagle lizard',
        'a',
        'ab',
        '___',
        '000123',
        '_abc_',
        '',
      ];
      validUsernames.forEach((username) => {
        expect(inputFormats.checkUserName(username), `'${username}'`).toBe(false);
      });
    });
  });

  describe('passwords', () => {
    test('valid password', () => {
      let validPws = [
        'thisisalongpassword',
        '123456789101112131415',
        'Password should allow any characters *$@#~^-(=):!_-øñ😀',
        'Really there is no limit on length.'.repeat(1e4),
      ];
      validPws.forEach((pw) => {
        expect(inputFormats.checkPassword(pw), `'${pw}'`).toBe(true);
      });
    });
    test('invalid password', () => {
      let validPws = [
        '',
        'shortpw',
        ':/',
      ];
      validPws.forEach((pw) => {
        expect(inputFormats.checkPassword(pw), `'${pw}'`).toBe(false);
      });
    });
  });
});
