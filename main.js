/**
 * Main Process - Electron Application Entry Point
 * 
 * This file handles:
 * - Window creation and management
 * - IPC handlers for database operations
 * - Sync operations with backend API
 * - App lifecycle management
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./db');

// Handle Squirrel events for Windows auto-updater
if (require('electron-squirrel-startup')) {
  app.quit();
}

// ============================================
// Suppress Harmless Console Errors
// ============================================

/**
 * Suppress known harmless Electron console errors
 * These are common Windows-specific warnings that don't affect functionality
 */
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  
  // Filter out harmless errors (including various formats)
  if (
    message.includes('Unable to move the cache') ||
    message.includes('Unable to create cache') ||
    message.includes('Gpu Cache Creation failed') ||
    message.includes("'Autofill.enable' wasn't found") ||
    message.includes("'Autofill.setAddresses' wasn't found") ||
    message.includes('Request Autofill.enable failed') ||
    message.includes('Request Autofill.setAddresses failed') ||
    message.includes('Autofill.enable') && message.includes("wasn't found") ||
    message.includes('Autofill.setAddresses') && message.includes("wasn't found")
  ) {
    // Suppress these harmless warnings
    return;
  }
  
  // Log other errors normally
  originalConsoleError.apply(console, args);
};

// ============================================
// App Configuration
// ============================================

/**
 * Configure app settings to reduce cache-related issues
 * These command line switches help prevent cache permission errors on Windows
 */
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');

// Set cache directory after app is ready to avoid permission issues
app.once('ready', () => {
  try {
    const userDataPath = app.getPath('userData');
    const cachePath = path.join(userDataPath, 'cache');
    app.setPath('cache', cachePath);
  } catch (error) {
    // Cache path might already be set, ignore error
  }
});

/**
 * Create the main application window
 */
const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Security: Enable context isolation and disable node integration
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      // Disable some features that cause harmless errors
      enableWebSQL: false,
      // Set cache location to avoid permission issues
      partition: 'persist:main'
    }
  });

  // Note: Some harmless DevTools protocol errors may still appear in the console
  // (e.g., Autofill.enable errors). These are cosmetic and don't affect functionality.
  // They come from Chromium's internal DevTools and cannot be easily suppressed
  // without disabling DevTools entirely, which we don't want in development.

  // Load the HTML file
  win.loadFile('index.html');

  // Open DevTools in development
  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }
};

// ============================================
// IPC Handlers for Database Operations
// ============================================

/**
 * Handle: Add a new note
 * IPC: 'db:addNote'
 */
ipcMain.handle('db:addNote', async (event, title, content) => {
  try {
    const note = db.addNote(title, content);
    return { success: true, data: note };
  } catch (error) {
    console.error('Error adding note:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Handle: Get all notes
 * IPC: 'db:getNotes'
 */
ipcMain.handle('db:getNotes', async (event, sortBy, order) => {
  try {
    const notes = db.getNotes(sortBy, order);
    return { success: true, data: notes };
  } catch (error) {
    console.error('Error getting notes:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Handle: Get a single note by ID
 * IPC: 'db:getNoteById'
 */
ipcMain.handle('db:getNoteById', async (event, id) => {
  try {
    const note = db.getNoteById(id);
    if (!note) {
      return { success: false, error: 'Note not found' };
    }
    return { success: true, data: note };
  } catch (error) {
    console.error('Error getting note:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Handle: Update a note
 * IPC: 'db:updateNote'
 */
ipcMain.handle('db:updateNote', async (event, id, title, content) => {
  try {
    const note = db.updateNote(id, title, content);
    if (!note) {
      return { success: false, error: 'Note not found' };
    }
    return { success: true, data: note };
  } catch (error) {
    console.error('Error updating note:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Handle: Delete a note
 * IPC: 'db:deleteNote'
 */
ipcMain.handle('db:deleteNote', async (event, id) => {
  try {
    const deleted = db.deleteNote(id);
    return { success: deleted, message: deleted ? 'Note deleted' : 'Note not found' };
  } catch (error) {
    console.error('Error deleting note:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Handle: Add multiple notes using transaction
 * IPC: 'db:addNotesBulk'
 */
ipcMain.handle('db:addNotesBulk', async (event, notes) => {
  try {
    const ids = db.addNotesBulk(notes);
    return { success: true, data: ids, count: ids.length };
  } catch (error) {
    console.error('Error adding notes in bulk:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Handle: Search notes
 * IPC: 'db:searchNotes'
 */
ipcMain.handle('db:searchNotes', async (event, query) => {
  try {
    const notes = db.searchNotes(query);
    return { success: true, data: notes };
  } catch (error) {
    console.error('Error searching notes:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Handle: Get database statistics
 * IPC: 'db:getStats'
 */
ipcMain.handle('db:getStats', async () => {
  try {
    const stats = db.getStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Handle: Sync with backend API
 * IPC: 'db:syncWithBackend'
 */
ipcMain.handle('db:syncWithBackend', async (event, apiUrl) => {
  try {
    const result = await db.syncWithBackend(apiUrl);
    return result;
  } catch (error) {
    console.error('Error syncing with backend:', error);
    return {
      success: false,
      error: error.message,
      message: 'Sync failed'
    };
  }
});

// ============================================
// App Lifecycle Events
// ============================================

// When Electron is ready, create the window
app.whenReady().then(() => {
  console.log('Electron app ready');
  createWindow();
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, recreate window when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Cleanup on app quit
app.on('before-quit', () => {
  console.log('App shutting down...');
});
