# Modelado de Amenazas y Guía de Hardening de Seguridad (Security by Design)

**Proyecto:** Interactive Canvas (Pizarra Infinito-Bidireccional en Tiempo Real)  
**Objetivo:** Identificar vectores de ataque potenciales en el sistema de sincronización P2P / Relay WebSocket y definir los mecanismos de defensa necesarios para garantizar una arquitectura segura.

---

## 1. Superficie de Ataque y Modelo de Amenazas

La arquitectura de *Interactive Canvas* involucra tres componentes principales:
1. **Cliente Web (Browser Canvas / IndexedDB)**
2. **Servidor Relay (Node.js + Socket.io)**
3. **Canal de Comunicación (WebSockets)**

```
[ Cliente A (Browser) ] <== WebSocket (TLS/WSS) ==> [ Servidor Relay Node.js ] <== WebSocket (TLS/WSS) ==> [ Cliente B (Browser) ]
        |                                                                                                          |
   IndexedDB                                                                                                  IndexedDB
```

---

## 2. Vectores de Ataque Identificados y Estrategias Defensivas

### 2.1 Ataques a la Capa de Aplicación Web (DOM / XSS)

> [!IMPORTANT]
> **Amenaza: Inyección de Código / Stored XSS en Elementos de Texto (`TextElement`)**
> * **Vector de Ataque:** Un usuario malintencionado inserta cadenas con cargas sintácticas HTML/JS (ej. `<svg onload=alert(1)>`) a través de un payload `TEXT_ADD`. Si el cliente renderiza el texto inyectándolo directamente en el DOM mediante `innerHTML` o elementos editables sin escapar, la carga se ejecuta en el contexto del navegador de los demás pares conectados.
> * **Mitigación Defensiva:**
>   1. **Sanitización Estricta:** Toda entrada de texto debe renderizarse usando `ctx.fillText()` en el Canvas 2D (que no procesa HTML/JS) o asignarse a `element.textContent` en elementos DOM editables.
>   2. **Content Security Policy (CSP):** Configuración de cabeceras HTTP restringidas:
>      ```http
>      Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss: ws:;
>      ```

---

### 2.2 Ataques al Servidor Relay y Denegación de Servicio (DoS / Resource Exhaustion)

> [!WARNING]
> **Amenaza 1: Saturación de Memoria y CPU en el Servidor (WebSocket Flood DoS)**
> * **Vector de Ataque:** Un atacante emite ráfagas masivas de eventos `draw-action` o `join-room` a alta velocidad (miles de mensajes por segundo) buscando agotar el bucle de eventos (*Event Loop*) de Node.js o saturar la memoria RAM.
> * **Mitigación Defensiva:**
>   1. **Rate Limiting por Conexión:** Implementar limitadores de tasa a nivel de Socket.io utilizando un algoritmo de Token Bucket o Sliding Window (máximo 60-100 msgs/seg por socket).
>   2. **Validación de Tamaño de Payload:** Configurar el límite máximo de tamaño de paquete de Socket.io (`maxHttpBufferSize: 1e5` / 100 KB). Descartar conexiones que envíen cargas anormalmente grandes.

> [!WARNING]
> **Amenaza 2: Contaminación de Salas y Enumeración (Room Hijacking / Pollution)**
> * **Vector de Ataque:** Nombres de sala predecibles o cortos permiten a atacantes adivinar identificadores de sesión (`roomId`), unirse de forma no autorizada, interceptar trazos o vandalizar el lienzo.
> * **Mitigación Defensiva:**
>   1. **Entropía Criptográfica:** Los `roomId` deben generarse utilizando la API `crypto.getRandomValues()` en formato `base64url` de al menos 128 bits de entropía.
>   2. **Validación Estricta con Regex:** El servidor debe validar sintácticamente cada `roomId` antes de permitir la unión a una sala:
>      ```javascript
>      const ROOM_REGEX = /^[a-zA-Z0-9_-]{16,32}$/;
>      if (!ROOM_REGEX.test(roomId)) {
>        socket.disconnect(true);
>      }
>      ```

---

### 2.3 Ataques al Almacenamiento Local (IndexedDB Poisoning)

> [!CAUTION]
> **Amenaza: Desbordamiento de Cuota de Almacenamiento (Local Storage Exhaustion)**
> * **Vector de Ataque:** Un peer envía millones de objetos `StrokeElement` con arreglos masivos de puntos, provocando que la base de datos IndexedDB del cliente receptor supere los límites de cuota del navegador (`QuotaExceededError`) y congele la aplicación.
> * **Mitigación Defensiva:**
>   1. **Límite de Objetos por Sala:** Imponer un tope estricto de elementos almacenables en el lienzo (ej. máximo 5,000 elementos por sala).
>   2. **Límite de Vértices por Trazo:** Truncar o simplificar trazos que superen un máximo razonable de puntos (ej. 1,000 puntos por trazo) antes de persistirlos.

---

## 3. Lista de Verificación de Seguridad para Implementación (Security Checklist)

| Componente | Control de Seguridad | Estado Requerido |
| --- | --- | --- |
| **Transporte** | Uso exclusivo de WebSockets sobre TLS (`wss://`) | Obligatorio |
| **Relay Server** | Validación estricta de esquemas de mensaje (JSON Schema / Zod) | Obligatorio |
| **Relay Server** | Rate limiting activo por Socket ID y dirección IP | Obligatorio |
| **Cliente** | Renderizado seguro de texto sin parsing HTML / `innerHTML` | Obligatorio |
| **Cliente** | Generación de IDs con entropía criptográfica (`crypto.getRandomValues`) | Obligatorio |
| **Cliente** | Validación de cuotas de IndexedDB y sanitización de tipos de datos | Obligatorio |

---

## 4. Próximos Pasos

¿Deseas que guardemos este análisis de seguridad en un archivo de la documentación del proyecto y realicemos el commit correspondiente en el repositorio Git?
