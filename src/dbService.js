import { openDB } from 'idb';

const DB_NAME = 'readit-db';
const DB_VERSION = 3;
const READING_STATES_STORE = 'readingStates';
const BOOKMARKS_STORE = 'bookmarks';

let dbPromise;

function getDbPromise() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(READING_STATES_STORE)) {
            db.createObjectStore(READING_STATES_STORE, { keyPath: 'bookId' });
            console.log(`Object store ${READING_STATES_STORE} created.`);
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
            const bookmarkStore = db.createObjectStore(BOOKMARKS_STORE, { keyPath: 'id', autoIncrement: true });
            bookmarkStore.createIndex('by-bookId', 'bookId', { unique: false });
            console.log(`Object store ${BOOKMARKS_STORE} created with index by-bookId.`);
          }
        }
        if (oldVersion < 3) {
          console.log(`DB version 3 upgrade: The ${BOOKMARKS_STORE} store will now accommodate highlight-specific fields.`);
        }
        // Handle other version upgrades here if needed in the future
      },
    });
  }
  return dbPromise;
}

export const dbService = {
  async getReadingState(bookId) {
    if (!bookId) return null;
    try {
      const db = await getDbPromise();
      const tx = db.transaction(READING_STATES_STORE, 'readonly');
      const store = tx.objectStore(READING_STATES_STORE);
      const state = await store.get(bookId);
      await tx.done;
      return state; // { bookId, paragraphIndex, lastUpdated }
    } catch (error) {
      console.error(`Error getting reading state for ${bookId}:`, error);
      return null;
    }
  },

  async saveReadingState(bookId, paragraphIndex) {
    if (!bookId) return;
    try {
      const db = await getDbPromise();
      const tx = db.transaction(READING_STATES_STORE, 'readwrite');
      const store = tx.objectStore(READING_STATES_STORE);
      const state = {
        bookId,
        paragraphIndex,
        lastUpdated: new Date().toISOString(),
      };
      await store.put(state);
      await tx.done;
      console.log(`Saved reading state for ${bookId} to IndexedDB: p${paragraphIndex}`);
    } catch (error) {
      console.error(`Error saving reading state for ${bookId}:`, error);
    }
  },

  async deleteReadingState(bookId) {
    if (!bookId) return;
    try {
      const db = await getDbPromise();
      const tx = db.transaction(READING_STATES_STORE, 'readwrite');
      const store = tx.objectStore(READING_STATES_STORE);
      await store.delete(bookId);
      await tx.done;
      console.log(`Deleted reading state for ${bookId} from IndexedDB.`);
    } catch (error) {
      console.error(`Error deleting reading state for ${bookId}:`, error);
    }
  },

  async addBookmark(bookmarkData) {
    try {
      const db = await getDbPromise();
      const tx = db.transaction(BOOKMARKS_STORE, 'readwrite');
      const store = tx.objectStore(BOOKMARKS_STORE);
      const bookmark = {
        ...bookmarkData,
        type: bookmarkData.type || 'bookmark',
        createdAt: new Date().toISOString(),
      };
      const id = await store.add(bookmark);
      await tx.done;
      console.log(`Bookmark added with id ${id} for book ${bookmarkData.bookId}`);
      return { ...bookmark, id };
    } catch (error) {
      console.error("Error adding bookmark:", error);
      throw error;
    }
  },

  async getBookmarksForBook(bookId) {
    if (!bookId) return [];
    try {
      const db = await getDbPromise();
      const tx = db.transaction(BOOKMARKS_STORE, 'readonly');
      const store = tx.objectStore(BOOKMARKS_STORE);
      const index = store.index('by-bookId');
      const bookmarks = await index.getAll(bookId);
      await tx.done;
      return bookmarks.sort((a, b) => a.paragraphIndex - b.paragraphIndex);
    } catch (error) {
      console.error(`Error getting bookmarks for ${bookId}:`, error);
      return [];
    }
  },

  async deleteBookmark(bookmarkId) {
    try {
      const db = await getDbPromise();
      const tx = db.transaction(BOOKMARKS_STORE, 'readwrite');
      const store = tx.objectStore(BOOKMARKS_STORE);
      await store.delete(bookmarkId);
      await tx.done;
      console.log(`Bookmark with id ${bookmarkId} deleted.`);
    } catch (error) {
      console.error(`Error deleting bookmark ${bookmarkId}:`, error);
      throw error;
    }
  },
};

// Initialize the DB connection when the service is loaded
getDbPromise().then(() => {
    console.log("ReadiT IndexedDB initialized and ready.");
}).catch(err => {
    console.error("Failed to initialize ReadiT IndexedDB:", err);
});

export default dbService; 