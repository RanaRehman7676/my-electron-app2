/**
 * Preload Script - Bridge between Main and Renderer Processes
 * 
 * This script runs in a context that has access to both:
 * - Node.js APIs (via Electron)
 * - DOM APIs (via the renderer)
 * 
 * It securely exposes database operations to the renderer process
 * using contextBridge to prevent security vulnerabilities.
 */

const { contextBridge, ipcRenderer } = require('electron/renderer');

/**
 * Expose protected methods that allow the renderer process to use
 * the database operations without exposing Node.js APIs directly.
 * 
 * This follows Electron security best practices:
 * - contextIsolation: true (prevents renderer from accessing Node.js directly)
 * - nodeIntegration: false (prevents direct Node.js access)
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Database CRUD operations
  db: {
    /**
     * Add a new note
     * @param {string} title - Note title
     * @param {string} content - Note content
     * @returns {Promise<Object>} Result with success status and data
     */
    addNote: (title, content) => ipcRenderer.invoke('db:addNote', title, content),
    
    /**
     * Get all notes
     * @param {string} sortBy - Column to sort by (default: 'created_at')
     * @param {string} order - Sort order 'ASC' or 'DESC' (default: 'DESC')
     * @returns {Promise<Object>} Result with success status and notes array
     */
    getNotes: (sortBy, order) => ipcRenderer.invoke('db:getNotes', sortBy, order),
    
    /**
     * Get a single note by ID
     * @param {number} id - Note ID
     * @returns {Promise<Object>} Result with success status and note data
     */
    getNoteById: (id) => ipcRenderer.invoke('db:getNoteById', id),
    
    /**
     * Update an existing note
     * @param {number} id - Note ID
     * @param {string} title - New title
     * @param {string} content - New content
     * @returns {Promise<Object>} Result with success status and updated note
     */
    updateNote: (id, title, content) => ipcRenderer.invoke('db:updateNote', id, title, content),
    
    /**
     * Delete a note
     * @param {number} id - Note ID
     * @returns {Promise<Object>} Result with success status
     */
    deleteNote: (id) => ipcRenderer.invoke('db:deleteNote', id),
    
    /**
     * Add multiple notes using transaction (for performance)
     * @param {Array} notes - Array of {title, content} objects
     * @returns {Promise<Object>} Result with success status and inserted IDs
     */
    addNotesBulk: (notes) => ipcRenderer.invoke('db:addNotesBulk', notes),
    
    /**
     * Search notes by title or content
     * @param {string} query - Search query
     * @returns {Promise<Object>} Result with success status and matching notes
     */
    searchNotes: (query) => ipcRenderer.invoke('db:searchNotes', query),
    
    /**
     * Get database statistics
     * @returns {Promise<Object>} Result with success status and stats
     */
    getStats: () => ipcRenderer.invoke('db:getStats'),
    
    /**
     * Sync local data with NestJS backend
     * @param {string} apiUrl - Base URL of the API (default: 'http://localhost:3000')
     * @returns {Promise<Object>} Sync result with success status and message
     */
    syncWithBackend: (apiUrl) => ipcRenderer.invoke('db:syncWithBackend', apiUrl)
  },
  
  // System information (optional, for debugging)
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
  }
});
