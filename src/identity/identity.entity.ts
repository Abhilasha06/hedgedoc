/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { ProviderType } from './provider-type.enum';

@Entity()
export class Identity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne((_) => User, (user) => user.identities, {
    onDelete: 'CASCADE', // This deletes the Identity, when the associated User is deleted
  })
  user: User;

  @Column()
  providerType: string;

  @Column()
  providerName: string;

  @Column()
  syncSource: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    nullable: true,
    type: 'text',
  })
  providerUserId: string | null;

  @Column({
    nullable: true,
    type: 'text',
  })
  oAuthAccessToken: string | null;

  @Column({
    nullable: true,
    type: 'text',
  })
  passwordHash: string | null;

  public static create(providerType: ProviderType): Identity {
    const newIdentity = new Identity();
    newIdentity.providerType = providerType;
    return newIdentity;
  }
}
