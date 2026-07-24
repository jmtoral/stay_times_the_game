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
- **Local:** abre `index.html` en el navegador, o sirve la carpeta
  (`python -m http.server`) y entra a `localhost:8000`.

## Cómo está hecho

- Un único `index.html` autocontenido, sin build step.
- 3D con **Three.js r160** por importmap ES module (CDN, versión fija).
- Geometría 100% procedural, cámara isométrica fija, < 5000 triángulos.
- HUD en HTML/CSS plano. RNG con semilla (mulberry32) para demos reproducibles.

## Recalibrar

Todo lo tuneable vive en el objeto `CONFIG` al inicio del script:

- **Rutas:** `CONFIG.rutas` (estándar, express, pesada, ligera) — cada partida puede
  elegir ruta o `🎲 Aleatoria`. Cada parada tiene nombre y canal (Tradicional/Moderno).
- **Dificultad del minijuego:** `CONFIG.mj` (ciclo de la aguja, anchos de zona, tiempos
  verde/amarillo/rojo).
- **Costos y estrellas:** `CONFIG.costos` y `CONFIG.estrellas`.

La ruta **Estándar (demo)** usa semilla fija y produce los números de referencia:
camión grande perfecto **468 min / 14:48**, camión chico perfecto **496 min / 15:16**
(+16 extra), plan del planeador **465 min / 14:45**.
