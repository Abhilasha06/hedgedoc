/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeAliasDto {
  /**
   * Whether the alias should become the primary alias or not
   */
  @IsBoolean()
  @ApiProperty()
  primaryAlias: boolean;
}
