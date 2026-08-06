import { get, set, del, keys } from 'https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm';

/**
 * StorageManager - Capa de almacenamiento IndexedDB Local-First e Idempotente.
 */
export class StorageManager {
  constructor(roomId) {
    this.roomId = roomId || 'default_room';
    this.storageKey = `canvas_elements_${this.roomId}`;
  }

  /**
   * Obtiene la colección completa de elementos guardados localmente.
   * @returns {Promise<Array>}
   */
  async getScene() {
    try {
      const sceneData = await get(this.storageKey);
      return sceneData ? JSON.parse(sceneData) : [];
    } catch (err) {
      console.error('[StorageManager] Error leyendo de IndexedDB:', err);
      return [];
    }
  }

  /**
   * Guarda o actualiza un elemento de forma idempotente (evita duplicados).
   * @param {Object} element 
   */
  async saveElement(element) {
    if (!element || !element.id) return;
    try {
      const currentScene = await this.getScene();
      const existingIndex = currentScene.findIndex((el) => el.id === element.id);

      if (existingIndex >= 0) {
        // Actualización si el timestamp es superior o igual (LWW / Lamport)
        if (element.updatedAt >= (currentScene[existingIndex].updatedAt || 0)) {
          currentScene[existingIndex] = element;
        }
      } else {
        // Inserción de elemento nuevo
        currentScene.push(element);
      }

      await set(this.storageKey, JSON.stringify(currentScene));
    } catch (err) {
      console.error('[StorageManager] Error guardando elemento en IndexedDB:', err);
    }
  }

  /**
   * Guarda una colección masiva de elementos (usado en la hidratación por Chunks).
   * @param {Array} elements 
   */
  async saveBatch(elements) {
    if (!Array.isArray(elements) || elements.length === 0) return;
    try {
      const currentScene = await this.getScene();
      const map = new Map(currentScene.map((item) => [item.id, item]));

      for (const el of elements) {
        if (!el || !el.id) continue;
        const existing = map.get(el.id);
        if (!existing || (el.updatedAt || 0) >= (existing.updatedAt || 0)) {
          map.set(el.id, el);
        }
      }

      const updatedScene = Array.from(map.values());
      await set(this.storageKey, JSON.stringify(updatedScene));
    } catch (err) {
      console.error('[StorageManager] Error procesando batch en IndexedDB:', err);
    }
  }

  /**
   * Elimina un elemento por su ID.
   * @param {string} elementId 
   */
  async deleteElement(elementId) {
    try {
      const currentScene = await this.getScene();
      const filtered = currentScene.filter((el) => el.id !== elementId);
      await set(this.storageKey, JSON.stringify(filtered));
    } catch (err) {
      console.error('[StorageManager] Error eliminando elemento de IndexedDB:', err);
    }
  }

  /**
   * Vacía la escena local completa.
   */
  async clearScene() {
    try {
      await del(this.storageKey);
    } catch (err) {
      console.error('[StorageManager] Error limpiando escena en IndexedDB:', err);
    }
  }
}
