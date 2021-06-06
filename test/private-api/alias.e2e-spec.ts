/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { NotesService } from '../../src/notes/notes.service';
import { User } from '../../src/users/user.entity';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import mediaConfigMock from '../../src/config/mock/media.config.mock';
import appConfigMock from '../../src/config/mock/app.config.mock';
import authConfigMock from '../../src/config/mock/auth.config.mock';
import customizationConfigMock from '../../src/config/mock/customization.config.mock';
import externalConfigMock from '../../src/config/mock/external-services.config.mock';
import { PrivateApiModule } from '../../src/api/private/private-api.module';
import { NotesModule } from '../../src/notes/notes.module';
import { PermissionsModule } from '../../src/permissions/permissions.module';
import { GroupsModule } from '../../src/groups/groups.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../../src/logger/logger.module';
import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { UsersService } from '../../src/users/users.service';
import { AliasService } from '../../src/notes/alias.service';
import { ChangeAliasDto } from '../../src/notes/change-alias.dto';
import { NewAliasDto } from '../../src/notes/new-alias.dto';

describe('Alias', () => {
  let app: INestApplication;
  let aliasService: AliasService;
  let notesService: NotesService;
  let user: User;
  let content: string;
  let forbiddenNoteId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            mediaConfigMock,
            appConfigMock,
            authConfigMock,
            customizationConfigMock,
            externalConfigMock,
          ],
        }),
        PrivateApiModule,
        NotesModule,
        PermissionsModule,
        GroupsModule,
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: './hedgedoc-e2e-private-alias.sqlite',
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        }),
        LoggerModule,
        AuthModule,
        UsersModule,
      ],
    }).compile();

    const config = moduleRef.get<ConfigService>(ConfigService);
    forbiddenNoteId = config.get('appConfig').forbiddenNoteIds[0];
    app = moduleRef.createNestApplication();
    await app.init();
    aliasService = moduleRef.get(AliasService);
    notesService = moduleRef.get(NotesService);
    const userService = moduleRef.get(UsersService);
    user = await userService.createUser('hardcoded', 'Testy');
    content = 'This is a test note.';
  });

  describe('POST /alias', () => {
    const testAlias = 'aliasTest';
    const newAliasDto: NewAliasDto = {
      noteIdOrAlias: testAlias,
      newAlias: '',
    };
    let publicId = '';
    beforeAll(async () => {
      const note = await notesService.createNote(content, testAlias, user);
      publicId = note.publicId;
    });

    it('works with normal alias', async () => {
      const newAlias = 'normalAlias';
      newAliasDto.newAlias = newAlias;
      const metadata = await request(app.getHttpServer())
        .post(`/alias`)
        .set('Content-Type', 'application/json')
        .send(newAliasDto)
        .expect(201);
      expect(metadata.body.name).toEqual(newAlias);
      expect(metadata.body.primaryAlias).toBeFalsy();
      expect(metadata.body.noteId).toEqual(publicId);
    });

    describe('fails', () => {
      it('because of a forbidden alias', async () => {
        newAliasDto.newAlias = forbiddenNoteId;
        await request(app.getHttpServer())
          .post(`/alias`)
          .set('Content-Type', 'application/json')
          .send(newAliasDto)
          .expect(400);
      });
      it('because of a alias that is a public id', async () => {
        newAliasDto.newAlias = publicId;
        await request(app.getHttpServer())
          .post(`/alias`)
          .set('Content-Type', 'application/json')
          .send(newAliasDto)
          .expect(400);
      });
    });
  });

  describe('PUT /alias/{alias}', () => {
    const testAlias = 'aliasTest2';
    const newAlias = 'normalAlias2';
    const changeAliasDto: ChangeAliasDto = {
      primaryAlias: true,
    };
    let publicId = '';
    beforeAll(async () => {
      const note = await notesService.createNote(content, testAlias, user);
      publicId = note.publicId;
      await aliasService.addAlias(note, newAlias);
    });

    it('works with normal alias', async () => {
      const metadata = await request(app.getHttpServer())
        .put(`/alias/${newAlias}`)
        .set('Content-Type', 'application/json')
        .send(changeAliasDto)
        .expect(200);
      expect(metadata.body.name).toEqual(newAlias);
      expect(metadata.body.primaryAlias).toBeTruthy();
      expect(metadata.body.noteId).toEqual(publicId);
    });

    describe('fails', () => {
      it('with unknown alias', async () => {
        await request(app.getHttpServer())
          .put(`/alias/i_dont_exist`)
          .set('Content-Type', 'application/json')
          .send(changeAliasDto)
          .expect(404);
      });
      it('with primaryAlias false', async () => {
        changeAliasDto.primaryAlias = false;
        await request(app.getHttpServer())
          .put(`/alias/${newAlias}`)
          .set('Content-Type', 'application/json')
          .send(changeAliasDto)
          .expect(400);
      });
    });
  });

  describe('DELETE /alias/{alias}', () => {
    const testAlias = 'aliasTest3';
    const newAlias = 'normalAlias3';
    beforeAll(async () => {
      const note = await notesService.createNote(content, testAlias, user);
      await aliasService.addAlias(note, newAlias);
    });

    it('works with normal alias', async () => {
      await request(app.getHttpServer())
        .delete(`/alias/${newAlias}`)
        .expect(204);
    });

    it('fails with unknown alias', async () => {
      await request(app.getHttpServer())
        .delete(`/alias/i_dont_exist`)
        .expect(404);
    });

    it('fails with primary alias (if it is not the only one)', async () => {
      const note = await notesService.getNoteByIdOrAlias(testAlias);
      await aliasService.addAlias(note, newAlias);
      await request(app.getHttpServer())
        .delete(`/alias/${testAlias}`)
        .expect(400);
    });

    it('works with primary alias (if it is the only one)', async () => {
      await request(app.getHttpServer())
        .delete(`/alias/${newAlias}`)
        .expect(204);
      await request(app.getHttpServer())
        .delete(`/alias/${testAlias}`)
        .expect(204);
    });
  });
});
