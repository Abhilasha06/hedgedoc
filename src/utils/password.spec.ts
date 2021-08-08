/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomBytes } from 'crypto';
import { bufferToBase64Url, checkPassword, hashPassword } from './password';

describe('checkPassword', () => {
  it('works', async () => {
    const testPassword = 'thisIsATestPassword';
    const hash = await hashPassword(testPassword);
    await checkPassword(testPassword, hash).then((result) =>
      expect(result).toBeTruthy(),
    );
  });
  it('fails, if secret is too short', async () => {
    const secret = bufferToBase64Url(randomBytes(54));
    const hash = await hashPassword(secret);
    await checkPassword(secret, hash).then((result) =>
      expect(result).toBeTruthy(),
    );
    await checkPassword(secret.substr(0, secret.length - 1), hash).then(
      (result) => expect(result).toBeFalsy(),
    );
  });
});

describe('bufferToBase64Url', () => {
  it('works', () => {
    expect(
      bufferToBase64Url(Buffer.from('testsentence is a test sentence')),
    ).toEqual('dGVzdHNlbnRlbmNlIGlzIGEgdGVzdCBzZW50ZW5jZQ');
  });
});
