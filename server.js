const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e5 // Límite de 100 KB por paquete (Hardening DoS)
});

// Configuración de cabeceras HTTP de Seguridad (Content Security Policy permisivo para CDNs y sourcemaps)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: https://cdn.jsdelivr.net;"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Servir dependencias locales si existen
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Configuración de límites y seguridad (E-SWE & Threat Model)
const ROOM_REGEX = /^[a-zA-Z0-9_-]{16,32}$/;
const RATE_LIMIT_WINDOW_MS = 1000;
const MAX_MSGS_PER_SEC = 500; // Elevado a 500 msgs/seg para permitir trazo y cursor continuo a 60 FPS sin desconexiones

// Servir archivos estáticos
app.use(express.static('public'));

// Rate Limiting por Socket ID
const socketMsgCounts = new Map();

io.use((socket, next) => {
  socketMsgCounts.set(socket.id, { count: 0, resetTime: Date.now() + RATE_LIMIT_WINDOW_MS });
  next();
});

io.on('connection', (socket) => {
  // Middleware de Rate Limiting por mensaje
  socket.use(([event, ...args], next) => {
    const now = Date.now();
    let record = socketMsgCounts.get(socket.id);
    
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
      socketMsgCounts.set(socket.id, record);
    }
    
    record.count++;
    if (record.count > MAX_MSGS_PER_SEC) {
      console.warn(`[RateLimit] Socket ${socket.id} superó el límite de mensajes (${record.count}/s). Desconectando...`);
      return next(new Error('Rate limit exceeded'));
    }
    next();
  });

  // Evento: Unirse a una sala validada
  socket.on('join-room', (roomId) => {
    if (!roomId || typeof roomId !== 'string' || !ROOM_REGEX.test(roomId)) {
      console.error(`[Security] ID de sala inválido rechazado: ${roomId}`);
      socket.emit('error-msg', 'Identificador de sala inválido.');
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    console.log(`[Socket] Client ${socket.id} joined room: ${roomId}`);

    // Notificar a otros pares en la sala
    socket.to(roomId).emit('user-connected', { userId: socket.id });
  });

  // Evento: Transmisión de trazos o acciones finalizadas (Blind Relay Zero-Trust)
  socket.on('draw-action', (actionPayload) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('draw-action', actionPayload);
  });

  // Evento: Reemplazo / Sincronización completa de Escena (por Undo/Redo global o Clear)
  socket.on('scene-replace', (scenePayload) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('scene-replace', scenePayload);
  });

  // Evento: Transmisión de trazo en vivo (Stroke Live) mientras el usuario dibuja a 60 FPS
  socket.on('stroke-live', (data) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('stroke-live', {
      socketId: socket.id,
      stroke: data.stroke
    });
  });

  // Evento: Solicitud de sincronización inicial
  socket.on('sync-request', () => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('sync-request', { requesterId: socket.id });
  });

  // Evento: Respuesta de sincronización por Chunks
  socket.on('sync-chunk', (chunkPayload) => {
    if (!socket.roomId || !chunkPayload || !chunkPayload.targetId) return;
    io.to(chunkPayload.targetId).emit('sync-chunk', chunkPayload);
  });

  // Evento: Posición de cursor remoto
  socket.on('cursor-move', (cursorPayload) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('cursor-move', {
      userId: socket.id,
      ...cursorPayload
    });
  });

  // Evento: Desconexión y Limpieza
  socket.on('disconnect', () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-disconnected', { userId: socket.id });
    }
    socketMsgCounts.delete(socket.id);
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`[Interactive Canvas Server] Escuchando en puerto ${PORT}`);
  });
}

module.exports = { app, server, io };
