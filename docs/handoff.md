# Handoff — Stay Time: Simulador de jornada de reparto

**Fecha**: 2026-08-28 (actualizado 2026-08-28 sesión 2)  
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
| Entrega | `index.html` + `beverage-delivery-truck.obj` + `caja-refrescos.obj` + 4 modelos de edificios OBJ (sin build step) |
| 3D | Three.js r160 por CDN (`importmap` ES module) + OBJLoader |
| Geometría | Camión OBJ (~6,312 tris), Cajas OBJ (~40,344 tris), 4 Edificios OBJ (~76,000 tris combinados). Fallback procedural automático |
| HUD | HTML/CSS glassmorphism superpuesto al canvas |
| Tipografía | Google Fonts: Plus Jakarta Sans (400–800) |
| Tema visual | Dark premium con backdrop-filter, glow accents, ACES Filmic tone mapping |
| Cámara | Isométrica fija, sin controles de órbita |
| RNG | Mulberry32 con semilla fija para reproducibilidad |
| Persistencia | localStorage + Cloudflare Workers KV (leaderboard global) |

---

## 3. Estructura del archivo `index.html` (estado ACTUAL, post-redesign)

```
Líneas ~1–10       Head (meta, fonts, importmap con Three.js + OBJLoader)
Líneas ~11–240     CSS premium (dark theme, glassmorphism, animaciones, variables)
Líneas ~241–330    HTML (canvas 3D + 5 pantallas HUD: menu, briefing, hud, minijuego, resultados)
Líneas ~332–470    CONFIG (constantes tuneables, NPS estricto)
Líneas ~472–482    RNG mulberry32
Líneas ~484–530    Helpers (ruta activa, tiempo, canal de venta)
Líneas ~532–600    NPS + Leaderboard (localStorage + Cloudflare Worker sync)
Líneas ~602–700    Modelo de cálculo (stayTimeParada, calcularPlan, simularJornada, calcularCostos)
Líneas ~702–730    Estado global G
Líneas ~732–920    Three.js (escena dark, OBJ loader + fallback procedural, destino, geocerca, loop)
Líneas ~922–1200   Máquina de estados (menu, briefing, traslado, parada, resultados)
Líneas ~1202–1310  Minijuego de descarga (aguja con glow, zonas, resolver maniobra)
Líneas ~1312–1340  Toasts con animación
Líneas ~1342–1530  Pantalla de resultados (dashboard ejecutivo, KPI hero, NPS badge)
Líneas ~1532–1600  Input (teclado/touch), selector de rutas, arranque
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
- [x] NPS calculado por parada en escala ESTRICTA 0%–100% (≤0→100%, ≤2→80%, ≤5→60%, ≤10→40%, ≤18→20%, >18→0%)
- [x] Corte de jornada a las 15:00 con penalización por no entrega (sin crash)
- [x] Leaderboard local + global (Cloudflare Workers KV)
- [x] Branding Coca-Cola integrado en menús y HUD
- [x] Camión 3D cargado desde `beverage-delivery-truck.obj` (~6,312 tris) con fallback procedural
- [x] Maniobras por parada fijas (no dependen del desempeño)
- [x] Todas las constantes en CONFIG
- [x] RNG reproducible
- [x] **Tema visual dark premium**: Plus Jakarta Sans, glassmorphism, backdrop-filter, glow accents
- [x] **Micro-animaciones**: fadeIn, slideUp, slideDown, needleGlow, toastIn, npsReveal, starPop, barGrow
- [x] **ACES Filmic tone mapping** + rim light para escena 3D dramática
- [x] **Materiales 3D mejorados**: metalness/roughness realistas para el camión OBJ

---

## 11. Archivos del repo

| Archivo | Propósito |
|---|---|
| `index.html` | Todo el juego (HTML + CSS + JS + Three.js) |
| `beverage-delivery-truck.obj` | Modelo 3D del camión (150 objetos, 6,312 tris, 7 materiales) |
| `caja-refrescos.obj` | Modelo 3D de la caja de refrescos con botellas (40,344 tris, 6 materiales) |
| `tiendita-de-barrio.obj` | Modelo 3D de Tiendita Tradicional 1 (4,236 tris, 9 materiales) |
| `tiendita-de-barri2o.obj` | Modelo 3D de Tiendita Tradicional 2 rústica (8,952 tris, 16 materiales) |
| `supermarket.obj` | Modelo 3D de Supermercado Moderno con estacionamiento (7,952 tris, 12 materiales) |
| `restaurante-chino.obj` | Modelo 3D de Restaurante Oriental / Moderno (55,728 tris, 8 materiales) |
| `SPEC.md` | Especificación original (pre-refactor) |
| `CLAUDE.md` | Contexto para asistentes de código |
| `README.md` | Readme del repo |
| `handoff.md` | **Este documento** |
| `cloudflare-worker/` | Worker para leaderboard global (KV) |
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

## 15. Tareas Completadas (Sesión 2 — 2026-08-28)

### ✅ 1. Sistema de Puntuación Granular y Combos — COMPLETADO
- Puntuación en tiempo real en HUD (`🏆 1,938 pts`) con multiplicador de combo (`🔥 x1.25 COMBO (2)`).
- **Puntos por Maniobra**: Diana perfecta (`1,000 pts`), Verde óptimo (`750 pts`), Amarillo (`350 pts`), Rojo (`100 pts`).
- **Bonus al Cierre**: Satisfacción NPS (`NPS% × 500`), Ahorro de tiempo (`100 pts/min`), Paradas completadas (`2,000 pts/parada`).
- **Leaderboard**: Ahora ordena por Puntos Totales descendente como métrica primaria para desempatar y discriminar claramente entre jugadores.

### ✅ 2. Calificación Individual de Clientes (1 a 10) y NPS Global Clásico — COMPLETADO
- **Calificación por cliente (1 a 10) en cada parada**:
  - **10 / 10** (Desviación ≤ 0 min): `😍 PROMOTOR (10/10 · Excelente)`
  - **9 / 10** (Desviación ≤ 1.5 min): `😍 PROMOTOR (9/10 · Muy satisfecho)`
  - **8 / 10** (Desviación ≤ 3.5 min): `😊 PASIVO (8/10 · Satisfecho)`
  - **7 / 10** (Desviación ≤ 5.5 min): `🙂 PASIVO (7/10 · Aceptable)`
  - **5 / 10** (Desviación ≤ 8.0 min): `😐 DETRACTOR (5/10 · Inconforme)`
  - **3 / 10** (Desviación ≤ 11.0 min): `😠 DETRACTOR (3/10 · Molesto)`
  - **1 / 10** (Desviación > 11.0 min): `🤬 DETRACTOR (1/10 · Pésimo)`
  - **0 / 10** (Rechazo o No entregada): `🤬 DETRACTOR (0/10)`
- **Fórmula de NPS Global Clásico**:
  $$\text{NPS Global} = \% \text{Promotores (9-10)} - \% \text{Detractores (0-6)}$$
  *(Escala de -100 a +100).*
- **Penalización por Zona Roja**: Terminar después de las 15:00 resta `-2 pts de NPS` por cada minuto de tiempo extra.
- **Estrellas basadas en NPS Global (-100 a +100)**:
  - **≥ +75** $\to$ ★★★★★ (5 estrellas · Clase Mundial)
  - **+50 a +74** $\to$ ★★★★☆ (4 estrellas · Excelente)
  - **+20 a +49** $\to$ ★★★☆☆ (3 estrellas · Aceptable)
  - **0 a +19** $\to$ ★★☆☆☆ (2 estrellas · En Riesgo)
  - **< 0** (predominan detractores) $\to$ ★☆☆☆☆ (1 estrella · Crítico)
- **Desglose en Resultados**: Muestra el desglose visual con promotores, pasivos, detractores y la fórmula de cálculo explícita.

### ✅ 4. Rediseño Look & Feel, Camión OBJ, Cajas 3D y Edificios de Paradas — COMPLETADO
- **Modelos 3D de Paradas**: Se reemplazó el cubo genérico por 4 modelos OBJ detallados y un CEDIS dedicado:
  - **P1 (Abarrotes Doña Mari · Tradicional)**: `tiendita-de-barrio.obj` con toldo Coca-Cola, estanterías y botelleros.
  - **P2 (Súper La Comercial · Moderno)**: `supermarket.obj` con estacionamiento marcado, corral de carritos y puertas de cristal.
  - **P3 (Tienda El Ahorro · Tradicional)**: `tiendita-de-barri2o.obj` con lona azul, techos de zinc rústicos, bolsas de papas colgadas y letreros.
  - **P4 (Minisúper San José · Tradicional)**: `tiendita-de-barrio.obj`.
  - **P5 (Supermercado Del Valle / Restaurante · Moderno)**: `restaurante-chino.obj` con tejados orientales de jade verde, pilares de laca roja y ornatos dorados.
  - **CEDIS**: Almacén y centro de distribución logístico con muelle de carga.
- **Geocerca GPS Plana**: Se eliminaron los postes verticales y se rediseñó como una proyección circular plana con anillos concéntricos tipo radar a nivel de ras de suelo (`polygonOffset`), evitando cualquier colisión visual con el camión, las cajas o la banqueta.
- **Skyline de Ciudad Distante (Cero Encimamientos)**: Los edificios de fondo se movieron al horizonte lejano (`Z = -11.0`) y a los flancos laterales, despejando por completo el lote central de descarga para que ningún edificio de fondo se encime o atraviese las paradas 3D.
- **Aguja y Minijuego Estilizados**: Aguja láser con punteros de diamante en top/bottom y brillo neon cian, pista en cápsula redondeada (`border-radius: 999px`) y línea de diana central para tiros perfectos.
- **Leaderboard Protegido**: No hay botones públicos de borrado. El reinicio de la base de datos en Cloudflare Worker está protegido por token de autenticación (`X-Admin-Secret`) y solo se ejecuta bajo tu solicitud explícita.
- **Camión y Cajas 3D**: `beverage-delivery-truck.obj` y `caja-refrescos.obj` con materiales PBR y posicionamiento sobre la banqueta sin colisiones.

---

## 16. Posibles Mejoras Futuras

- Sonido / SFX para maniobras y transiciones
- Partículas al aterrizar maniobra verde
- Animación de puertas del camión abriéndose durante la descarga
- PWA con service worker para jugar offline
- Modo nocturno vs diurno según hora del juego
- Dashboard de instructor (múltiples jugadores)

---

## 17. Sesión 2026-09-06/07 — Reorganización de archivos, Neobrutalismo y CEDIS 3D

### ✅ 1. Reorganización del repo — COMPLETADO

El repo tenía 6 `.obj` de ~21 MB tirados en la raíz junto a los `.md`. Ahora:

```
index.html            ← entrada; NO se puede mover (los .obj se resuelven relativos a él)
serve.js              ← servidor estático local (nuevo)
README.md
CLAUDE.md
assets/models/*.obj   ← los 7 modelos 3D
docs/                 ← SPEC.md, handoff.md, leaderboard.md
server/               ← antes cloudflare-worker/
```

- Los movimientos se hicieron con `git mv`, así que el historial se preserva.
- En `index.html` se agregó la constante `MODELOS = 'assets/models/'`; los tres
  `loader.load(...)` la anteponen. **Si mueves la carpeta de modelos, ese es el
  único punto a tocar.**
- `.gitignore` sigue excluyendo `.claude/`.

### ✅ 2. Estética neobrutalista (rojo/negro sobre fondo claro) — COMPLETADO

Se reescribió el bloque `<style>` completo. Se eliminó el tema *dark premium*
con glassmorphism (`backdrop-filter`, glows, degradados).

**Sistema de diseño** (documentado como comentario al inicio del `<style>`):

- Bordes duros negros `var(--bw)` = 3px en toda superficie.
- Sombra sólida sin blur: `box-shadow: 6px 6px 0 var(--ink)`.
- Cero degradados, cero blur. Colores planos y saturados.
- Interacción física: `:hover` desplaza −2px, `:active` hunde +4px y anula la sombra.
- Tipografía pesada (800), títulos en mayúsculas.
- Fondo de papel `#f4efe6` con retícula sutil de 26px.

**Tokens nuevos** (los viejos `--bg`, `--panel*`, `--glass-*`, `--red-50..950` ya
no existen). Se dejaron alias `--txt`, `--line`, `--accent` porque el JS los usa
en estilos inline:

| Token | Uso |
|---|---|
| `--ink` `#101010` | Negro estructural: bordes, texto, sombras |
| `--paper` `#f4efe6` / `--paper-2` `#fff` / `--paper-3` `#eae2d4` | Fondos |
| `--red` `#e01b24` | Rojo de marca (botón primario, acentos) |
| `--gold` / `--gold-bg` | Puntaje y medallas |
| `--ok` `--warn` `--bad` (+ `-bg`) | Semánticos con contraste sobre claro |

**Cuidado al tocar colores:** los rellenos saturados de la barra del minijuego
(`--verde`/`--amarillo`/`--rojo`) NO sirven como color de texto sobre papel.
El feedback de maniobra usa `--ok`/`--warn`/`--bad`, que sí tienen contraste.
Ese fue el motivo de cambiar `'#4ade80'`, `'var(--amarillo)'`, etc. en
`resolverManiobra()`.

El HUD del juego también quedó claro: flota sobre la escena 3D (que sigue
siendo oscura) como paneles de papel con borde negro. Contrasta bien.

### ✅ 3. Menú reordenado — COMPLETADO

- **Se eliminó** la frase *"El Stay Time es costo fijo de estacionamiento +
  atención al cliente (que la habilidad NO acelera) + descarga variable. ¡Que no
  se te acabe el tiempo!"* del bloque de objetivos (a petición explícita).
- Los 3 objetivos pasaron de `<br>` numerados a mano a una `<ol>` con
  contador CSS y numerador rojo en bloque.
- **El leaderboard ya no queda bajo el pliegue.** El menú pasó de una tarjeta
  única de 520px a un grid de 2 columnas (`.menu-wrap`, max 1060px): izquierda
  identidad + formulario + botón, derecha el leaderboard completo. Bajo 900px
  colapsa a 1 columna.
- `.lb-scroll` limita el alto a `min(52vh, 420px)` con `<th>` sticky.

### ✅ 4. CEDIS con modelo 3D — COMPLETADO

Se reemplazaron las 3 cajas procedurales por `distribution-center.obj`
(9,744 caras, 12 materiales, 2.2 MB).

- Medidas del modelo: **100 (X) × 11.26 (Y) × 54.35 (Z)**, apoyado en Y=0.
  La nave ocupa Z de −27.2 a +7.8; de ahí hacia +Z es patio de maniobras
  (asfalto, cajones pintados, topes de hule).
- **Calibración final: `CEDIS_ESCALA = 0.20`, `CEDIS_POS = [-1.0, 0, -1.2]`.**
  A 0.26 la nave se salía del encuadre ortográfico por la derecha.
  Con 0.20 el frente de los andenes queda en Z≈0.4, el patio llega a Z≈4.2
  (el camión estaciona en Z=2.4, o sea encima del patio: correcto) y el fondo
  de la nave en Z≈−6.6, sin tocar el skyline de Z=−11.
- Se conserva `cedisFallback` procedural; se descarta con
  `cedisGroup.remove(cedisFallback)` en cuanto el OBJ entra.
- Materiales mapeados por nombre: `asphalt`, `concrete_pad`, `line_paint`,
  `precast`, `wall_panel`, `roof_deck`, `brand_red`, `metal_grey`, `dark_trim`,
  `rubber`, `glazing`, `safety_yellow`.

### ✅ 5. BUG ARREGLADO: el botón DESCARGAR no hacía nada

`#btnDescargar` **nunca tuvo handler**. La única forma de resolver una maniobra
era la barra espaciadora (`window.addEventListener('keydown')`). En táctil
—donde no hay teclado— el juego era **injugable**: se quedaba clavado en
"Maniobra 1 de N" para siempre. Se detectó al automatizar una partida completa.

Se escucha `pointerdown` y no `click` a propósito: en un juego de precisión el
retardo de click (hasta ~300 ms en móvil) falsearía la posición de la aguja.
`preventDefault()` evita el click sintetizado.

### ✅ 6. `serve.js` y guía del leaderboard — COMPLETADO

- **`serve.js`**: servidor estático en Node (`node serve.js [puerto]`, default
  8000). Se agregó porque en esta máquina **no hay Python**, y `CLAUDE.md`
  sólo documentaba `python -m http.server`. Sirve `.obj` como `text/plain`.
- **`docs/leaderboard.md`**: instructivo completo para montar el marcador —
  las dos rutas (panel web y Wrangler), la API endpoint por endpoint con
  ejemplos de `curl`, la tabla del payload, verificación y troubleshooting.
  Ojo con la trampa documentada: el binding KV **tiene** que llamarse
  `LEADERBOARD_KV` o el worker cae en silencio al modo memoria y los puntajes
  "se borran solos".

### Verificación de esta sesión

Partida completa automatizada en Chrome headless (CDP) a 1440×900:

- **Consola del navegador limpia** en las 4 pantallas (sólo el 404 de
  `favicon.ico`, que no existe en el repo).
- Los **7 modelos OBJ** responden 200 en `assets/models/`.
- Máquina de estados recorrida entera: MENU → BRIEFING → CEDIS → TRASLADO →
  PARADA ×5 → RETORNO → RESULTADOS. Cierre 14:43, 5/5 entregas.
- `node --check` sobre el `<script type="module">` extraído: sintaxis OK.

### ⚠️ Pendientes / cosas que quedaron abiertas

1. **`_fresh` no resalta la fila propia cuando responde el worker.** En
   `renderLeaderboard()` el resaltado depende de `e._fresh`, que sólo existe en
   la entrada local; cuando llega la respuesta del worker se repinta sin ese
   flag y se pierde el resalte amarillo. Pre-existente, no se tocó.
2. **Números del leaderboard remoto no cuadran con los de la partida.** En la
   corrida de prueba la partida cerró con 12,209 pts y en el ranking apareció
   como 57,500 / NPS 0. Hay que revisar qué está guardando el worker. También
   pre-existente.
3. **`CLAUDE.md` menciona números de aceptación de dos camiones** (grande
   468 min / chico 496 min) pero el juego ya usa un **camión único**. Esos
   criterios ya no son verificables tal cual.
4. El logo de Coca-Cola sigue hotlinkeado de Wikimedia (ya anotado en `CLAUDE.md`).
