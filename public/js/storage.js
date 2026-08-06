import { get, set, del, keys } from '../node_modules/idb-keyval/dist/index.js';

/**
 * StorageManager - Capa de almacenamiento IndexedDB Local-First e Idempotente.
 */
export class StorageManager {
  constructor(roomId) {
    this.roomId = roomId || 'default_room';
    this.storageKey = `canvas_elements_${this.roomId}`;
  }

  async getScene() {
    try {
      const sceneData = await get(this.storageKey);
      return sceneData ? JSON.parse(sceneData) : [];
    } catch (err) {
      console.error('[StorageManager] Error leyendo de IndexedDB:', err);
      return [];
    }
  }

  async saveElement(element) {
    if (!element || !element.id) return;
    try {
      const currentScene = await this.getScene();
      const existingIndex = currentScene.findIndex((el) => el.id === element.id);

      if (existingIndex >= 0) {
        currentScene[existingIndex] = element;
      } else {
        currentScene.push(element);
      }

      await set(this.storageKey, JSON.stringify(currentScene));
    } catch (err) {
      console.error('[StorageManager] Error guardando elemento en IndexedDB:', err);
    }
  }

  async saveBatch(elements) {
    if (!Array.isArray(elements) || elements.length === 0) return;
    try {
      const currentScene = await this.getScene();
      const map = new Map(currentScene.map((item) => [item.id, item]));

      for (const el of elements) {
        if (!el || !el.id) continue;
        map.set(el.id, el);
      }

      const updatedScene = Array.from(map.values());
      await set(this.storageKey, JSON.stringify(updatedScene));
    } catch (err) {
      console.error('[StorageManager] Error procesando batch en IndexedDB:', err);
    }
  }

  async deleteElement(elementId) {
    try {
      const currentScene = await this.getScene();
      const filtered = currentScene.filter((el) => el.id !== elementId);
      await set(this.storageKey, JSON.stringify(filtered));
    } catch (err) {
      console.error('[StorageManager] Error eliminando elemento de IndexedDB:', err);
    }
  }

  async clearScene() {
    try {
      await del(this.storageKey);
    } catch (err) {
      console.error('[StorageManager] Error limpiando escena en IndexedDB:', err);
    }
  }
}
