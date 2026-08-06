/**
 * SyncManager.js - Gestor de Sincronización Causal con Reloj Lógico de Lamport, Pending Sync Buffer y Transmisión de Escena Completa (Undo/Redo Sync).
 */
export class SyncManager {
  constructor(socket, storageManager, onSceneUpdated, callbacks = {}) {
    this.socket = socket;
    this.storage = storageManager;
    this.onSceneUpdated = onSceneUpdated || (() => {});
    this.onLiveStroke = callbacks.onLiveStroke || (() => {});
    this.onRemoteCursor = callbacks.onRemoteCursor || (() => {});
    this.onUserDisconnected = callbacks.onUserDisconnected || (() => {});

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
    // Escuchar deltas finalizados o eventos de borrado
    this.socket.on('draw-action', async (payload) => {
      this.tickClock(payload.clock || 0);

      if (this.isHydrating) {
        this.pendingBuffer.push(payload);
      } else {
        await this.processAction(payload);
      }
    });

    // Escuchar reemplazo completo de escena por Undo / Redo remoto
    this.socket.on('scene-replace', async (payload) => {
      this.tickClock(payload.clock || 0);
      const elements = payload.elements || [];
      await this.storage.clearScene();
      await this.storage.saveBatch(elements);
      this.onSceneUpdated(elements);
    });

    // Escuchar trazos en vivo mientras se dibujan en otros dispositivos
    this.socket.on('stroke-live', (data) => {
      this.onLiveStroke(data.socketId, data.stroke);
    });

    // Escuchar movimiento de cursor remoto
    this.socket.on('cursor-move', (data) => {
      this.onRemoteCursor(data.userId, data);
    });

    // Escuchar desconexión de usuarios
    this.socket.on('user-disconnected', (data) => {
      this.onUserDisconnected(data.userId);
    });

    // Escuchar solicitud de sincronización por parte de un peer nuevo
    this.socket.on('sync-request', async ({ requesterId }) => {
      const scene = await this.storage.getScene();
      const CHUNK_SIZE = 50;
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

    if (el.id === 'clear_all' || el.type === 'clear') {
      await this.storage.clearScene();
      this.onSceneUpdated([]);
      return;
    }

    el.updatedAt = el.updatedAt || Date.now();
    await this.storage.saveElement(el);
    const updatedScene = await this.storage.getScene();
    this.onSceneUpdated(updatedScene);
  }

  emitLiveStroke(stroke) {
    this.socket.emit('stroke-live', { stroke });
  }

  emitCursor(worldX, worldY, tool, color) {
    this.socket.emit('cursor-move', { worldX, worldY, tool, color });
  }

  emitElement(element) {
    const clock = this.tickClock();
    element.updatedAt = Date.now();
    const payload = {
      clientId: this.clientId,
      clock,
      element
    };

    this.storage.saveElement(element).then(() => {
      this.onSceneUpdated();
    });

    this.socket.emit('draw-action', payload);
  }

  emitSceneReplace(elements) {
    const clock = this.tickClock();
    const payload = {
      clientId: this.clientId,
      clock,
      elements
    };

    this.storage.clearScene().then(() => {
      this.storage.saveBatch(elements).then(() => {
        this.onSceneUpdated(elements);
      });
    });

    this.socket.emit('scene-replace', payload);
  }
}
