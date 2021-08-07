/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AliasDto {
  /**
   * The name of the alias
   */
  @IsString()
  @ApiProperty()
  name: string;

  /**
   * Is the alias the primary alias or not
   */
  @IsBoolean()
  @ApiProperty()
  primaryAlias: boolean;

  /**
   * The public id of the note the alias is associated with
   */
  @IsString()
  @ApiProperty()
  noteId: string;
}
