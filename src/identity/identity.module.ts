/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { Identity } from './identity.entity';
import { IdentityService } from './identity.service';
import { LocalAuthGuard } from './internal/local-auth.guard';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    TypeOrmModule.forFeature([Identity, User]),
    UsersModule,
    PassportModule,
  ],
  controllers: [],
  providers: [IdentityService, LocalAuthGuard],
  exports: [IdentityService, LocalAuthGuard],
})
export class IdentityModule {}
