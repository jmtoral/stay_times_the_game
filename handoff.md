# Handoff — Stay Time: Simulador de jornada de reparto

**Fecha**: 2026-08-28  
**Tag de respaldo**: `pre-refactor-jefe` (commit `f54199a`)  
**Repo**: https://github.com/jmtoral/stay_times_the_game  
**URL en vivo**: https://jmtoral.github.io/stay_times_the_game/

---

## 1. ¿Qué es esto?

Un serious game para personal de operaciones de reparto (Coca-Cola). Enseña tres conceptos:

1. El **Stay Time** se compone de costo fijo (estacionamiento + atención al cliente) + costo variable (descarga).
2. La jornada es un **presupuesto cerrado de 8 horas** (07:00 → 15:00). Excederlo tiene costo.
3. La **desviación contra el plan se propaga**: un atraso en P2 afecta P3..P7 y puede provocar rechazos.

Partida activa: 3–4 minutos.

---

## 2. Stack técnico

| Componente | Detalle |
|---|---|
| Entrega | Un solo archivo `index.html`, sin build step |
| 3D | Three.js r160 por CDN (`importmap` ES module) |
| Geometría | 100% procedural (~438 triángulos), sin modelos externos |
| HUD | HTML/CSS plano superpuesto al canvas |
| Cámara | Isométrica fija, sin controles de órbita |
| RNG | Mulberry32 con semilla fija para reproducibilidad |
| Persistencia | Ninguna actualmente (se va a agregar localStorage para leaderboard) |

---

## 3. Estructura del archivo `index.html` (estado ACTUAL, pre-refactor)

```
Líneas ~1–152      CSS (variables, layout, screens, minijuego, resultados)
Líneas ~154–252    HTML (canvas 3D + 5 pantallas HUD: menu, seleccion, hud, minijuego, resultados)
Líneas ~254–392    CONFIG (todas las constantes tuneables)
Líneas ~398–408    RNG mulberry32
Líneas ~410–456    Helpers (ruta activa, retornos, tiempo, canal de venta)
Líneas ~458–582    Modelo de cálculo (stayTimeParada, calcularPlan, simularJornada, calcularCostos)
Líneas ~584–606    Estado global G
Líneas ~608–826    Three.js (escena, camión, edificio destino, geocerca, loop render)
Líneas ~828–1129   Máquina de estados (menu, selección, traslado, parada, retorno, resultados)
Líneas ~1131–1225  Minijuego de descarga (aguja, zonas, resolver maniobra)
Líneas ~1227–1237  Toasts / avisos
Líneas ~1239–1406  Pantalla de resultados (tabla plan/real, desglose, contrafactual, consejo)
Líneas ~1408–1468  Input (teclado/touch), selector de rutas, arranque
```

---

## 4. Máquina de estados (ACTUAL, pre-refactor)

```
MENU → SELECCION_CAMION → TRASLADO → PARADA → RETORNO_CEDIS → RESULTADOS
                              ↑          │          │
                              └──────────┘          │ (solo camión chico)
                              ↑                     │
                              └─────────────────────┘
```

| Estado | Función principal | Qué hace |
|---|---|---|
| MENU | `estadoMenu()` | Selector de ruta + botón empezar |
| SELECCION_CAMION | `estadoSeleccion()` | Info de ruta + elegir chico/grande |
| TRASLADO | `entrarTraslado(i)` | Animación 2s, +17 min jornada, stay time detenido |
| PARADA | `entrarParada(i)` | Verifica ventana, suma fijos, lanza minijuego |
| RETORNO_CEDIS | `retornoCEDIS(i, next)` | +65 min, solo cuando capacidad < carga siguiente |
| RESULTADOS | `estadoResultados()` | Tabla plan/real, desglose, contrafactual, estrellas |

---

## 5. CONFIG — constantes clave (ACTUAL)

