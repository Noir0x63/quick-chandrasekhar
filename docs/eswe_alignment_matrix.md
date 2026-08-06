# Mapeo y Aplicación del Manifiesto E-SWE a Interactive Canvas

**Proyecto:** Interactive Canvas (Pizarra Infinito-Bidireccional en Tiempo Real)  
**Documento de Referencia:** `ESWE_REFERENCIA_DEFINITIVA.md` (Manifiesto de Ingeniería de Software Extrema v2.0 - ZTSE)  
**Objetivo:** Cruzar los 15 pilares de ingeniería extrema (E-SWE) con la arquitectura del sistema para garantizar estándares de grado crítico en seguridad, rendimiento, verificación y mantenibilidad.

---

## 1. Alineación Arquitectónica e Ingeniería de Sistemas (Capítulos I, IV, X)

### 1.1 Arquitectura Hexagonal & DDD Táctico (E-SWE Cap. I)
* **Ports & Adapters en Cliente JavaScript:**
  * **Núcleo de Dominio (Pure Use Cases):** El cálculo de espacio de mundo (`WorldCoordinates`), suavizado de trazos (`Catmull-Rom`) y simplificación de vértices (`RDP Algorithm`) no tendrán dependencias directas con el DOM o Socket.io.
  * **Puertos (Interfaces):** `StoragePort` (interfaz para IndexedDB), `NetworkPort` (interfaz para WebSockets), `RenderPort` (interfaz para HTML5 Canvas).
  * **Adaptadores:** `IndexedDBAdapter` (idb-keyval), `SocketIOAdapter`, `Canvas2DAdapter`.

### 1.2 Multi-Layer Double-Buffering & Cache Locality (E-SWE Cap. IV)
* **Zero-Allocation en Hot Paths (`pointermove`):**
  * Uso de arreglos numéricos planos alineados (`Float32Array` / `number[]` interleaved) en lugar de instanciar objetos `{x, y}` para evitar pausas por Garbage Collection en el hilo principal.
  * **Canvas Multicapa:** Separación estricta entre *Static Background Layer* (renderizado diferido fuera de pantalla) y *Dynamic Active Layer* a 60 FPS.

### 1.3 Resiliencia y Manejo de Errores Graceful (E-SWE Cap. X)
* **Backoff Exponencial con Jitter en Reconexiones:**
  $$\text{delay}(n) = \min(30000,\ 100 \cdot 2^n) \cdot \text{rand}(0.5, 1.0)$$
* **Idempotencia Causal:** Procesamiento redundante de acciones guiado por `actionId` único hash.

---

## 2. Seguridad Zero-Trust y Criptografía (Capítulos V, VI, VII, VIII)

### 2.1 Parse, Don't Validate & Sanitización (E-SWE Cap. V)
* **Fail-Secure Input Parsing:** Toda entrada recibida por WebSockets pasa por validación de esquemas con Zod antes de ingresar al grafo de escena.
* **Sanitización XSS:** Uso exclusivo de `textContent` y `ctx.fillText()` para evitar inyección de código.

### 2.2 Entropía Criptográfica & Privacidad (E-SWE Cap. V, VI, VIII)
* **Room IDs de Alta Entropía:** Generación con `crypto.getRandomValues()` de 128 bits de entropía en formato `base64url`.
* **Zero-Knowledge Relay Server:** El servidor actúa como *Blind Packet Switch*. Los payloads se transportan sobre TLS (`wss://`) y no se almacenan en disco en el servidor.

---

## 3. Verificación Formal, Testing Extremo y DevSecOps (Capítulos IX, XIV)

### 3.1 Reloj Lógico de Lamport (E-SWE Cap. IX - TLA+ Foundations)
* **Sincronización Causal:** Implementación de un Reloj Lógico de Lamport para resolver conflictos de mutaciones concurrentes sin depender del reloj físico del cliente ($L_{\text{action}} = \max(L_{\text{local}}, L_{\text{remote}}) + 1$).

### 3.2 Pipeline DevSecOps & DORA Metrics (E-SWE Cap. XIV, Apéndice)
* **Pruebas de Propiedades (Property-Based Testing):** Verificación con generadores de trazos aleatorios para comprobar que ningún estado interrumpe el loop de renderizado.
* **SAST / DAST Gates:** Integración de linters, escáneres de seguridad y verificaciones automatizadas en el repositorio Git.

---

## 4. Plan de Commits

Procederemos a guardar este documento de mapeo E-SWE en `docs/eswe_alignment_matrix.md` y realizar el commit correspondiente en el repositorio.
