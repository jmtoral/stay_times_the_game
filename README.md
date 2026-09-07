# Stay Time — Simulador de jornada de reparto

Serious game para personal de operaciones de reparto. El jugador elige la flota,
descarga con precisión y trata de cerrar la jornada de 8 horas (07:00 → 15:00)
dentro de presupuesto, aprendiendo tres cosas:

1. El **Stay Time** se compone de costo fijo de estacionamiento/maniobra, un bloque
   de atención al cliente que la habilidad **no** acelera, y una descarga variable.
2. La jornada es un **presupuesto cerrado** de 480 minutos; excederlo cuesta.
3. La desviación contra el plan **no es lineal**: se propaga a las paradas siguientes
   y puede provocar rechazos por ventana de recepción.

## Jugar

- **En línea (GitHub Pages):** https://jmtoral.github.io/stay_times_the_game/
- **Local:** hace falta servir la carpeta por HTTP — abrir `index.html` con
  doble clic **no funciona** (los modelos `.obj` se bloquean por CORS).

  ```bash
  node serve.js        # → http://localhost:8000
  # o, si tienes Python:
  python -m http.server 8000
  ```

## Estructura

```
index.html            Todo el juego: HTML + CSS + lógica. No lo muevas de la raíz.
serve.js              Servidor estático para desarrollo local.
assets/models/        Los 7 modelos 3D .obj (~24 MB).
docs/                 SPEC.md · handoff.md (bitácora) · leaderboard.md (backend).
server/               Cloudflare Worker del leaderboard global.
```

## Cómo está hecho

- Sin build step, sin npm, sin bundler: se edita y se recarga.
- Toda la **lógica** vive en `index.html`; los assets viven fuera.
- 3D con **Three.js r160** por importmap ES module (CDN, versión fija).
- Modelos OBJ con fallback procedural, cámara isométrica fija.
- HUD en HTML/CSS plano, estética neobrutalista (rojo/negro sobre fondo claro).
- RNG con semilla (mulberry32) para demos reproducibles.

## Recalibrar

Todo lo tuneable vive en el objeto `CONFIG` al inicio del script:

- **Rutas:** `CONFIG.rutas` (estándar, express, pesada, ligera) — cada partida puede
  elegir ruta o `🎲 Aleatoria`. Cada parada tiene nombre y canal (Tradicional/Moderno).
- **Dificultad del minijuego:** `CONFIG.mj` (ciclo de la aguja, anchos de zona, tiempos
  verde/amarillo/rojo).
- **Costos y estrellas:** `CONFIG.costos` y `CONFIG.estrellas`.

La ruta **Estándar (demo)** usa semilla fija, así que es reproducible entre
partidas.

## Leaderboard

Sin configurar nada, cada jugador ve su propio Top 10 en `localStorage`. Para el
ranking global compartido, sigue [`docs/leaderboard.md`](docs/leaderboard.md).