| Constante | Valor | Nota |
|---|---|---|
| `jornada.inicioMin` | 420 (07:00) | |
| `jornada.presupuestoMin` | 480 (8h) | Zona roja a partir de aquí |
| `jornada.corteDuroMin` | 1020 (17:00) | Ruta truncada, NO ENTREGADA |
| `bloques.cargaCEDIS` | 35 min | |
| `bloques.liquidacionFinal` | 25 min | |
| `bloques.trasladoPorTramo` | 17 min | 8 tramos en ruta canónica |
| `bloques.atencionCliente` | 12 min | Stay Time no acelerable |
| `bloques.retornoCEDIS` | 65 min | 25+15+25, solo camión chico |
| `camiones.chico` | cap 280, estac 3, penal 0 | |
| `camiones.grande` | cap 550, estac 6, penal 8 | |
| `mj.tVerde/Amarillo/Rojo` | 5.0 / 6.5 / 8.5 min | Tiempo por maniobra |
| `evento.probabilidad` | 0.25 | Forzado ≥1 por partida |
| `geocerca.probabilidad` | 0.15 | Forzado ≥1, endurece minijuego |

---

## 6. Rutas disponibles (ACTUAL)

| Key | Paradas | Cajas | Zonas estrechas | Ventanas |
|---|---|---|---|---|
| `canonica` | 7 | 500 | P2, P5 | P3 10:15, P5 12:30, P7 14:30 |
| `express` | 5 | 330 | P1, P3, P5 | P2 09:40, P4 11:30, P5 12:45 |
| `pesada` | 10 | 700 | P9 | P3 10:00, P6 12:30, P9 14:00 |
| `ligera` | 3 | 200 | P1, P3 | ninguna |

Más opción **🎲 Aleatoria** (ruta + semilla al azar).

---

## 7. Números de referencia (ruta canónica, semilla 12345) — ACTUAL

| Escenario | Total | Cierre | Tiempo extra |
|---|---|---|---|
| Plan del planeador | 465 min | 14:45 | — |
| Camión grande perfecto | 468 min | 14:48 | 0 min |
| Camión chico perfecto | 496 min | 15:16 | 16 min |

---

## 8. Mecánicas existentes que SE CONSERVAN

### Minijuego de descarga
- Barra con aguja oscilante (delta-time, igual a 60 y 120 Hz).
- Zonas: verde (18%), amarilla (16% cada lado), roja (resto).
- Un solo input por maniobra (Espacio o tap). Machacar no da ventaja.
- Variaciones: `zonaEstrecha` → verde 12%, última maniobra → verde 22%, fatiga en 5+ maniobras, geocerca angosta verde ×0.65 y acelera aguja ×1.25.

### Eventos aleatorios
- 25% por parada (RNG sembrado), forzado ≥1.
- "Bodega bloqueada", +5 min al Stay Time.

### Geocerca
- 15% por parada, forzada ≥1. No suma minutos; endurece el minijuego.

### Ventanas de recepción
- Si llegas tarde → rechazo, cajas = venta perdida, +8 min gestión, sin minijuego.

---

## 9. REFACTOR IMPLEMENTADO — lo que el jefe pidió

### Estado: ✅ IMPLEMENTADO

Todas las tareas descritas a continuación ya fueron codificadas e integradas en `index.html`.

### T1: Simplificar a un solo camión
- **ELIMINAR**: `CONFIG.camiones.chico`, pantalla `SELECCION_CAMION`, estado `RETORNO_CEDIS`, contrafactual en resultados.
- **CONSERVAR**: `CONFIG.camiones.grande` como camión único (estac 6, penal 8, cap 550).
- **Convertir** la pantalla de selección en un "briefing de ruta" (info sin decisión, un solo botón "Empezar ruta").
- **Nuevo flujo**: `MENU → BRIEFING → TRASLADO → PARADA → RESULTADOS`
- **Auto-asignar** `G.camion = CONFIG.camion` al iniciar la partida.

### T2: Menos paradas + calibración de dificultad (Punto Medio)
- **Ruta canónica**: 5 paradas (no 7). Las demás rutas calibradas proporcionalmente.
- **Tiempos equilibrados**: `trasladoPorTramo: 20` min (punto medio entre 17 y 25), `atencionCliente: 13` min (punto medio entre 12 y 15).
- **Minijuego más noble**: aguja más suave (`cicloBase: 1.8`), zona verde más amplia (`zonaVerde: 0.20`, estrecha `0.14`), penalizaciones reducidas (`tAmarillo: 6.2`, `tRojo: 8.0`).
- **Diseño calibrado** para ruta canónica (5 paradas):
  ```
  cajas:        [100, 80, 120, 80, 100]   // suma 480
  zonaEstrecha: [false, true, false, false, true]
  ventanaCierre:[null, null, "10:45", null, "13:30"]
  trasladoPorTramo: 20
  atencionCliente: 13
  maniobras: [5, 4, 6, 4, 5] = 24 total
  ```
