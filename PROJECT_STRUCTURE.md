# Project Structure & File Descriptions

## Core Application Files

### `main.js` (212 lines)
**Main Electron Process**
- Creates and manages the application window
- Handles IPC (Inter-Process Communication) between main and renderer processes
- Exposes database operations via IPC handlers:
  - `db:addNote` - Add a new note
  - `db:getNotes` - Get all notes
  - `db:getNoteById` - Get a single note
  - `db:updateNote` - Update a note
  - `db:deleteNote` - Delete a note
  - `db:addNotesBulk` - Bulk insert using transaction
  - `db:searchNotes` - Search notes
  - `db:getStats` - Get database statistics
  - `db:syncWithBackend` - Sync with NestJS backend
- Manages app lifecycle (ready, window-all-closed, activate, before-quit)

### `preload.js` (99 lines)
**Preload Script - Security Bridge**
- Runs in isolated context with access to both Node.js and DOM APIs
- Uses `contextBridge` to securely expose APIs to renderer process
- Exposes `window.electronAPI` object with all database operations
- Follows Electron security best practices (contextIsolation, no nodeIntegration)

### `renderer.js` (332 lines)
**Renderer Process - Frontend Logic**
- Handles all UI interactions and event listeners
- Communicates with main process via `window.electronAPI`
- Implements:
  - Note creation, editing, deletion
  - Bulk note insertion with performance timing
  - Search functionality with debouncing
  - Backend synchronization
  - Statistics display
  - Error handling and user feedback

### `db.js` (381 lines)
**Database Module - SQLite Operations**
- Initializes SQLite database (`user-data.db`)
- Creates `notes` table with indexes for performance
- Implements all CRUD operations:
  - `addNote()` - Create a note
  - `getNoteById()` - Get by ID
  - `getNotes()` - Get all with sorting
  - `updateNote()` - Update existing
  - `deleteNote()` - Delete a note
- Bulk operations:
  - `addNotesBulk()` - Transaction-based bulk insert
- Sync operations:
  - `syncWithBackend()` - Sync with NestJS API
  - `getNotesToSync()` - Get pending notes
  - `markNotesAsSynced()` - Mark as synced
  - `markNotesSyncError()` - Mark sync errors
- Utility functions:
  - `searchNotes()` - Full-text search
  - `getStats()` - Database statistics
- Performance optimizations:
  - WAL mode enabled
  - Indexes on frequently queried columns
  - Prepared statements (automatic with better-sqlite3)

### `index.html` (402 lines)
**User Interface**
- Complete HTML structure with embedded CSS
- Modern, responsive design with gradient theme
- Sections:
  - Statistics dashboard (total, pending, synced)
  - Add note form
  - Bulk add button
  - Sync section with API URL input
  - Search box
  - Notes grid display
- Includes message display area for user feedback

## Configuration Files

### `package.json` (32 lines)
- Project metadata and dependencies
- Scripts: start, package, make, publish
- Dependencies: better-sqlite3, electron, electron-squirrel-startup
- DevDependencies: Electron Forge tools and plugins

### `forge.config.js` (58 lines)
**Electron Forge Configuration**
- Packager config (ASAR enabled)
- Publishers: GitHub publisher configured
- Makers: Squirrel (Windows), ZIP (macOS), DEB, RPM
- Plugins: Auto-unpack natives, Fuses for security

### `.gitignore` (61+ lines)
- Excludes node_modules, build outputs, database files
- Includes database files (*.db, *.db-shm, *.db-wal)

## Documentation Files

### `README.md`
Comprehensive documentation including:
- Features overview
- Installation instructions
- Database schema and indexes
- Usage examples for all operations
- Backend sync implementation guide
- Performance tips
- Security considerations
- Troubleshooting guide

### `QUICK_START.md`
Quick start guide for getting up and running in 5 minutes

### `PROJECT_STRUCTURE.md` (this file)
Detailed breakdown of all files and their purposes

## Example Files

### `examples/db-usage-example.js`
Standalone example demonstrating:
- Basic CRUD operations
- Bulk operations with performance timing
- Search functionality
- Sorting examples
- Statistics retrieval
- Sync examples (commented out)

### `examples/nestjs-backend-example.ts`
NestJS backend implementation examples:
- TypeORM implementation
- Prisma implementation (commented)
- Validation examples
- Transaction handling
- Error handling

## Database Files (Generated)

### `user-data.db`
SQLite database file (created automatically)
- Contains `notes` table
- Includes indexes for performance
- Location:
  - Development: Project root
  - Production: User's app data directory

### `user-data.db-shm` & `user-data.db-wal`
SQLite WAL mode files (created automatically)
- Shared memory file (.db-shm)
- Write-ahead log (.db-wal)
- These are temporary files used by SQLite

## Build Output (Generated)

### `out/`
Directory created by Electron Forge containing:
- Packaged application
- Installers for different platforms
- Distribution files

## Data Flow

```
Renderer Process (renderer.js)
    ↓ (via window.electronAPI)
Preload Script (preload.js)
    ↓ (via IPC)
Main Process (main.js)
    ↓ (direct require)
Database Module (db.js)
    ↓ (SQLite operations)
user-data.db
```

## Sync Flow

```
Renderer Process
    ↓ (user clicks sync)
Main Process (IPC handler)
    ↓ (calls db.syncWithBackend)
Database Module
    ↓ (fetch API)
NestJS Backend (/api/sync)
    ↓ (upsert operations)
PostgreSQL Database
```

## Security Features

1. **Context Isolation**: Enabled in main.js
2. **Node Integration**: Disabled in main.js
3. **Preload Script**: Uses contextBridge for secure API exposure
4. **SQL Injection Prevention**: All queries use parameterized statements
5. **XSS Prevention**: HTML escaping in renderer.js
6. **CSP**: Content Security Policy in index.html

## Performance Features

1. **WAL Mode**: Write-Ahead Logging for better concurrency
2. **Indexes**: On created_at, sync_status, and title columns
3. **Transactions**: For bulk operations
4. **Prepared Statements**: Automatic with better-sqlite3
5. **Debounced Search**: 300ms delay to reduce queries

## Key Design Decisions

1. **Offline-First**: All data stored locally, sync is optional
2. **Sync Status Tracking**: Each note tracks its sync status
3. **Error Handling**: Graceful handling of offline scenarios
4. **Transaction Support**: Bulk operations use transactions
5. **Modular Design**: Database logic separated into db.js module

