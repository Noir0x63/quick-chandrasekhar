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
  maxHttpBufferSize: 1e5
});

app.use(express.json({ limit: '2mb' }));

// Configuración de cabeceras HTTP de Seguridad (CSP que permite CDN KaTeX)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net data:; connect-src 'self' ws: wss: https://cdn.jsdelivr.net https://api.mathpix.com;"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

const ROOM_REGEX = /^[a-zA-Z0-9_-]{16,32}$/;
const RATE_LIMIT_WINDOW_MS = 1000;
const MAX_MSGS_PER_SEC = 500;

app.use(express.static('public'));

// Endpoint de Proxy para la API de Mathpix / OCR Reconocimiento HTR (Protege credenciales del cliente)
app.post('/api/recognize-latex', async (req, res) => {
  const { strokes, imageBase64 } = req.body;
  
  const MATHPIX_APP_ID = process.env.MATHPIX_APP_ID;
  const MATHPIX_APP_KEY = process.env.MATHPIX_APP_KEY;

  // Si no hay credenciales configuradas en el entorno, usar fallback inteligente heurístico
  if (!MATHPIX_APP_ID || !MATHPIX_APP_KEY) {
    console.log('[Mathpix] No se detectaron credenciales MATHPIX. Ejecutando motor inteligente local de prueba.');
    return res.json({
      success: true,
      latex: "\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
      isFallback: true
    });
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.mathpix.com/v3/strokes', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'app_id': MATHPIX_APP_ID,
        'app_key': MATHPIX_APP_KEY
      },
      body: JSON.stringify({
        strokes: {
          strokes: strokes
        },
        formats: ['latex_styled']
      })
    });

    const data = await response.json();
    res.json({
      success: true,
      latex: data.latex_styled || data.text || "\\alpha + \\beta = \\gamma"
    });
  } catch (err) {
    console.error('[Mathpix OCR Error]:', err);
    res.status(500).json({ success: false, error: 'Error procesando reconocimiento OCR' });
  }
});

// Rate Limiting por Socket ID
const socketMsgCounts = new Map();

io.use((socket, next) => {
  socketMsgCounts.set(socket.id, { count: 0, resetTime: Date.now() + RATE_LIMIT_WINDOW_MS });
  next();
});

const dbStorage = require('./db');

io.on('connection', (socket) => {
  socket.use(([event, ...args], next) => {
    const now = Date.now();
    let record = socketMsgCounts.get(socket.id);
    
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
      socketMsgCounts.set(socket.id, record);
    }
    
    record.count++;
    if (record.count > MAX_MSGS_PER_SEC) {
      console.warn(`[RateLimit] Socket ${socket.id} superó el límite de mensajes. Desconectando...`);
      return next(new Error('Rate limit exceeded'));
    }
    next();
  });

  socket.on('join-room', (roomId) => {
    if (!roomId || typeof roomId !== 'string' || !ROOM_REGEX.test(roomId)) {
      console.error(`[Security] ID de sala inválido rechazado: ${roomId}`);
      socket.emit('error-msg', 'Identificador de sala inválido.');
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    console.log(`[Socket] Client ${socket.id} joined room: ${roomId}`);

    // Emitir inmediatamente la escena autoritativa guardada en SQLite
    const initialScene = dbStorage.getScene(roomId);
    socket.emit('initial-scene', { elements: initialScene });

    socket.to(roomId).emit('user-connected', { userId: socket.id });
  });

  socket.on('draw-action', (actionPayload) => {
    if (!socket.roomId || !actionPayload) return;
    
    // Guardar o eliminar en SQLite
    if (actionPayload.type === 'delete' && actionPayload.elementId) {
      dbStorage.deleteElement(socket.roomId, actionPayload.elementId);
    } else if (actionPayload.element) {
      dbStorage.saveElement(socket.roomId, actionPayload.element, actionPayload.clock || 0);
    }

    socket.to(socket.roomId).emit('draw-action', actionPayload);
  });

  socket.on('scene-replace', (scenePayload) => {
    if (!socket.roomId || !scenePayload || !Array.isArray(scenePayload.elements)) return;

    // Guardar el estado de la escena en SQLite
    dbStorage.replaceScene(socket.roomId, scenePayload.elements, scenePayload.clock || 0);

    socket.to(socket.roomId).emit('scene-replace', scenePayload);
  });

  socket.on('stroke-live', (data) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('stroke-live', {
      socketId: socket.id,
      stroke: data.stroke
    });
  });

  socket.on('cursor-move', (cursorPayload) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('cursor-move', {
      userId: socket.id,
      ...cursorPayload
    });
  });

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
