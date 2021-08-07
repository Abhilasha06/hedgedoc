/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomBytes } from 'crypto';
import { generatePublicId, getPrimaryAlias } from './utils';
import { Note } from './note.entity';
import { User } from '../users/user.entity';
import { Alias } from './alias.entity';
jest.mock('crypto');

it('generatePublicId', () => {
  const random128bitBuffer = Buffer.from([
    0xe1, 0x75, 0x86, 0xb7, 0xc3, 0xfb, 0x03, 0xa9, 0x26, 0x9f, 0xc9, 0xd6,
    0x8c, 0x2d, 0x7b, 0x7b,
  ]);
  const mockRandomBytes = randomBytes as jest.MockedFunction<
    typeof randomBytes
  >;
  mockRandomBytes.mockImplementation((_) => random128bitBuffer);

  expect(generatePublicId()).toEqual('w5trddy3zc1tj9mzs7b8rbbvfc');
});

it('getPrimaryAlias', () => {
  const user = User.create('hardcoded', 'Testy') as User;
  const alias = 'alias';
  const note = Note.create(user, alias);
  note.aliases[0].primary = true;
  note.aliases.push(Alias.create('annother', false));

  expect(getPrimaryAlias(note)).toEqual(alias);
});
