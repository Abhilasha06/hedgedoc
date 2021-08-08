/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';
import { Identity } from './identity.entity';
import { ConsoleLoggerService } from '../logger/console-logger.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderType } from './provider-type.enum';
import { FunctionalityDisabled, NotInDBError } from '../errors/errors';
import authConfiguration, { AuthConfig } from '../config/auth.config';
import { getIdentityFromUser } from './utils';
import { checkPassword, hashPassword } from '../utils/password';

@Injectable()
export class IdentityService {
  constructor(
    private readonly logger: ConsoleLoggerService,
    @InjectRepository(Identity)
    private identityRepository: Repository<Identity>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @Inject(authConfiguration.KEY)
    private authConfig: AuthConfig,
  ) {
    this.logger.setContext(IdentityService.name);
  }

  /**
   * @async
   * Create a new identity for internal auth
   * @param {User} user - the user the identity should be added to
   * @param {string} password - the password the identity should have
   * @throws {FunctionalityDisabled} user registration is disabled
   */
  async createInternalIdentity(
    user: User,
    password: string,
  ): Promise<Identity> {
    if (!this.authConfig.email.enableRegister) {
      this.logger.debug('User registration is disabled.');
      throw new FunctionalityDisabled('User registration is disabled.');
    }
    const identity = Identity.create(ProviderType.INTERNAL);
    identity.passwordHash = await hashPassword(password);
    identity.user = user;
    return await this.identityRepository.save(identity);
  }

  /**
   * @async
   * Change the internal password of the specified the user
   * @param {User} user - the user, which identity should be updated
   * @param {string} newPassword - the new password
   * @throws {FunctionalityDisabled} user login is disabled
   * @throws {NotInDBError} the specified user has no internal identity
   */
  async changeInternalPassword(
    user: User,
    newPassword: string,
  ): Promise<Identity> {
    if (!this.authConfig.email.enableLogin) {
      this.logger.debug('User login is disabled.');
      throw new FunctionalityDisabled('User login is disabled.');
    }
    const internalIdentity: Identity | undefined = getIdentityFromUser(
      user,
      ProviderType.INTERNAL,
    );
    if (internalIdentity === undefined) {
      this.logger.debug('This user has no internal identity.');
      throw new NotInDBError('This user has no internal identity.');
    }
    internalIdentity.passwordHash = await hashPassword(newPassword);
    return await this.identityRepository.save(internalIdentity);
  }

  /**
   * @async
   * Login the a user with their username and password
   * @param {string} username - the username to use
   * @param {string} password - the password to use
   */
  async loginWithInternalIdentity(
    username: string,
    password: string,
  ): Promise<User> {
    if (!this.authConfig.email.enableLogin) {
      this.logger.debug('User login is disabled.');
      throw new FunctionalityDisabled('User login is disabled.');
    }
    const user = await this.userRepository.findOne({
      where: {
        userName: username,
      },
    });
    if (user === undefined) {
      this.logger.debug(
        `The user with the username ${username} does not exist`,
        'loginWithInternalIdentity',
      );
      throw new NotInDBError(
        'This username and password combination did not work.',
      );
    }
    const internalIdentity: Identity | undefined = getIdentityFromUser(
      user,
      ProviderType.INTERNAL,
    );
    if (internalIdentity === undefined) {
      this.logger.debug(
        `The user with the username ${username} does not have a internal identity.`,
        'loginWithInternalIdentity',
      );
      throw new NotInDBError(
        'This username and password combination did not work.',
      );
    }
    if (!(await checkPassword(password, internalIdentity.passwordHash ?? ''))) {
      this.logger.debug(
        `The user with the username ${username} has another password.`,
        'loginWithInternalIdentity',
      );
      throw new NotInDBError(
        'This username and password combination did not work.',
      );
    }
    return user;
  }
}
