/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  BadRequestException,
  Controller,
  Delete,
  Headers,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequestUser } from '../../../auth/request-user.decorator';
import {
  ClientError,
  MediaBackendError,
  NotInDBError,
  PermissionError,
} from '../../../errors/errors';
import { ConsoleLoggerService } from '../../../logger/console-logger.service';
import { MediaService } from '../../../media/media.service';
import { MulterFile } from '../../../media/multer-file.interface';
import { TokenAuthGuard } from '../../../auth/token-auth.guard';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MediaUploadUrlDto } from '../../../media/media-upload-url.dto';
import { User } from '../../../users/user.entity';
import {
  forbiddenDescription,
  successfullyDeletedDescription,
  unauthorizedDescription,
} from '../../utils/descriptions';
import { FullApi } from '../../utils/fullapi-decorator';

@ApiTags('media')
@ApiSecurity('token')
@Controller('media')
export class MediaController {
  constructor(
    private readonly logger: ConsoleLoggerService,
    private mediaService: MediaService,
  ) {
    this.logger.setContext(MediaController.name);
  }

  @UseGuards(TokenAuthGuard)
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiHeader({
    name: 'HedgeDoc-Note',
    description: 'ID or alias of the parent note',
  })
  @ApiCreatedResponse({
    description: 'The file was uploaded successfully',
    type: MediaUploadUrlDto,
  })
  @ApiUnauthorizedResponse({ description: unauthorizedDescription })
  @ApiForbiddenResponse({ description: forbiddenDescription })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(201)
  async uploadMedia(
    @RequestUser() user: User,
    @UploadedFile() file: MulterFile,
    @Headers('HedgeDoc-Note') noteId: string,
  ): Promise<MediaUploadUrlDto> {
    const username = user.userName;
    this.logger.debug(
      `Recieved filename '${file.originalname}' for note '${noteId}' from user '${username}'`,
      'uploadMedia',
    );
    try {
      const url = await this.mediaService.saveFile(
        file.buffer,
        username,
        noteId,
      );
      return this.mediaService.toMediaUploadUrlDto(url);
    } catch (e) {
      if (e instanceof ClientError || e instanceof NotInDBError) {
        throw new BadRequestException(e.message);
      }
      if (e instanceof MediaBackendError) {
        throw new InternalServerErrorException(
          'There was an error in the media backend',
        );
      }
      throw e;
    }
  }

  @UseGuards(TokenAuthGuard)
  @Delete(':filename')
  @HttpCode(204)
  @ApiNoContentResponse({ description: successfullyDeletedDescription })
  @FullApi
  async deleteMedia(
    @RequestUser() user: User,
    @Param('filename') filename: string,
  ): Promise<void> {
    const username = user.userName;
    try {
      this.logger.debug(
        `Deleting '${filename}' for user '${username}'`,
        'deleteMedia',
      );
      const mediaUpload = await this.mediaService.findUploadByFilename(
        filename,
      );
      if (mediaUpload.user.userName !== username) {
        this.logger.warn(
          `${username} tried to delete '${filename}', but is not the owner`,
          'deleteMedia',
        );
        throw new PermissionError(
          `File '${filename}' is not owned by '${username}'`,
        );
      }
      await this.mediaService.deleteFile(mediaUpload);
    } catch (e) {
      if (e instanceof PermissionError) {
        throw new UnauthorizedException(e.message);
      }
      if (e instanceof NotInDBError) {
        throw new NotFoundException(e.message);
      }
      if (e instanceof MediaBackendError) {
        throw new InternalServerErrorException(
          'There was an error in the media backend',
        );
      }
      throw e;
    }
  }
}
