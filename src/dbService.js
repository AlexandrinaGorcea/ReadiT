import { openDB } from 'idb';

const DB_NAME = 'readit-db';
const DB_VERSION = 1;
const READING_STATES_STORE = 'readingStates';

let dbPromise;

function getDbPromise() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
        if (!db.objectStoreNames.contains(READING_STATES_STORE)) {
          const store = db.createObjectStore(READING_STATES_STORE, { keyPath: 'bookId' });
          // store.createIndex('lastUpdated', 'lastUpdated'); // Optional index
          console.log(`Object store ${READING_STATES_STORE} created.`);
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
};

// Initialize the DB connection when the service is loaded
getDbPromise().then(() => {
    console.log("ReadiT IndexedDB initialized and ready.");
}).catch(err => {
    console.error("Failed to initialize ReadiT IndexedDB:", err);
});

export default dbService; 