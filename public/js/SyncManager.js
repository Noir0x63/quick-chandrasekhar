/**
 * SyncManager.js - Gestor de Sincronización Causal con Reloj Lógico de Lamport y Pending Sync Buffer.
 */
export class SyncManager {
  constructor(socket, storageManager, onSceneUpdated) {
    this.socket = socket;
    this.storage = storageManager;
    this.onSceneUpdated = onSceneUpdated || (() => {});

    // Reloj Lógico de Lamport y ID de Cliente
    this.lamportClock = 0;
    this.clientId = 'client_' + Math.random().toString(36).substr(2, 9);

    // Estado de Hidratación y Cola Temporal (Pending Sync Buffer)
    this.isHydrating = false;
    this.pendingBuffer = [];

    this.bindSocketEvents();
  }

  tickClock(remoteClock = 0) {
    this.lamportClock = Math.max(this.lamportClock, remoteClock) + 1;
    return this.lamportClock;
  }

  bindSocketEvents() {
    // Escuchar deltas entrantes en tiempo real
    this.socket.on('draw-action', async (payload) => {
      this.tickClock(payload.clock || 0);

      if (this.isHydrating) {
        // Encolar en el buffer mientras se procesan los chunks iniciales
        this.pendingBuffer.push(payload);
      } else {
        await this.processAction(payload);
      }
    });

    // Escuchar solicitud de sincronización por parte de un peer nuevo
    this.socket.on('sync-request', async ({ requesterId }) => {
      const scene = await this.storage.getScene();
      const CHUNK_SIZE = 50; // 50 elementos por chunk
      const totalChunks = Math.ceil(scene.length / CHUNK_SIZE) || 1;

      for (let i = 0; i < totalChunks; i++) {
        const chunkData = scene.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        this.socket.emit('sync-chunk', {
          targetId: requesterId,
          chunkIndex: i,
          totalChunks,
          data: chunkData
        });
      }
    });

    // Escuchar recepción de chunks de sincronización inicial
    this.socket.on('sync-chunk', async ({ chunkIndex, totalChunks, data }) => {
      if (chunkIndex === 0) {
        this.isHydrating = true;
      }

      await this.storage.saveBatch(data);

      if (chunkIndex === totalChunks - 1) {
        // Hidratación completa: Fusionar Pending Buffer
        for (const pendingAction of this.pendingBuffer) {
          await this.processAction(pendingAction);
        }
        this.pendingBuffer = [];
        this.isHydrating = false;

        const updatedScene = await this.storage.getScene();
        this.onSceneUpdated(updatedScene);
      }
    });
  }

  async processAction(payload) {
    if (!payload || !payload.element) return;
    const el = payload.element;
    el.updatedAt = el.updatedAt || Date.now();

    await this.storage.saveElement(el);
    const updatedScene = await this.storage.getScene();
    this.onSceneUpdated(updatedScene);
  }

  emitElement(element) {
    const clock = this.tickClock();
    element.updatedAt = Date.now();
    const payload = {
      clientId: this.clientId,
      clock,
      element
    };

    // Guardado local inmediato (Local-First)
    this.storage.saveElement(element).then(() => {
      this.onSceneUpdated();
    });

    // Propagación transitoria vía WebSocket
    this.socket.emit('draw-action', payload);
  }
}
