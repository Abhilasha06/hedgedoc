/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { User } from '../users/user.entity';
import { Note } from './note.entity';
import { Alias } from './alias.entity';
import {
  AlreadyInDBError,
  ForbiddenIdError,
  NotInDBError,
  PrimaryAliasDeletionForbiddenError,
} from '../errors/errors';
import { Repository } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tag } from './tag.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfigMock from '../config/mock/app.config.mock';
import { LoggerModule } from '../logger/logger.module';
import { UsersModule } from '../users/users.module';
import { GroupsModule } from '../groups/groups.module';
import { RevisionsModule } from '../revisions/revisions.module';
import { AuthToken } from '../auth/auth-token.entity';
import { Identity } from '../users/identity.entity';
import { Edit } from '../revisions/edit.entity';
import { Revision } from '../revisions/revision.entity';
import { NoteGroupPermission } from '../permissions/note-group-permission.entity';
import { NoteUserPermission } from '../permissions/note-user-permission.entity';
import { Group } from '../groups/group.entity';
import { Session } from '../users/session.entity';
import { Author } from '../authors/author.entity';
import { AliasService } from './alias.service';

describe('AliasService', () => {
  let service: AliasService;
  let noteRepo: Repository<Note>;
  let aliasRepo: Repository<Alias>;
  let forbiddenNoteId: string;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AliasService,
        NotesService,
        {
          provide: getRepositoryToken(Note),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Alias),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Tag),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfigMock],
        }),
        LoggerModule,
        UsersModule,
        GroupsModule,
        RevisionsModule,
      ],
    })
      .overrideProvider(getRepositoryToken(Note))
      .useClass(Repository)
      .overrideProvider(getRepositoryToken(Tag))
      .useClass(Repository)
      .overrideProvider(getRepositoryToken(Alias))
      .useClass(Repository)
      .overrideProvider(getRepositoryToken(User))
      .useClass(Repository)
      .overrideProvider(getRepositoryToken(AuthToken))
      .useValue({})
      .overrideProvider(getRepositoryToken(Identity))
      .useValue({})
      .overrideProvider(getRepositoryToken(Edit))
      .useValue({})
      .overrideProvider(getRepositoryToken(Revision))
      .useClass(Repository)
      .overrideProvider(getRepositoryToken(NoteGroupPermission))
      .useValue({})
      .overrideProvider(getRepositoryToken(NoteUserPermission))
      .useValue({})
      .overrideProvider(getRepositoryToken(Group))
      .useClass(Repository)
      .overrideProvider(getRepositoryToken(Session))
      .useValue({})
      .overrideProvider(getRepositoryToken(Author))
      .useValue({})
      .compile();

    const config = module.get<ConfigService>(ConfigService);
    forbiddenNoteId = config.get('appConfig').forbiddenNoteIds[0];
    service = module.get<AliasService>(AliasService);
    noteRepo = module.get<Repository<Note>>(getRepositoryToken(Note));
    aliasRepo = module.get<Repository<Alias>>(getRepositoryToken(Alias));
  });
  describe('addAlias', () => {
    const alias = 'testAlias';
    const alias2 = 'testAlias2';
    const user = User.create('hardcoded', 'Testy') as User;
    describe('works', () => {
      it('with no alias already present', async () => {
        const note = Note.create(user);
        jest
          .spyOn(noteRepo, 'save')
          .mockImplementationOnce(async (note: Note): Promise<Note> => note);
        jest.spyOn(noteRepo, 'findOne').mockResolvedValueOnce(undefined);
        jest.spyOn(aliasRepo, 'findOne').mockResolvedValueOnce(undefined);
        const savedNote = await service.addAlias(note, alias);
        expect(savedNote.aliases).toHaveLength(1);
        expect(savedNote.aliases[0].name).toEqual(alias);
        expect(savedNote.aliases[0].primary).toBeTruthy();
      });
      it('with an primary alias already present', async () => {
        const note = Note.create(user, alias);
        jest
          .spyOn(noteRepo, 'save')
          .mockImplementationOnce(async (note: Note): Promise<Note> => note);
        jest.spyOn(noteRepo, 'findOne').mockResolvedValueOnce(undefined);
        jest.spyOn(aliasRepo, 'findOne').mockResolvedValueOnce(undefined);
        const savedNote = await service.addAlias(note, alias2);
        expect(savedNote.aliases).toHaveLength(2);
        expect(savedNote.aliases[0].name).toEqual(alias);
        expect(savedNote.aliases[0].primary).toBeTruthy();
        expect(savedNote.aliases[1].name).toEqual(alias2);
      });
    });
    describe('fails', () => {
      const note = Note.create(user, alias2);
      it('because of a already used alias', async () => {
        jest
          .spyOn(aliasRepo, 'findOne')
          .mockResolvedValueOnce(Alias.create(alias2));
        await expect(service.addAlias(note, alias2)).rejects.toThrow(
          AlreadyInDBError,
        );
      });
      it('because the alias is forbidden', async () => {
        await expect(service.addAlias(note, forbiddenNoteId)).rejects.toThrow(
          ForbiddenIdError,
        );
      });
    });
  });

  describe('removeAlias', () => {
    const alias = 'testAlias';
    const alias2 = 'testAlias2';
    const user = User.create('hardcoded', 'Testy') as User;
    describe('works', () => {
      const note = Note.create(user, alias);
      note.aliases.push(Alias.create(alias2));
      it('with two aliases', async () => {
        jest
          .spyOn(noteRepo, 'save')
          .mockImplementationOnce(async (note: Note): Promise<Note> => note);
        jest
          .spyOn(aliasRepo, 'remove')
          .mockImplementationOnce(
            async (alias: Alias): Promise<Alias> => alias,
          );
        const savedNote = await service.removeAlias(note, alias2);
        expect(savedNote.aliases).toHaveLength(1);
        expect(savedNote.aliases[0].name).toEqual(alias);
        expect(savedNote.aliases[0].primary).toBeTruthy();
      });
      it('with one alias, that is primary', async () => {
        jest
          .spyOn(noteRepo, 'save')
          .mockImplementationOnce(async (note: Note): Promise<Note> => note);
        jest
          .spyOn(aliasRepo, 'remove')
          .mockImplementationOnce(
            async (alias: Alias): Promise<Alias> => alias,
          );
        const savedNote = await service.removeAlias(note, alias);
        expect(savedNote.aliases).toHaveLength(0);
      });
    });
    describe('fails', () => {
      const note = Note.create(user, alias);
      note.aliases.push(Alias.create(alias2));
      it('because of a non-existent alias', async () => {
        await expect(service.removeAlias(note, 'non existent')).rejects.toThrow(
          NotInDBError,
        );
      });
      it('because the alias to be removed is primary and not the last one', async () => {
        await expect(service.removeAlias(note, alias)).rejects.toThrow(
          PrimaryAliasDeletionForbiddenError,
        );
      });
    });
  });

  describe('makeAliasPrimary', () => {
    const alias = Alias.create('testAlias', true);
    const alias2 = Alias.create('testAlias2');
    const user = User.create('hardcoded', 'Testy') as User;
    const note = Note.create(user, alias.name);
    note.aliases.push(alias2);
    it('works', async () => {
      jest
        .spyOn(aliasRepo, 'findOne')
        .mockResolvedValueOnce(alias)
        .mockResolvedValueOnce(alias2);
      jest
        .spyOn(aliasRepo, 'save')
        .mockImplementationOnce(async (alias: Alias): Promise<Alias> => alias)
        .mockImplementationOnce(async (alias: Alias): Promise<Alias> => alias);
      const createQueryBuilder = {
        leftJoinAndSelect: () => createQueryBuilder,
        where: () => createQueryBuilder,
        orWhere: () => createQueryBuilder,
        setParameter: () => createQueryBuilder,
        getOne: () => {
          return {
            ...note,
            aliases: note.aliases.map((anAlias) => {
              if (anAlias.primary) {
                anAlias.primary = false;
              }
              if (anAlias.name === alias2.name) {
                anAlias.primary = true;
              }
              return anAlias;
            }),
          };
        },
      };
      jest
        .spyOn(noteRepo, 'createQueryBuilder')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .mockImplementation(() => createQueryBuilder);
      const savedNote = await service.makeAliasPrimary(note, alias2.name);
      expect(savedNote.aliases).toHaveLength(2);
      expect(savedNote.aliases[0].name).toEqual(alias.name);
      expect(savedNote.aliases[0].primary).toBeFalsy();
      expect(savedNote.aliases[1].name).toEqual(alias2.name);
      expect(savedNote.aliases[1].primary).toBeTruthy();
    });
    it('fails, because of a non-existent alias', async () => {
      await expect(
        service.makeAliasPrimary(note, 'i_dont_exist'),
      ).rejects.toThrow(NotInDBError);
    });
  });

  describe('toAliasDto', () => {
    const aliasName = 'testAlias';
    const alias = Alias.create(aliasName, true);
    const user = User.create('hardcoded', 'Testy') as User;
    const note = Note.create(user, alias.name);
    it('works', async () => {
      jest.spyOn(aliasRepo, 'findOne').mockResolvedValueOnce(alias);
      const aliasDto = await service.toAliasDto(aliasName, note);
      expect(aliasDto.name).toEqual(aliasName);
      expect(aliasDto.primaryAlias).toBeTruthy();
      expect(aliasDto.noteId).toEqual(note.publicId);
    });
    it('fails, because the alias does not exist', async () => {
      jest.spyOn(aliasRepo, 'findOne').mockResolvedValueOnce(undefined);
      await expect(service.toAliasDto('i_dont_exist', note)).rejects.toThrow(
        NotInDBError,
      );
    });
  });
});
