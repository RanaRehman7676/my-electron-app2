/**
 * Database Module for Electron App
 * 
 * This module handles all SQLite database operations including:
 * - Database initialization and table creation
 * - CRUD operations for notes
 * - Bulk operations using transactions
 * - Performance optimizations (indexing)
 */

const path = require('path');
const Database = require('better-sqlite3');
const { app } = require('electron');

/**
 * Get the database path
 * In production, store in user's app data directory
 * In development, store in project directory
 */
const getDbPath = () => {
  if (app && app.isPackaged) {
    // Production: Use user's app data directory
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'user-data.db');
  } else {
    // Development: Use project directory
    return path.join(__dirname, 'user-data.db');
  }
};

// Initialize database connection
const dbPath = getDbPath();
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 * Creates the notes table with proper indexes for performance
 */
const initializeDatabase = () => {
  // Create notes table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME,
      sync_status TEXT DEFAULT 'pending' -- 'pending', 'synced', 'error'
    )
  `).run();

  // Create index on created_at for faster sorting and queries
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_notes_created_at 
    ON notes(created_at DESC)
  `).run();

  // Create index on sync_status for faster sync queries
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_notes_sync_status 
    ON notes(sync_status)
  `).run();

  // Create index on title for faster search operations
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_notes_title 
    ON notes(title)
  `).run();

  console.log('Database initialized successfully at:', dbPath);
};

// Initialize database on module load
initializeDatabase();

/**
 * Add a new note to the database
 * @param {string} title - Note title
 * @param {string} content - Note content
 * @returns {Object} The inserted note with generated ID
 */
const addNote = (title, content = '') => {
  const stmt = db.prepare(`
    INSERT INTO notes (title, content, sync_status)
    VALUES (?, ?, 'pending')
  `);
  
  const result = stmt.run(title, content);
  
  // Return the newly created note
  return getNoteById(result.lastInsertRowid);
};

/**
 * Get a single note by ID
 * @param {number} id - Note ID
 * @returns {Object|null} Note object or null if not found
 */
const getNoteById = (id) => {
  const stmt = db.prepare('SELECT * FROM notes WHERE id = ?');
  return stmt.get(id) || null;
};

/**
 * Get all notes, optionally sorted
 * @param {string} sortBy - Column to sort by (default: 'created_at')
 * @param {string} order - Sort order 'ASC' or 'DESC' (default: 'DESC')
 * @returns {Array} Array of note objects
 */
const getNotes = (sortBy = 'created_at', order = 'DESC') => {
  // Validate sort column to prevent SQL injection
  const allowedColumns = ['id', 'title', 'created_at', 'updated_at'];
  const sortColumn = allowedColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  const stmt = db.prepare(`
    SELECT * FROM notes 
    ORDER BY ${sortColumn} ${sortOrder}
  `);
  
  return stmt.all();
};

/**
 * Update an existing note
 * @param {number} id - Note ID
 * @param {string} title - New title
 * @param {string} content - New content
 * @returns {Object|null} Updated note or null if not found
 */
const updateNote = (id, title, content) => {
  const stmt = db.prepare(`
    UPDATE notes 
    SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP, sync_status = 'pending'
    WHERE id = ?
  `);
  
  const result = stmt.run(title, content, id);
  
  if (result.changes === 0) {
    return null; // Note not found
  }
  
  return getNoteById(id);
};

/**
 * Delete a note by ID
 * @param {number} id - Note ID
 * @returns {boolean} True if deleted, false if not found
 */
const deleteNote = (id) => {
  const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
};

/**
 * Insert multiple notes using a transaction for better performance
 * This is much faster than inserting notes one by one
 * @param {Array} notes - Array of {title, content} objects
 * @returns {Array} Array of inserted note IDs
 */
const addNotesBulk = (notes) => {
  const insertStmt = db.prepare(`
    INSERT INTO notes (title, content, sync_status)
    VALUES (?, ?, 'pending')
  `);
  
  // Use a transaction to ensure all inserts succeed or fail together
  const insertMany = db.transaction((notes) => {
    const ids = [];
    for (const note of notes) {
      const result = insertStmt.run(note.title, note.content || '');
      ids.push(result.lastInsertRowid);
    }
    return ids;
  });
  
  return insertMany(notes);
};

/**
 * Get notes that need to be synced (pending or error status)
 * @returns {Array} Array of notes that need syncing
 */
