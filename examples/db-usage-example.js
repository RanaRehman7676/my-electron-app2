/**
 * Example Usage of Database Module
 * 
 * This file demonstrates how to use the db.js module
 * for various database operations.
 * 
 * Note: This is for reference. In a real Electron app,
 * you would use these functions through IPC handlers
 * (see main.js) or through the exposed electronAPI
 * (see preload.js and renderer.js).
 */

const db = require('../db');

// ============================================
// Example 1: Basic CRUD Operations
// ============================================

console.log('=== Example 1: Basic CRUD Operations ===\n');

// Create a note
console.log('1. Creating a note...');
const note1 = db.addNote('My First Note', 'This is the content of my first note');
console.log('Created note:', note1);
console.log('');

// Read all notes
console.log('2. Reading all notes...');
const allNotes = db.getNotes();
console.log(`Found ${allNotes.length} notes`);
console.log('');

// Read a specific note
console.log('3. Reading note by ID...');
const noteById = db.getNoteById(note1.id);
console.log('Note:', noteById);
console.log('');

// Update a note
console.log('4. Updating a note...');
const updated = db.updateNote(note1.id, 'Updated Note Title', 'Updated content here');
console.log('Updated note:', updated);
console.log('');

// Delete a note
console.log('5. Deleting a note...');
const deleted = db.deleteNote(note1.id);
console.log(`Note deleted: ${deleted}`);
console.log('');

// ============================================
// Example 2: Bulk Operations with Transaction
// ============================================

console.log('=== Example 2: Bulk Operations ===\n');

// Create multiple notes using transaction
console.log('Creating 100 notes using transaction...');
const startTime = performance.now();

const bulkNotes = [];
for (let i = 1; i <= 100; i++) {
  bulkNotes.push({
    title: `Bulk Note ${i}`,
    content: `This is bulk note number ${i}. Created using transaction for better performance.`
  });
}

const insertedIds = db.addNotesBulk(bulkNotes);
const endTime = performance.now();

console.log(`✅ Inserted ${insertedIds.length} notes in ${(endTime - startTime).toFixed(2)}ms`);
console.log(`Average: ${((endTime - startTime) / bulkNotes.length).toFixed(2)}ms per note`);
console.log('');

// ============================================
// Example 3: Search Operations
// ============================================

console.log('=== Example 3: Search Operations ===\n');

// Search for notes
console.log('Searching for "Bulk"...');
const searchResults = db.searchNotes('Bulk');
console.log(`Found ${searchResults.length} matching notes`);
console.log('');

// ============================================
// Example 4: Sorting
// ============================================

console.log('=== Example 4: Sorting ===\n');

// Get notes sorted by title (ascending)
console.log('Getting notes sorted by title (ASC)...');
const notesByTitle = db.getNotes('title', 'ASC');
console.log(`First 5 notes by title:`, notesByTitle.slice(0, 5).map(n => n.title));
console.log('');

// Get notes sorted by created date (descending - default)
console.log('Getting notes sorted by created_at (DESC)...');
const notesByDate = db.getNotes('created_at', 'DESC');
console.log(`Most recent 5 notes:`, notesByDate.slice(0, 5).map(n => n.title));
console.log('');

// ============================================
// Example 5: Statistics
// ============================================

console.log('=== Example 5: Database Statistics ===\n');

const stats = db.getStats();
console.log('Database Statistics:');
console.log(`  Total notes: ${stats.total}`);
console.log(`  Pending sync: ${stats.pending}`);
console.log(`  Synced: ${stats.synced}`);
console.log('');

// ============================================
// Example 6: Sync with Backend (Async)
// ============================================

console.log('=== Example 6: Backend Sync ===\n');

// Note: This is an async operation
async function syncExample() {
  console.log('Syncing with backend...');
  
  try {
    const result = await db.syncWithBackend('http://localhost:3000');
    
    if (result.success) {
      console.log(`✅ Sync successful: ${result.message}`);
      console.log(`   Synced: ${result.synced} notes`);
      console.log(`   Failed: ${result.failed || 0} notes`);
    } else {
      console.log(`❌ Sync failed: ${result.error}`);
      console.log(`   Message: ${result.message}`);
    }
  } catch (error) {
    console.error('Sync error:', error.message);
  }
}

// Uncomment to test sync (requires backend to be running)
// syncExample();

console.log('(Sync example skipped - uncomment syncExample() to test)');
console.log('');

// ============================================
// Example 7: Getting Notes to Sync
// ============================================

console.log('=== Example 7: Notes Pending Sync ===\n');

const notesToSync = db.getNotesToSync();
console.log(`Found ${notesToSync.length} notes that need syncing`);
if (notesToSync.length > 0) {
  console.log('Sample note to sync:', {
    id: notesToSync[0].id,
    title: notesToSync[0].title,
    sync_status: notesToSync[0].sync_status
  });
}
console.log('');

console.log('=== All Examples Complete ===');

