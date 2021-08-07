/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { TokenAuthGuard } from '../../../auth/token-auth.guard';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { FullApi } from '../../utils/fullapi-decorator';
import { Request } from 'express';
import {
  AlreadyInDBError,
  ForbiddenIdError,
  NotInDBError,
  PrimaryAliasDeletionForbiddenError,
} from '../../../errors/errors';
import { ConsoleLoggerService } from '../../../logger/console-logger.service';
import { NotesService } from '../../../notes/notes.service';
import { PermissionsService } from '../../../permissions/permissions.service';
import { AliasService } from '../../../notes/alias.service';
import { NewAliasDto } from '../../../notes/new-alias.dto';
import { ChangeAliasDto } from '../../../notes/change-alias.dto';
import { AliasDto } from '../../../notes/alias.dto';

@ApiTags('alias')
@ApiSecurity('token')
@Controller('alias')
export class AliasController {
  constructor(
    private readonly logger: ConsoleLoggerService,
    private aliasService: AliasService,
    private noteService: NotesService,
    private permissionsService: PermissionsService,
  ) {
    this.logger.setContext(AliasController.name);
  }

  @UseGuards(TokenAuthGuard)
  @Post()
  @ApiOkResponse({
    description: 'The new alias',
    type: AliasDto,
  })
  @FullApi
  async addAlias(
    @Req() req: Request,
    @Body() newAliasDto: NewAliasDto,
  ): Promise<AliasDto> {
    if (!req.user) {
      // We should never reach this, as the TokenAuthGuard handles missing user info
      throw new InternalServerErrorException('Request did not specify user');
    }
    try {
      const note = await this.noteService.getNoteByIdOrAlias(
        newAliasDto.noteIdOrAlias,
      );
      if (!this.permissionsService.isOwner(req.user, note)) {
        throw new UnauthorizedException('Reading note denied!');
      }
      const updatedNote = await this.aliasService.addAlias(
        note,
        newAliasDto.newAlias,
      );
      return await this.aliasService.toAliasDto(
        newAliasDto.newAlias,
        updatedNote,
      );
    } catch (e) {
      if (e instanceof AlreadyInDBError) {
        throw new BadRequestException(e.message);
      }
      if (e instanceof ForbiddenIdError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  @UseGuards(TokenAuthGuard)
  @Put(':alias')
  @ApiOkResponse({
    description: 'The updated alias',
    type: AliasDto,
  })
  @FullApi
  async makeAliasPrimary(
    @Req() req: Request,
    @Param('alias') alias: string,
    @Body() changeAliasDto: ChangeAliasDto,
  ): Promise<AliasDto> {
    if (!req.user) {
      // We should never reach this, as the TokenAuthGuard handles missing user info
      throw new InternalServerErrorException('Request did not specify user');
    }
    if (!changeAliasDto.primaryAlias) {
      throw new BadRequestException(
        `The field 'primaryAlias' must be set to 'true'.`,
      );
    }
    try {
      const note = await this.noteService.getNoteByIdOrAlias(alias);
      if (!this.permissionsService.isOwner(req.user, note)) {
        throw new UnauthorizedException('Reading note denied!');
      }
      const updatedNote = await this.aliasService.makeAliasPrimary(note, alias);
      return await this.aliasService.toAliasDto(alias, updatedNote);
    } catch (e) {
      if (e instanceof NotInDBError) {
        throw new NotFoundException(e.message);
      }
      if (e instanceof ForbiddenIdError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  @UseGuards(TokenAuthGuard)
  @Delete(':alias')
  @HttpCode(204)
  @ApiNoContentResponse({
    description: 'The alias was deleted',
  })
  @FullApi
  async removeAlias(
    @Req() req: Request,
    @Param('alias') alias: string,
  ): Promise<void> {
    if (!req.user) {
      // We should never reach this, as the TokenAuthGuard handles missing user info
      throw new InternalServerErrorException('Request did not specify user');
    }
    try {
      const note = await this.noteService.getNoteByIdOrAlias(alias);
      if (!this.permissionsService.isOwner(req.user, note)) {
        throw new UnauthorizedException('Reading note denied!');
      }
      await this.aliasService.removeAlias(note, alias);
    } catch (e) {
      if (e instanceof NotInDBError) {
        throw new NotFoundException(e.message);
      }
      if (e instanceof PrimaryAliasDeletionForbiddenError) {
        throw new BadRequestException(e.message);
      }
      if (e instanceof ForbiddenIdError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }
}
