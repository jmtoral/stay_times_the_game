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

### T2: Menos paradas + ajustar tiempos
- **Ruta canónica**: 5 paradas (no 7). Las demás rutas se ajustan proporcionalmente.
- **Ajustar** `trasladoPorTramo` y `atencionCliente` para que la tensión con 8 horas funcione.
- **Diseño propuesto** para ruta canónica (5 paradas):
  ```
  cajas:        [100, 80, 120, 80, 100]   // suma 480
  zonaEstrecha: [false, true, false, false, true]
  ventanaCierre:[null, null, "10:45", null, "13:30"]
  trasladoPorTramo: 25 (era 17)
  atencionCliente: 15 (era 12)
  maniobras: [5, 4, 6, 4, 5] = 24 total
  ```
- **Tensión**: jugador perfecto → 451 min (29 min de margen). Jugador mediocre (avg amarillo) → ~487 min (7 min de rebase, última parada en riesgo). Jugador malo → 535+ min, pierde 1-2 paradas.
- `trasladoPorTramo` se hace PER-ROUTE (propiedad opcional de cada ruta). Fallback a `CONFIG.bloques.trasladoPorTramo`.

### T3: Límite de 8 horas
- **corteDuroMin** pasa de 17:00 (1020) a **15:00 (900)**.
- **NO es game over**: el juego va a resultados con las paradas restantes como NO ENTREGADAS. Se penalizan con `costoCajaNoEntregada × cajas` y NPS 0.
- Eliminar el concepto de "zona roja" (ya no hay tiempo extra posible).
- `spanBarraMin` se ajusta a ~540 para que la barra muestre hasta 16:00 (espacio visual para rebase).
- En `salirParada()`, verificar `G.reloj >= corteDuroMin` antes de ir a la siguiente.

### T4: Calificación del cliente (NPS + emoji)
- **Nuevo en CONFIG**:
  ```js
  nps: {
    umbrales: [
      { maxDesvMin: 0,   emoji: '😍', nps: 10, label: 'Encantado' },
      { maxDesvMin: 3,   emoji: '😊', nps: 9,  label: 'Muy satisfecho' },
      { maxDesvMin: 8,   emoji: '🙂', nps: 7,  label: 'Satisfecho' },
      { maxDesvMin: 15,  emoji: '😐', nps: 5,  label: 'Neutral' },
      { maxDesvMin: 25,  emoji: '😠', nps: 3,  label: 'Insatisfecho' },
      { maxDesvMin: Infinity, emoji: '🤬', nps: 1, label: 'Furioso' }
    ]
  }
  ```
- **Cálculo**: desviación = stay time real − stay time planeado. Si ≤0 → 😍. Si 25+ → 🤬. Paradas rechazadas/no entregadas → 🤬 NPS 0.
- **Dónde se muestra**:
  - `salirParada()` → emoji grande + label en el resumen de desviación.
  - Panel de parada (HUD) → NPS en vivo conforme avanza el stay time.
  - Resultados → columna de emoji+NPS en la tabla. NPS promedio como KPI.
- **Nota pedagógica**: con juego perfecto, las paradas con `zonaEstrecha` sacan NPS 7 (no 10) porque la penalización estructural (+8 min) genera desviación vs el plan (que ignora estrechas). Esto enseña que la infraestructura impacta la satisfacción del cliente.

### T5: Leaderboard
- **Input de nombre** en el menú (campo `<input id="nombreInput">`), requerido.
- **Almacenamiento**: `localStorage.setItem('stLeaderboard', JSON.stringify(entries))`.
- **Métrica principal**: NPS promedio (higher = better). Secundario: costo total.
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
- La paleta roja del juego ya es Coca-Cola (#cc0000, #ff0000, etc.) — conservarla.
- Agregar `| Coca‑Cola` al `<title>`.

---

## 10. Lo que funciona HOY (verificado)

- [x] Abre sin errores en consola
- [x] Números canónicos (468/496/465) ✓ (van a cambiar con el refactor)
- [x] Chico perfecto → P5 a 12:15 ✓ (ya no aplica post-refactor)
- [x] < 5000 triángulos (~438)
- [x] Maniobras por parada fijas (no dependen del desempeño)
- [x] Todas las constantes en CONFIG
- [x] RNG reproducible
- [x] GitHub Pages funcionando

---

## 11. Archivos del repo

| Archivo | Propósito |
|---|---|
| `index.html` | Todo el juego (HTML + CSS + JS + Three.js) |
| `SPEC.md` | Especificación original (pre-refactor) |
| `CLAUDE.md` | Contexto para asistentes de código |
| `README.md` | Readme del repo |
| `last.md` | Bitácora de sesiones anteriores |
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
