# Especificación de Funcionalidades de Modelado Matemático y Cálculo Interactivo (Interactive Math Suite)

**Proyecto:** Interactive Canvas (Pizarra Infinito-Bidireccional en Tiempo Real)  
**Inspiración & Benchmarking:** GeoGebra, Desmos 2D/3D, Mathcad, Wolfram Alpha, MuseMath, MathPix  
**Paradigma:** *Interactive Infinite Canvas + Real-Time Symbolic & Computational Mathematics*

---

## 1. Reconocimiento de Escritura Matemática a Mano Alzada (Handwritten Math OCR)

### 1.1 Conversión Instantánea (Ink-to-LaTeX / Ink-to-Math)
* **Reconocimiento Táctil:** Al dibujar una fórmula matemática a mano alzada (ej. $\int_0^{\infty} x^2 e^{-x} dx$), el sistema reconoce los glifos vectoriales y despliega una previsualización formateada en **LaTeX / MathML**.
* **Edición Híbrida (Ink + Type):** Capacidad de tocar cualquier símbolo reconocido para corregirlo con teclado virtual matemático o redibujar únicamente el carácter defectuoso.

---

## 2. Motor de Gráficos e Interpretador Simbólico (2D/3D Function Plotter & CAS)

### 2.1 Representación de Funciones 2D/3D en Espacio de Mundo
* **Trazado de Funciones $y = f(x)$ y Cónicas:** Renderizado en tiempo real de funciones explícitas, implícitas ($x^2 + y^2 = r^2$), paramétricas y polares.
* **Proyección 3D en Lienzo 2D:** Renderizado de mapas de nivel / isolíneas o widgets 3D interactivos con rotación orbital para funciones de dos variables $z = f(x, y)$.
* **Análisis Geométrico Interactivo:** Detección automática y marcado visual de:
  * Raíces / Ceros de la función ($f(x) = 0$)
  * Puntos críticos (Máximos, Mínimos, Puntos de Inflexión)
  * Intersecciones entre múltiples curvas trazadas en el lienzo
  * Asíntotas verticales/horizontales y límites.

### 2.2 Deslizadores de Variables y Animación (Interactive Sliders / Dynamic Parameters)
* **Parámetros Dinámicos:** Si una fórmula contiene variables (ej. $y = a \cdot \sin(b \cdot x + c)$), el lienzo genera automáticamente **deslizadores interactivos (sliders)** para $a$, $b$ y $c$.
* **Animación en Tiempo Real:** Al desplazar el slider en el teléfono o PC, la curva en el lienzo se deforma a 60 FPS proyectando el cambio en vivo a todos los dispositivos emparejados.

---

## 3. Lienzo Computacional Estilo Notebook (Live Scratchpad & CAS Engine)

### 3.1 Evaluación Simbólica y Numérica (Computer Algebra System - CAS)
* **Resolución Simbólica:** Evaluación de derivadas ($\frac{d}{dx}$), integrales indefinidas/definidas, límites, simplificación algebraica y expansión de polinomios.
* **Cálculo Vectorial y Matricial:** Renderizado de matrices interactivas con cálculo instantáneo de determinantes, autovalores (eigenvalues) y resolución de sistemas de ecuaciones lineales.

### 3.2 Diagramas de Campo Vectorial y Simulación Física
* **Campos Vectoriales & Ecuaciones Diferenciales:** Trazado de campos de pendiente/dirección para EDOs ($\frac{dy}{dx} = f(x, y)$) con partículas animadas navegando por el flujo del campo.
* **Motor de Simulación Física 2D:** Creación de componentes físicos interactivos (péndulos, resortes, masa-resorte-amortiguador, colisiones elásticas) con trazado de gráficos posición-tiempo sincronizados.

---

## 4. Herramientas Geométricas Dinámicas (Interactive Dynamic Geometry)

* **Construcciones Euclidianas:** Puntos, segmentos, rectas perpendiculares/paralelas, mediatrices, bisectrices y polígonos regulares.
* **Restricciones Geométricas (Geometric Constraints Engine):** Fijar relaciones estáticas entre objetos (ej. "mantener estas dos líneas perpendiculares" o "fijar la longitud de esta barra"). Al arrastrar un vértice, todo el modelo geométrico se deforma respetando las restricciones matemáticas.

---

## 5. Integración con el Sistema P2P y Colaboración por QR

* **Demostraciones Interactivas en Clase / Presentaciones:** El profesor puede proyectar la función en la pantalla de la PC mientras ajusta los parámetros de la ecuación desde su teléfono móvil actuando como control remoto matemático.
* **Exportación de Fórmulas:** Copiar código LaTeX limpio, código MathML o exportación de datos en formato CSV/JSON para análisis numérico posterior (Python/Jupyter).

---

## 6. Plan de Commits

Procederemos a guardar esta especificación de funcionalidades matemáticas en `docs/interactive_math_features.md` y realizar el commit en el repositorio Git.
