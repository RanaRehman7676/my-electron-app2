/**
 * Renderer Process - Frontend Logic
 * 
 * This file handles:
 * - UI interactions and event listeners
 * - Communication with main process via electronAPI
 * - Displaying notes and handling CRUD operations
 * - Sync functionality with backend API
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded');
  
  // Initialize the app
  loadNotes();
  loadStats();
  setupEventListeners();
  
  // Auto-refresh stats every 5 seconds
  setInterval(loadStats, 5000);
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Add note form submission
  const noteForm = document.getElementById('noteForm');
  noteForm.addEventListener('submit', handleAddNote);
  
  // Bulk add button
  const addBulkBtn = document.getElementById('addBulkBtn');
  addBulkBtn.addEventListener('click', handleBulkAdd);
  
  // Sync button
  const syncBtn = document.getElementById('syncBtn');
  syncBtn.addEventListener('click', handleSync);
  
  // Search input
  const searchInput = document.getElementById('searchInput');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      handleSearch(e.target.value);
    }, 300); // Debounce search
  });
}

/**
 * Handle adding a new note
 */
async function handleAddNote(e) {
  e.preventDefault();
  
  const titleInput = document.getElementById('noteTitle');
  const contentInput = document.getElementById('noteContent');
  
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  
  if (!title) {
    showMessage('Please enter a title', 'error');
    return;
  }
  
  try {
    const result = await window.electronAPI.db.addNote(title, content);
    
    if (result.success) {
      showMessage('Note added successfully!', 'success');
      titleInput.value = '';
      contentInput.value = '';
      loadNotes();
      loadStats();
    } else {
      showMessage(`Error: ${result.error}`, 'error');
    }
  } catch (error) {
    showMessage(`Error adding note: ${error.message}`, 'error');
  }
}

/**
 * Handle bulk adding notes (demonstrates transaction performance)
 */
async function handleBulkAdd() {
  const btn = document.getElementById('addBulkBtn');
  btn.disabled = true;
  btn.textContent = 'Adding...';
  
  // Generate 10 sample notes
  const sampleNotes = [];
  for (let i = 1; i <= 10; i++) {
    sampleNotes.push({
      title: `Sample Note ${i}`,
      content: `This is sample note number ${i}. Created using bulk insert transaction for better performance.`
    });
  }
  
  try {
    const startTime = performance.now();
    const result = await window.electronAPI.db.addNotesBulk(sampleNotes);
    const endTime = performance.now();
    
    if (result.success) {
      const duration = (endTime - startTime).toFixed(2);
      showMessage(`Added ${result.count} notes in ${duration}ms using transaction!`, 'success');
      loadNotes();
      loadStats();
    } else {
      showMessage(`Error: ${result.error}`, 'error');
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add 10 Sample Notes (Bulk)';
  }
}

/**
 * Handle syncing with backend
 */
async function handleSync() {
  const syncBtn = document.getElementById('syncBtn');
  const apiUrl = document.getElementById('apiUrl').value.trim() || 'http://localhost:3000';
  
  syncBtn.disabled = true;
  syncBtn.innerHTML = 'Syncing...<span class="loading"></span>';
  
  try {
    const result = await window.electronAPI.db.syncWithBackend(apiUrl);
    
    if (result.success) {
      showMessage(result.message || `Successfully synced ${result.synced} notes!`, 'success');
      loadNotes();
      loadStats();
    } else {
      showMessage(result.message || result.error || 'Sync failed', 'error');
    }
  } catch (error) {
    showMessage(`Sync error: ${error.message}`, 'error');
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = 'Sync Now';
  }
}

/**
 * Handle search
 */
async function handleSearch(query) {
  if (!query.trim()) {
    loadNotes();
    return;
  }
  
  try {
    const result = await window.electronAPI.db.searchNotes(query);
    
    if (result.success) {
      displayNotes(result.data);
    } else {
      showMessage(`Search error: ${result.error}`, 'error');
    }
  } catch (error) {
    showMessage(`Search error: ${error.message}`, 'error');
  }
}

/**
 * Load all notes from database
 */
async function loadNotes() {
  try {
    const result = await window.electronAPI.db.getNotes('created_at', 'DESC');
    
    if (result.success) {
      displayNotes(result.data);
    } else {
      showMessage(`Error loading notes: ${result.error}`, 'error');
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  }
}

/**
 * Display notes in the UI
 */
function displayNotes(notes) {
  const notesGrid = document.getElementById('notesGrid');
  
  if (notes.length === 0) {
    notesGrid.innerHTML = `
      <div class="empty-state">
        <h3>No notes found</h3>
        <p>Create your first note above!</p>
      </div>
    `;
    return;
  }
  
  notesGrid.innerHTML = notes.map(note => `
    <div class="note-card" data-id="${note.id}">
      <h3>${escapeHtml(note.title)}</h3>
      <p>${escapeHtml(note.content || '(No content)')}</p>
      <div class="meta">
        Created: ${formatDate(note.created_at)}<br>
        ${note.updated_at !== note.created_at ? `Updated: ${formatDate(note.updated_at)}<br>` : ''}
        Status: <strong>${note.sync_status}</strong>
      </div>
      <div class="actions">
        <button class="btn btn-primary" onclick="handleEdit(${note.id})">Edit</button>
        <button class="btn btn-danger" onclick="handleDelete(${note.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

/**
 * Handle editing a note
 */
async function handleEdit(id) {
  try {
    const result = await window.electronAPI.db.getNoteById(id);
    
    if (result.success && result.data) {
      const note = result.data;
      const newTitle = prompt('Enter new title:', note.title);
      
      if (newTitle === null) return; // User cancelled
      
      const newContent = prompt('Enter new content:', note.content || '');
      
      if (newContent === null) return; // User cancelled
      
      const updateResult = await window.electronAPI.db.updateNote(id, newTitle, newContent);
      
      if (updateResult.success) {
        showMessage('Note updated successfully!', 'success');
        loadNotes();
        loadStats();
      } else {
        showMessage(`Error: ${updateResult.error}`, 'error');
      }
    } else {
      showMessage('Note not found', 'error');
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  }
}

/**
 * Handle deleting a note
 */
async function handleDelete(id) {
  if (!confirm('Are you sure you want to delete this note?')) {
    return;
  }
  
  try {
    const result = await window.electronAPI.db.deleteNote(id);
    
    if (result.success) {
      showMessage('Note deleted successfully!', 'success');
      loadNotes();
      loadStats();
    } else {
      showMessage(`Error: ${result.message || result.error}`, 'error');
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  }
}

/**
 * Load and display database statistics
 */
async function loadStats() {
  try {
    const result = await window.electronAPI.db.getStats();
    
    if (result.success) {
      document.getElementById('stat-total').textContent = result.data.total;
      document.getElementById('stat-pending').textContent = result.data.pending;
      document.getElementById('stat-synced').textContent = result.data.synced;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

/**
 * Show a message to the user
 */
function showMessage(text, type = 'info') {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageEl.className = 'message';
  }, 5000);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions available globally for onclick handlers
window.handleEdit = handleEdit;
window.handleDelete = handleDelete;