- **Curva de tensión equilibrada**:
  - Jugador perfecto: ~416 min → cierra 13:56 (64 min de holgura, NPS 100%).
  - Jugador promedio (verdes y amarillos): ~430 min → cierra 14:10 (50 min de holgura, NPS ~85%).
  - Jugador descuidado: ~450–470 min → cierra cerca de las 14:40 (NPS ~50–60%).
  - Jugador muy malo: >480 min → excede las 15:00 y sufre penalizaciones.

### T3: Límite de 8 horas
- **corteDuroMin** pasa de 17:00 (1020) a **15:00 (900)**.
- **NO es game over**: el juego va a resultados con las paradas restantes como NO ENTREGADAS. Se penalizan con `costoCajaNoEntregada × cajas` y NPS 0.
- Eliminar el concepto de "zona roja" (ya no hay tiempo extra posible).
- `spanBarraMin` se ajusta a ~540 para que la barra muestre hasta 16:00 (espacio visual para rebase).
- En `salirParada()`, verificar `G.reloj >= corteDuroMin` antes de ir a la siguiente.

### T4: Calificación del cliente (NPS + emoji en porcentaje)
- **Escala porcentual en CONFIG**:
  ```js
  nps: {
    umbrales: [
      { maxDesvMin: 0,   emoji: '😍', nps: 100, label: 'Encantado' },
      { maxDesvMin: 3,   emoji: '😊', nps: 90,  label: 'Muy satisfecho' },
      { maxDesvMin: 8,   emoji: '🙂', nps: 70,  label: 'Satisfecho' },
      { maxDesvMin: 15,  emoji: '😐', nps: 50,  label: 'Neutral' },
      { maxDesvMin: 25,  emoji: '😠', nps: 30,  label: 'Insatisfecho' },
      { maxDesvMin: Infinity, emoji: '🤬', nps: 10, label: 'Furioso' }
    ],
    rechazoNps: 0,
    noEntregadaNps: 0
  }
  ```
- **Cálculo**: desviación = stay time real − stay time planeado. Si ≤0 → 😍 (100%). Si 25+ → 🤬 (10%). Paradas rechazadas/no entregadas → 🤬 (0%).
- **Dónde se muestra**:
  - `salirParada()` → emoji grande + label en el resumen de desviación (ej. `NPS 90% · Muy satisfecho`).
  - Panel de parada (HUD) → NPS en vivo conforme avanza el stay time.
  - Resultados → columna de emoji + NPS (%) en la tabla. NPS promedio (%) como KPI principal.
- **Nota pedagógica**: con juego perfecto, las paradas con `zonaEstrecha` sacan NPS 70% (no 100%) porque la penalización estructural (+8 min) genera desviación vs el plan (que ignora estrechas). Esto enseña que la infraestructura impacta la satisfacción del cliente.

### T5: Leaderboard
- **Input de nombre** en el menú (campo `<input id="nombreInput">`), requerido.
- **Almacenamiento**: `localStorage.setItem('stLeaderboard', JSON.stringify(entries))`.
- **Métrica principal**: NPS promedio porcentual (higher = better). Secundario: costo total.
- **Estructura por entrada**:
  ```js
  { nombre, npsPromedio, costoTotal, estrellas, paradasEntregadas, paradasTotal, ruta, fecha }
  ```
- **Top 10**, ordenado por NPS descendente, luego costo ascendente.
- **Dónde se muestra**: tabla en menú + tabla inline en resultados (con highlight de la partida actual).
- **Funciones**: `guardarPuntaje()`, `cargarLeaderboard()`, `renderLeaderboard()`.

