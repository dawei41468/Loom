// IndexedDB utility for offline action storage
export interface OfflineAction {
  id: string;
  type: 'send_message' | 'create_checklist_item' | 'update_checklist_item' | 'delete_message' | 'delete_checklist_item';
  eventId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class IndexedDBManager {
  private dbName = 'loom-offline-db';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('offline-actions')) {
          const store = db.createObjectStore('offline-actions', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('eventId', 'eventId', { unique: false });
        }
      };
    });
  }

  async addOfflineAction(action: OfflineAction): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-actions'], 'readwrite');
      const store = transaction.objectStore('offline-actions');
      const request = store.add(action);

      request.onsuccess = () => {
        console.log('Offline action stored:', action.type);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to store offline action:', request.error);
        reject(request.error);
      };
    });
  }

  async getOfflineActions(): Promise<OfflineAction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-actions'], 'readonly');
      const store = transaction.objectStore('offline-actions');
      const index = store.index('timestamp');
      const request = index.openCursor();

      const actions: OfflineAction[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          actions.push(cursor.value);
          cursor.continue();
        } else {
          resolve(actions);
        }
      };

      request.onerror = () => {
        console.error('Failed to get offline actions:', request.error);
        reject(request.error);
      };
    });
  }

  async removeOfflineAction(actionId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-actions'], 'readwrite');
      const store = transaction.objectStore('offline-actions');
      const request = store.delete(actionId);

      request.onsuccess = () => {
        console.log('Offline action removed:', actionId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to remove offline action:', request.error);
        reject(request.error);
      };
    });
  }

  async updateOfflineAction(actionId: string, updates: Partial<OfflineAction>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-actions'], 'readwrite');
      const store = transaction.objectStore('offline-actions');
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          const updatedAction = { ...action, ...updates };
          const putRequest = store.put(updatedAction);

          putRequest.onsuccess = () => {
            console.log('Offline action updated:', actionId);
            resolve();
          };

          putRequest.onerror = () => {
            console.error('Failed to update offline action:', putRequest.error);
            reject(putRequest.error);
          };
        } else {
          reject(new Error('Action not found'));
        }
      };

      getRequest.onerror = () => {
        console.error('Failed to get offline action for update:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  async clearOfflineActions(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-actions'], 'readwrite');
      const store = transaction.objectStore('offline-actions');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All offline actions cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear offline actions:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();

// Utility functions for offline actions
export const createOfflineAction = (
  type: OfflineAction['type'],
  eventId: string,
  data: Record<string, unknown>
): OfflineAction => ({
  id: `${type}_${eventId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type,
  eventId,
  data,
  timestamp: Date.now(),
  retryCount: 0,
  maxRetries: 3,
});

export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const waitForOnline = (): Promise<void> => {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve();
      return;
    }

    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
};