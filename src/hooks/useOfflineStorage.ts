import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// IndexedDB wrapper for offline-first data storage
interface StoredData {
  id: string;
  type: 'note' | 'flashcard' | 'assignment' | 'habit' | 'calendar_event';
  data: any;
  lastModified: string;
  synced: boolean;
  userId: string;
}

class OfflineStorage {
  private dbName = 'AlteonOfflineDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('data')) {
          const store = db.createObjectStore('data', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  async save(data: Omit<StoredData, 'id' | 'lastModified'>): Promise<string> {
    if (!this.db) await this.init();
    
    const id = `${data.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storedData: StoredData = {
      ...data,
      id,
      lastModified: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.add(storedData);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async update(id: string, data: Partial<StoredData>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existingData = getRequest.result;
        if (existingData) {
          const updatedData = {
            ...existingData,
            ...data,
            lastModified: new Date().toISOString(),
            synced: false // Mark as needing sync
          };
          
          const putRequest = store.put(updatedData);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Data not found'));
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async get(id: string): Promise<StoredData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getByType(type: string, userId: string): Promise<StoredData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => {
        const results = request.result.filter(item => item.userId === userId);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedData(userId: string): Promise<StoredData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result.filter((item: StoredData) => 
          item.userId === userId && !item.synced
        );
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(id: string): Promise<void> {
    await this.update(id, { synced: true });
  }

  async delete(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(userId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const index = store.index('userId');
      const request = index.getAllKeys(userId);

      request.onsuccess = () => {
        const deletePromises = request.result.map(key => {
          return new Promise<void>((res, rej) => {
            const deleteRequest = store.delete(key);
            deleteRequest.onsuccess = () => res();
            deleteRequest.onerror = () => rej(deleteRequest.error);
          });
        });

        Promise.all(deletePromises)
          .then(() => resolve())
          .catch(reject);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}

export const useOfflineStorage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const storage = new OfflineStorage();

  const saveOfflineData = async (type: StoredData['type'], data: any): Promise<string> => {
    if (!user?.uid) throw new Error('No user logged in');

    try {
      const id = await storage.save({
        type,
        data,
        synced: navigator.onLine, // Mark as synced if online
        userId: user.uid
      });

      // Also save to localStorage as backup
      const backupKey = `${type}_${user.uid}`;
      const existing = JSON.parse(localStorage.getItem(backupKey) || '[]');
      
      if (Array.isArray(existing)) {
        existing.push({ ...data, id });
        localStorage.setItem(backupKey, JSON.stringify(existing));
      }

      return id;
    } catch (error) {
      console.error('Error saving offline data:', error);
      throw error;
    }
  };

  const loadOfflineData = async (type: StoredData['type']): Promise<any[]> => {
    if (!user?.uid) return [];

    try {
      const storedData = await storage.getByType(type, user.uid);
      return storedData.map(item => ({ ...item.data, id: item.id }));
    } catch (error) {
      console.error('Error loading offline data:', error);
      
      // Fallback to localStorage
      const backupKey = `${type}_${user.uid}`;
      return JSON.parse(localStorage.getItem(backupKey) || '[]');
    }
  };

  const syncPendingData = async (): Promise<void> => {
    if (!user?.uid || !navigator.onLine) return;

    try {
      const unsyncedData = await storage.getUnsyncedData(user.uid);
      
      if (unsyncedData.length === 0) return;

      // Here you would implement the actual sync logic to your backend
      // For now, we'll just mark them as synced
      for (const item of unsyncedData) {
        await storage.markAsSynced(item.id);
      }

      toast({
        title: "Sync Complete",
        description: `Synced ${unsyncedData.length} offline changes.`,
      });
    } catch (error) {
      console.error('Error syncing pending data:', error);
      toast({
        title: "Sync Failed",
        description: "Some offline changes couldn't be synced.",
        variant: "destructive"
      });
    }
  };

  const getConnectionStatus = () => ({
    isOnline: navigator.onLine,
    lastSync: localStorage.getItem(`last_sync_${user?.uid}`) || null
  });

  // Auto-sync when coming back online
  window.addEventListener('online', () => {
    syncPendingData();
  });

  return {
    saveOfflineData,
    loadOfflineData,
    syncPendingData,
    getConnectionStatus,
    storage
  };
};