### T6: Branding Coca-Cola
- Usar el logo Coca-Cola (imagen por URL: `https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo.svg` o similar CDN).
- **Dónde**: menú (grande), resultados (mediano), briefing de ruta (pequeño).
- La paleta roja del juego ya es Coca-Cola (#cc0000, #ff0000, etc.) — conservada.
- Título actualizado: `Stay Time — Simulador de jornada de reparto | Coca‑Cola`.

---

## 10. Lo que funciona HOY (verificado)

- [x] Abre sin errores en consola
- [x] 1 solo camión automatizado (sin pantallas redundantes)
- [x] 5 paradas con balanceo ajustado de 8 horas
- [x] NPS calculado por parada en escala 0%–100% y promedio ponderado
- [x] Corte de jornada a las 15:00 con penalización por no entrega (sin crash)
- [x] Leaderboard local persistente en `localStorage` con Top 10
- [x] Branding Coca-Cola integrado en menús y HUD
- [x] < 5000 triángulos (~438)
- [x] Maniobras por parada fijas (no dependen del desempeño)
- [x] Todas las constantes en CONFIG
- [x] RNG reproducible

---

## 11. Archivos del repo

| Archivo | Propósito |
|---|---|
| `index.html` | Todo el juego (HTML + CSS + JS + Three.js) |
| `SPEC.md` | Especificación original (pre-refactor) |
| `CLAUDE.md` | Contexto para asistentes de código |
| `README.md` | Readme del repo |
| `handoff.md` | **Este documento** |
| `.gitignore` | Excluye `.claude/` |

---

## 12. Cómo correr

```bash
# Opción 1: abrir directo
start index.html

# Opción 2: servidor local
npx -y serve .

# Opción 3: ya desplegado
# https://jmtoral.github.io/stay_times_the_game/
```

---

## 13. Cómo revertir al estado pre-refactor

```bash
git checkout pre-refactor-jefe
# o para borrar todo lo nuevo:
git reset --hard pre-refactor-jefe
```

---

## 14. Backend Implementado (Leaderboard Global con Cloudflare Workers)

- **Worker**: [`cloudflare-worker/worker.js`](file:///d:/PROYECTOS_PERSONALES/juego_stay_times/cloudflare-worker/worker.js)
- **URL en Producción**: `https://stay-times-leaderboard.jmtoralcruz.workers.dev`
- **Persistencia**: Cloudflare KV (`LEADERBOARD_KV`).
- **Comportamiento**: En `index.html`, `CONFIG.leaderboard.apiUrl` ya está enlazado a esta URL. Almacena en `localStorage` al instante y sincroniza globalmente con el Worker.

---

## 15. Tareas Pendientes Prioritarias (Para Mañana)

### 📌 1. Ajuste de Curva de NPS (Hacerlo Menos Generoso)
- **Objetivo**: La escala actual es demasiado permisiva (tolera muchos minutos antes de bajar el puntaje). Se necesita una curva más exigente y realista donde los atrasos penalicen con mayor rigor.
- **Propuesta de Escala Más Estricta**:
  - $\le 0\text{ min}$ de atraso: **100%** (😍 *Encantado*)
  - $\le 2\text{ min}$: **80%** (😊 *Satisfecho*)
  - $\le 5\text{ min}$: **60%** (🙂 *Aceptable*)
  - $\le 10\text{ min}$: **40%** (😐 *Neutral/Inconforme*)
  - $\le 18\text{ min}$: **20%** (😠 *Insatisfecho*)
  - $> 18\text{ min}$ o rechazo: **0%** (🤬 *Pésimo / Rechazado*)
- **Ajustar**: Valores y etiquetas en `CONFIG.nps` y feedback del cliente en HUD y resultados.

### 🎨 2. Rediseño Integral del Look & Feel (Avanzado / Premium)
- **Objetivo**: Transformar el aspecto visual a un estándar corporativo de primer nivel (Coca-Cola Red Experience).
- **Aspectos a Rediseñar**:
  - **Tipografía**: Incorporar Google Fonts modernas (ej. `Plus Jakarta Sans`, `Outfit` o `Inter`) para títulos y números tabulares.
  - **Diseño Visual & Glassmorphism**: Cards modernas con bordes sutiles, efectos de desenfoque translúcido (`backdrop-filter`), sombras suaves y gradientes pulidos.
  - **HUD de Parada y Reloj**: Reorganizar la barra superior de 8 horas, reloj digital tipo odómetro/cronómetro de cabina, e indicadores de estatus más atractivos.
  - **Minijuego de Descarga**: Rediseñar la barra de timing con un diseño más estilizado tipo velocímetro/indicador de presión industrial, aguja luminosa y efectos de partículas/flash en impacto verde.
  - **Pantalla de Resultados**: Formato tipo *dashboard* ejecutivo de logística con KPIs destacados (medallas, gráficas limpias de barras apiladas y tabla interactiva estilizada).
  - **Microinteracciones y Animaciones**: Transiciones suaves al cambiar de pantalla, efectos hover/active con respuesta táctil visual y toasts más elegantes.
