import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioClient } from 'socket.io-client';
import { server, io } from '../server.js';

describe('Servidor Relay Zero-Trust & Protocolo de Seguridad (Fase 1)', () => {
  let clientSocket;
  const PORT = 3001;

  beforeAll(async () => {
    await new Promise((resolve) => {
      server.listen(PORT, resolve);
    });
  });

  afterAll(async () => {
    io.close();
    await new Promise((resolve) => server.close(resolve));
  });

  it('Debe rechazar un Room ID con formato o longitud inválida (Security Hardening)', async () => {
    await new Promise((resolve) => {
      clientSocket = ioClient(`http://localhost:${PORT}`);

      clientSocket.on('connect', () => {
        clientSocket.emit('join-room', 'invalid_short'); // < 16 caracteres
      });

      clientSocket.on('error-msg', (msg) => {
        expect(msg).toBe('Identificador de sala inválido.');
        clientSocket.disconnect();
        resolve();
      });
    });
  });

  it('Debe permitir unirse a una sala con un Room ID válido de 16-32 caracteres', async () => {
    const validRoomId = 'room_1234567890123456';
    await new Promise((resolve) => {
      clientSocket = ioClient(`http://localhost:${PORT}`);

      clientSocket.on('connect', () => {
        clientSocket.emit('join-room', validRoomId);
        setTimeout(() => {
          expect(clientSocket.connected).toBe(true);
          clientSocket.disconnect();
          resolve();
        }, 200);
      });
    });
  });
});
