/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { ConsoleLoggerService } from '../logger/console-logger.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Note } from './note.entity';
import { Repository } from 'typeorm';
import { Alias } from './alias.entity';
import {
  AlreadyInDBError,
  NotInDBError,
  PrimaryAliasDeletionForbiddenError,
} from '../errors/errors';
import { getPrimaryAlias } from './utils';
import { NotesService } from './notes.service';
import { AliasDto } from './alias.dto';

@Injectable()
export class AliasService {
  constructor(
    private readonly logger: ConsoleLoggerService,
    @InjectRepository(Note) private noteRepository: Repository<Note>,
    @InjectRepository(Alias) private aliasRepository: Repository<Alias>,
    @Inject(NotesService) private notesService: NotesService,
  ) {
    this.logger.setContext(AliasService.name);
  }

  /**
   * @async
   * Add the specified alias to the note.
   * @param {Note} note - the note to add the alias to
   * @param {string} alias - the alias to add to the note
   * @throws {AlreadyInDBError} the alias is already in use.
   */
  async addAlias(note: Note, alias: string): Promise<Note> {
    this.notesService.checkNoteIdOrAlias(alias);

    const foundAlias = await this.aliasRepository.findOne({
      where: { name: alias },
    });
    if (foundAlias !== undefined) {
      this.logger.debug(`The alias '${alias}' is already used.`, 'addAlias');
      throw new AlreadyInDBError(`The alias '${alias}' is already used.`);
    }

    const foundNote = await this.noteRepository.findOne({
      where: { publicId: alias },
    });
    if (foundNote !== undefined) {
      this.logger.debug(
        `The alias '${alias}' is already a public id.`,
        'addAlias',
      );
      throw new AlreadyInDBError(
        `The alias '${alias}' is already a public id.`,
      );
    }

    if (note.aliases.length === 0) {
      // the first alias is automatically made the primary alias
      note.aliases.push(Alias.create(alias, true));
    } else {
      note.aliases.push(Alias.create(alias));
    }

    return await this.noteRepository.save(note);
  }

  /**
   * @async
   * Set the specified alias as the primary alias of the note.
   * @param {Note} note - the note to change the primary alias
   * @param {string} alias - the alias to be the new primary alias of the note
   * @throws {NotInDBError} the alias is not part of this note.
   */
  async makeAliasPrimary(note: Note, alias: string): Promise<Note> {
    let newPrimaryFound = false;
    let oldPrimaryId = '';
    let newPrimaryId = '';

    for (const anAlias of note.aliases) {
      // found old primary
      if (anAlias.primary) {
        oldPrimaryId = anAlias.id;
      }

      // found new primary
      if (anAlias.name === alias) {
        newPrimaryFound = true;
        newPrimaryId = anAlias.id;
      }
    }

    if (!newPrimaryFound) {
      // the provided alias is not already an alias of this note
      this.logger.debug(
        `The alias '${alias}' is not used by this note.`,
        'makeAliasPrimary',
      );
      throw new NotInDBError(`The alias '${alias}' is not used by this note.`);
    }

    const oldPrimary = await this.aliasRepository.findOne(oldPrimaryId);
    const newPrimary = await this.aliasRepository.findOne(newPrimaryId);

    if (!oldPrimary || !newPrimary) {
      throw new Error('This should not happen!');
    }

    oldPrimary.primary = false;
    newPrimary.primary = true;

    await this.aliasRepository.save(oldPrimary);
    await this.aliasRepository.save(newPrimary);

    return await this.notesService.getNoteByIdOrAlias(note.publicId);
  }

  /**
   * @async
   * Remove the specified alias from the note.
   * @param {Note} note - the note to remove the alias from
   * @param {string} alias - the alias to remove from the note
   * @throws {NotInDBError} the alias is not part of this note.
   * @throws {PrimaryAliasDeletionForbiddenError} the primary alias can only be deleted if it's the only alias
   */
  async removeAlias(note: Note, alias: string): Promise<Note> {
    const primaryAlias = getPrimaryAlias(note);

    if (primaryAlias === alias && note.aliases.length !== 1) {
      this.logger.debug(
        `The alias '${alias}' is the primary alias, which can only be removed if it's the only alias.`,
        'removeAlias',
      );
      throw new PrimaryAliasDeletionForbiddenError(
        `The alias '${alias}' is the primary alias, which can only be removed if it's the only alias.`,
      );
    }

    const filteredAliases = note.aliases.filter(
      (anAlias) => anAlias.name !== alias,
    );
    if (note.aliases.length === filteredAliases.length) {
      this.logger.debug(
        `The alias '${alias}' is not used by this note or is the primary alias, that can't be removed.`,
        'removeAlias',
      );
      throw new NotInDBError(
        `The alias '${alias}' is not used by this note or is the primary alias, that can't be removed.`,
      );
    }
    const aliasToDelete = note.aliases.find(
      (anAlias) => anAlias.name === alias,
    );
    if (aliasToDelete !== undefined) {
      await this.aliasRepository.remove(aliasToDelete);
    }
    note.aliases = filteredAliases;
    return await this.noteRepository.save(note);
  }

  /**
   * @async
   * Build AliasDto from a note.
   * @param {string} alias - the alias to use
   * @param {Note} note - the note to use
   * @return {NoteDto} the built AliasDto
   * @throws {NotInDBError} the specified alias does not exist
   */
  async toAliasDto(alias: string, note: Note): Promise<AliasDto> {
    const foundAlias = await this.aliasRepository.findOne({
      where: { name: alias },
    });
    if (foundAlias === undefined) {
      this.logger.debug(`The alias ${alias} does not exist.`);
      throw new NotInDBError(`The alias ${alias} does not exist.`);
    }
    return {
      name: foundAlias.name,
      primaryAlias: foundAlias.primary,
      noteId: note.publicId,
    };
  }
}
