/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AliasController } from './alias.controller';
import { NotesService } from '../../../notes/notes.service';
import {
  getConnectionToken,
  getRepositoryToken,
  TypeOrmModule,
} from '@nestjs/typeorm';
import { Note } from '../../../notes/note.entity';
import { Tag } from '../../../notes/tag.entity';
import { Alias } from '../../../notes/alias.entity';
import { User } from '../../../users/user.entity';
import { RevisionsModule } from '../../../revisions/revisions.module';
import { UsersModule } from '../../../users/users.module';
import { GroupsModule } from '../../../groups/groups.module';
import { LoggerModule } from '../../../logger/logger.module';
import { PermissionsModule } from '../../../permissions/permissions.module';
import { HistoryModule } from '../../../history/history.module';
import { MediaModule } from '../../../media/media.module';
import { ConfigModule } from '@nestjs/config';
import appConfigMock from '../../../config/mock/app.config.mock';
import mediaConfigMock from '../../../config/mock/media.config.mock';
import { Revision } from '../../../revisions/revision.entity';
import { Edit } from '../../../revisions/edit.entity';
import { AuthToken } from '../../../auth/auth-token.entity';
import { Identity } from '../../../users/identity.entity';
import { HistoryEntry } from '../../../history/history-entry.entity';
import { NoteGroupPermission } from '../../../permissions/note-group-permission.entity';
import { NoteUserPermission } from '../../../permissions/note-user-permission.entity';
import { Group } from '../../../groups/group.entity';
import { MediaUpload } from '../../../media/media-upload.entity';
import { Session } from '../../../users/session.entity';
import { Author } from '../../../authors/author.entity';
import { AliasService } from '../../../notes/alias.service';

describe('AliasController', () => {
  let controller: AliasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AliasController],
      providers: [
        AliasService,
        NotesService,
        {
          provide: getRepositoryToken(Note),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Alias),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
      ],
      imports: [
        RevisionsModule,
        UsersModule,
        GroupsModule,
        LoggerModule,
        PermissionsModule,
        HistoryModule,
        MediaModule,
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfigMock, mediaConfigMock],
        }),
        TypeOrmModule.forRoot(),
      ],
    })
      .overrideProvider(getConnectionToken())
      .useValue({})
      .overrideProvider(getRepositoryToken(Revision))
      .useValue({})
      .overrideProvider(getRepositoryToken(Edit))
      .useValue({})
      .overrideProvider(getRepositoryToken(User))
      .useValue({})
      .overrideProvider(getRepositoryToken(AuthToken))
      .useValue({})
      .overrideProvider(getRepositoryToken(Identity))
      .useValue({})
      .overrideProvider(getRepositoryToken(Note))
      .useValue({})
      .overrideProvider(getRepositoryToken(Tag))
      .useValue({})
      .overrideProvider(getRepositoryToken(HistoryEntry))
      .useValue({})
      .overrideProvider(getRepositoryToken(NoteGroupPermission))
      .useValue({})
      .overrideProvider(getRepositoryToken(NoteUserPermission))
      .useValue({})
      .overrideProvider(getRepositoryToken(Group))
      .useValue({})
      .overrideProvider(getRepositoryToken(MediaUpload))
      .useValue({})
      .overrideProvider(getRepositoryToken(Alias))
      .useValue({})
      .overrideProvider(getRepositoryToken(Session))
      .useValue({})
      .overrideProvider(getRepositoryToken(Author))
      .useValue({})
      .compile();

    controller = module.get<AliasController>(AliasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