const getNotesToSync = () => {
  const stmt = db.prepare(`
    SELECT * FROM notes 
    WHERE sync_status IN ('pending', 'error')
    ORDER BY created_at ASC
  `);
  
  return stmt.all();
};

/**
 * Mark notes as synced after successful sync
 * @param {Array} ids - Array of note IDs that were synced
 * @returns {number} Number of notes marked as synced
 */
const markNotesAsSynced = (ids) => {
  if (!ids || ids.length === 0) return 0;
  
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`
    UPDATE notes 
    SET sync_status = 'synced', synced_at = CURRENT_TIMESTAMP
    WHERE id IN (${placeholders})
  `);
  
  const result = stmt.run(...ids);
  return result.changes;
};

/**
 * Mark notes sync as failed
 * @param {Array} ids - Array of note IDs that failed to sync
 * @returns {number} Number of notes marked with error status
 */
const markNotesSyncError = (ids) => {
  if (!ids || ids.length === 0) return 0;
  
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`
    UPDATE notes 
    SET sync_status = 'error'
    WHERE id IN (${placeholders})
  `);
  
  const result = stmt.run(...ids);
  return result.changes;
};

/**
 * Sync local data with remote NestJS + PostgreSQL backend
 * @param {string} apiUrl - Base URL of the NestJS API (e.g., 'http://localhost:3000')
 * @returns {Promise<Object>} Sync result with success count and errors
 */
const syncWithBackend = async (apiUrl = 'http://localhost:3000') => {
  try {
    // Get all notes that need syncing
    const notesToSync = getNotesToSync();
    
    if (notesToSync.length === 0) {
      return { success: true, synced: 0, message: 'No notes to sync' };
    }
    
    // Prepare data for API (remove SQLite-specific fields)
    const syncData = notesToSync.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      created_at: note.created_at,
      updated_at: note.updated_at
    }));
    
    // Send to NestJS backend
    const response = await fetch(`${apiUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes: syncData }),
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Mark successfully synced notes
    if (result.syncedIds && result.syncedIds.length > 0) {
      markNotesAsSynced(result.syncedIds);
    }
    
    // Mark failed notes if any
    if (result.failedIds && result.failedIds.length > 0) {
      markNotesSyncError(result.failedIds);
    }
    
    return {
      success: true,
      synced: result.syncedIds?.length || 0,
      failed: result.failedIds?.length || 0,
      message: `Synced ${result.syncedIds?.length || 0} notes successfully`
    };
    
  } catch (error) {
    console.error('Sync error:', error);
    
    // Check if it's a network error (offline)
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        success: false,
        synced: 0,
        error: 'Network error: App appears to be offline',
        message: 'Cannot sync while offline. Changes will be synced when connection is restored.'
      };
    }
    
    return {
      success: false,
      synced: 0,
      error: error.message,
      message: 'Sync failed. Please try again later.'
    };
  }
};

/**
 * Search notes by title or content
 * @param {string} query - Search query
 * @returns {Array} Array of matching notes
 */
const searchNotes = (query) => {
  const searchTerm = `%${query}%`;
  const stmt = db.prepare(`
    SELECT * FROM notes 
    WHERE title LIKE ? OR content LIKE ?
    ORDER BY created_at DESC
  `);
  
  return stmt.all(searchTerm, searchTerm);
};

/**
 * Get database statistics
 * @returns {Object} Database statistics
 */
const getStats = () => {
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM notes');
  const pendingStmt = db.prepare("SELECT COUNT(*) as count FROM notes WHERE sync_status = 'pending'");
  const syncedStmt = db.prepare("SELECT COUNT(*) as count FROM notes WHERE sync_status = 'synced'");
  
  return {
    total: totalStmt.get().count,
    pending: pendingStmt.get().count,
    synced: syncedStmt.get().count
  };
};

// Close database connection when app exits
if (app) {
  app.on('before-quit', () => {
    db.close();
    console.log('Database connection closed');
  });
}

// Export all functions
module.exports = {
  // CRUD operations
  addNote,
  getNoteById,
  getNotes,
  updateNote,
  deleteNote,
  
  // Bulk operations
  addNotesBulk,
  
  // Sync operations
  syncWithBackend,
  getNotesToSync,
  markNotesAsSynced,
  markNotesSyncError,
  
  // Utility functions
  searchNotes,
  getStats,
  
  // Database instance (for advanced usage)
  db
};
