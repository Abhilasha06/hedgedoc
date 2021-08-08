/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { RegisterDto } from '../../../identity/internal/register.dto';
import { ConsoleLoggerService } from '../../../logger/console-logger.service';
import { UsersService } from '../../../users/users.service';
import { IdentityService } from '../../../identity/identity.service';
import { ChangePasswordDto } from '../../../identity/internal/change-password.dto';
import { FunctionalityDisabled, NotInDBError } from '../../../errors/errors';
import { LoginDto } from '../../../identity/internal/login.dto';
import { LocalAuthGuard } from '../../../identity/internal/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly logger: ConsoleLoggerService,
    private usersService: UsersService,
    private identityService: IdentityService,
  ) {
    this.logger.setContext(AuthController.name);
  }

  @Post('internal')
  async registerUser(@Body() registerDto: RegisterDto): Promise<void> {
    try {
      const user = await this.usersService.createUser(
        registerDto.username,
        registerDto.displayname,
      );
      await this.identityService.createInternalIdentity(
        user,
        registerDto.password,
      );
      return;
    } catch (e) {
      if (e instanceof FunctionalityDisabled) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  @Put('internal')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    try {
      // ToDo: get real user
      const user = await this.usersService.getUserByUsername('hardcoded');
      await this.identityService.changeInternalPassword(
        user,
        changePasswordDto.newPassword,
      );
      return;
    } catch (e) {
      if (e instanceof FunctionalityDisabled) {
        throw new BadRequestException(e.message);
      }
      if (e instanceof NotInDBError) {
        throw new NotFoundException(e.message);
      }
      throw e;
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('internal/login')
  login(@Body() loginDto: LoginDto): string {
    return 'This should be your session';
  }
}
