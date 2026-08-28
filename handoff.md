# Handoff — Stay Time: Simulador de jornada de reparto

**Fecha**: 2026-08-28  
**Tag de respaldo**: `pre-refactor-jefe` (commit `f54199a`)  
**Repo**: https://github.com/jmtoral/stay_times_the_game  
**URL en vivo**: https://jmtoral.github.io/stay_times_the_game/

---

## 1. ¿Qué es esto?

Un serious game para personal de operaciones de reparto. Enseña tres conceptos:

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
| Persistencia | Ninguna (no hay localStorage ni backend actualmente) |

---

## 3. Estructura del archivo `index.html`

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

## 4. Máquina de estados

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

## 5. CONFIG — constantes clave

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

## 6. Rutas disponibles

| Key | Paradas | Cajas | Zonas estrechas | Ventanas |
|---|---|---|---|---|
| `canonica` | 7 | 500 | P2, P5 | P3 10:15, P5 12:30, P7 14:30 |
| `express` | 5 | 330 | P1, P3, P5 | P2 09:40, P4 11:30, P5 12:45 |
| `pesada` | 10 | 700 | P9 | P3 10:00, P6 12:30, P9 14:00 |
| `ligera` | 3 | 200 | P1, P3 | ninguna |

Más opción **🎲 Aleatoria** (ruta + semilla al azar).

---

## 7. Números de referencia (ruta canónica, semilla 12345)

| Escenario | Total | Cierre | Tiempo extra |
|---|---|---|---|
| Plan del planeador | 465 min | 14:45 | — |
| Camión grande perfecto | 468 min | 14:48 | 0 min |
| Camión chico perfecto | 496 min | 15:16 | 16 min |

- El chico está **condenado** con juego perfecto (+16 min extra).
- El grande perfecto queda **3 min** detrás del plan.
- Chico perfecto llega a P5 a las 12:15 (ventana 12:30, 15 min de margen).

---

## 8. Mecánicas actuales

### Minijuego de descarga
- Barra con aguja oscilante (delta-time, igual a 60 y 120 Hz).
- Zonas: verde (18%), amarilla (16% cada lado), roja (resto).
- Un solo input por maniobra (Espacio o tap). Machacar no da ventaja.
- Variaciones: `zonaEstrecha` → verde 12%, última maniobra → verde 22%, fatiga en 5+ maniobras, geocerca angosta verde ×0.65 y acelera aguja ×1.25.

### Eventos aleatorios
- 25% por parada (RNG sembrado), forzado ≥1.
- "Bodega bloqueada", +5 min al Stay Time.

### Geocerca
- 15% por parada, forzada ≥1.
- No suma minutos; endurece el minijuego.
- Visual: aro en el piso, camión estaciona fuera.

### Ventanas de recepción
- Si llegas tarde → rechazo, cajas = venta perdida, +8 min gestión, sin minijuego.

### Contrafactual
- Resultados recalculan con el otro camión, misma ejecución y semilla.

---

## 9. Lo que funciona (verificado)

- [x] Abre sin errores en consola
- [x] Números canónicos (468/496/465) ✓
- [x] Chico perfecto → P5 a 12:15 ✓
- [x] < 5000 triángulos (~438)
- [x] Maniobras por parada fijas (no dependen del desempeño)
- [x] Todas las constantes en CONFIG
- [x] RNG reproducible
- [x] GitHub Pages funcionando

---

## 10. Próximos cambios planeados (pedidos del jefe)

Documentados en `implementation_plan.md`. Resumen:

1. **Leaderboard** — nombre del jugador + puntaje en localStorage.
2. **Un solo camión** — eliminar selección y retorno a CEDIS.
3. **Menos paradas** — reducir de 7 a ~4 en la canónica.
4. **NPS del cliente** — emoji + calificación por parada según tardanza.
5. **Límite duro de 8 horas** — si te tardas, no completas la ruta (game over a las 15:00).

**Para revertir a este estado**: `git checkout pre-refactor-jefe`

---

## 11. Archivos del repo

| Archivo | Propósito |
|---|---|
| `index.html` | Todo el juego (HTML + CSS + JS + Three.js) |
| `SPEC.md` | Especificación original del juego |
| `CLAUDE.md` | Contexto para asistentes de código |
| `README.md` | Readme del repo |
| `last.md` | Bitácora de cambios de sesiones anteriores |
| `handoff.md` | **Este documento** |
| `.gitignore` | Excluye `.claude/` |

---

## 12. Cómo correr

```bash
# Opción 1: abrir directo en el navegador
start index.html

# Opción 2: servidor local (evita problemas de CORS con importmap)
npx -y serve .
# → http://localhost:3000

# Opción 3: ya desplegado
# https://jmtoral.github.io/stay_times_the_game/
```

No hay `npm install`, no hay build. Solo el archivo y un navegador.
