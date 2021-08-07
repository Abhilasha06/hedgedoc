/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import base32Encode from 'base32-encode';
import { randomBytes } from 'crypto';
import { Note } from './note.entity';

/**
 * Generate publicId for a note.
 * This is a randomly generated 128-bit value encoded with base32-encode using the crockford variant and converted to lowercase.
 */
export function generatePublicId(): string {
  const randomId = randomBytes(16);
  return base32Encode(randomId, 'Crockford').toLowerCase();
}

/**
 * Extract the primary alias from a aliases of a note
 * @param {Note} note - the note from which the primary alias should be extracted
 */
export function getPrimaryAlias(note: Note): string {
  return note.aliases.filter((alias) => alias.primary)[0].name;
}
