/**
 * NestJS Backend Example for Sync Endpoint
 * 
 * This file shows how to implement the /api/sync endpoint
 * in your NestJS backend to receive data from the Electron app.
 * 
 * Prerequisites:
 * - NestJS installed
 * - PostgreSQL database configured
 * - TypeORM or Prisma set up
 * 
 * Installation:
 * npm install @nestjs/common @nestjs/core @nestjs/platform-express
 * npm install typeorm pg @nestjs/typeorm
 */

import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './note.entity';

/**
 * Note Entity (TypeORM example)
 * 
 * This should match the structure of notes from the Electron app
 */
// @Entity('notes')
// export class Note {
//   @PrimaryGeneratedColumn()
//   id: number;
// 
//   @Column()
//   title: string;
// 
//   @Column('text', { nullable: true })
//   content: string;
// 
//   @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
//   created_at: Date;
// 
//   @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
//   updated_at: Date;
// 
//   @Column('timestamp', { nullable: true })
//   synced_at: Date;
// 
//   @Column({ default: 'pending' })
//   sync_status: string;
// }

@Controller('api')
export class SyncController {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
  ) {}

  /**
   * Sync endpoint - receives notes from Electron app
   * 
   * POST /api/sync
   * Body: { notes: Note[] }
   * 
   * Returns: { syncedIds: number[], failedIds: number[], message: string }
   */
  @Post('sync')
  async sync(@Body() body: { notes: any[] }) {
    const { notes } = body;

    if (!notes || !Array.isArray(notes)) {
      throw new HttpException(
        'Invalid request: notes array is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const syncedIds: number[] = [];
    const failedIds: number[] = [];

    // Process each note
    for (const note of notes) {
      try {
        // Check if note exists (by ID from Electron app)
        const existingNote = await this.notesRepository.findOne({
          where: { id: note.id },
        });

        if (existingNote) {
          // Update existing note
          existingNote.title = note.title;
          existingNote.content = note.content;
          existingNote.updated_at = new Date(note.updated_at);
          existingNote.synced_at = new Date();
          existingNote.sync_status = 'synced';
          
          await this.notesRepository.save(existingNote);
        } else {
          // Create new note
          const newNote = this.notesRepository.create({
            id: note.id, // Use the ID from Electron app
            title: note.title,
            content: note.content,
            created_at: new Date(note.created_at),
            updated_at: new Date(note.updated_at),
            synced_at: new Date(),
            sync_status: 'synced',
          });
          
          await this.notesRepository.save(newNote);
        }

        syncedIds.push(note.id);
      } catch (error) {
        console.error(`Failed to sync note ${note.id}:`, error);
        failedIds.push(note.id);
      }
    }

    return {
      syncedIds,
      failedIds,
      message: `Synced ${syncedIds.length} notes, ${failedIds.length} failed`,
    };
  }

  /**
   * Alternative: Using upsert for simpler code
   */
  @Post('sync-v2')
  async syncV2(@Body() body: { notes: any[] }) {
    const { notes } = body;

    if (!notes || !Array.isArray(notes)) {
      throw new HttpException(
        'Invalid request: notes array is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const syncedIds: number[] = [];
    const failedIds: number[] = [];

    // Use transaction for better performance
    const queryRunner = this.notesRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const note of notes) {
        try {
          // Upsert: Insert or update
          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(Note)
            .values({
              id: note.id,
              title: note.title,
              content: note.content,
              created_at: new Date(note.created_at),
              updated_at: new Date(note.updated_at),
              synced_at: new Date(),
              sync_status: 'synced',
            })
            .orUpdate(
              ['title', 'content', 'updated_at', 'synced_at', 'sync_status'],
              ['id'],
            )
            .execute();

          syncedIds.push(note.id);
        } catch (error) {
          console.error(`Failed to sync note ${note.id}:`, error);
          failedIds.push(note.id);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new HttpException(
        'Sync transaction failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }

    return {
      syncedIds,
      failedIds,
      message: `Synced ${syncedIds.length} notes, ${failedIds.length} failed`,
    };
  }
}

/**
 * Example Prisma implementation (alternative to TypeORM)
 */
// import { PrismaClient } from '@prisma/client';
// 
// const prisma = new PrismaClient();
// 
// @Controller('api')
// export class SyncController {
//   @Post('sync')
//   async sync(@Body() body: { notes: any[] }) {
//     const { notes } = body;
//     const syncedIds: number[] = [];
//     const failedIds: number[] = [];
// 
//     for (const note of notes) {
//       try {
//         await prisma.note.upsert({
//           where: { id: note.id },
//           update: {
//             title: note.title,
//             content: note.content,
//             updated_at: new Date(note.updated_at),
//             synced_at: new Date(),
//             sync_status: 'synced',
//           },
//           create: {
//             id: note.id,
//             title: note.title,
//             content: note.content,
//             created_at: new Date(note.created_at),
//             updated_at: new Date(note.updated_at),
//             synced_at: new Date(),
//             sync_status: 'synced',
//           },
//         });
//         syncedIds.push(note.id);
//       } catch (error) {
//         failedIds.push(note.id);
//       }
//     }
// 
//     return {
//       syncedIds,
//       failedIds,
//       message: `Synced ${syncedIds.length} notes, ${failedIds.length} failed`,
//     };
//   }
// }

/**
 * Example with validation using class-validator
 */
// import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
// import { Type } from 'class-transformer';
// 
// class NoteDto {
//   @IsNotEmpty()
//   id: number;
// 
//   @IsNotEmpty()
//   title: string;
// 
//   content?: string;
// 
//   @IsNotEmpty()
//   created_at: string;
// 
//   @IsNotEmpty()
//   updated_at: string;
// }
// 
// class SyncDto {
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => NoteDto)
//   notes: NoteDto[];
// }
// 
// @Post('sync')
// async sync(@Body() body: SyncDto) {
//   // ... implementation
// }

