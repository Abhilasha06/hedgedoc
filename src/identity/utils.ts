/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { User } from '../users/user.entity';
import { ProviderType } from './provider-type.enum';
import { Identity } from './identity.entity';

export function getIdentityFromUser(
  user: User,
  providerType: ProviderType,
): Identity | undefined {
  return user.identities.find(
    (aIdentity) => aIdentity.providerType === providerType,
  );
}
