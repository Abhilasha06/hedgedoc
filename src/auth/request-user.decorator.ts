/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';

import { User } from '../users/user.entity';

/**
 * Extracts the {@link User} object from a request
 *
 * Will throw an {@link InternalServerErrorException} if no user is present
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const RequestUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: Request & { user: User } = ctx.switchToHttp().getRequest();
    if (!request.user) {
      // We should never reach this, as the TokenAuthGuard handles missing user info
      throw new InternalServerErrorException('Request did not specify user');
    }
    return request.user;
  },
);
