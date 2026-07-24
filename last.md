# Estado — Stay Time (última sesión: 2026-07-23)

Entrega completa + iteración de mejoras: `index.html` autocontenido, un solo archivo,
Three.js r160 por importmap ES module (URL verificada 200), geometría procedural,
HUD en HTML/CSS plano. Sin build step.

## Cambios de la última iteración (a petición del usuario)
- **Varias rutas seleccionables** en el menú (`CONFIG.rutas`: canonica, express, pesada,
  ligera) + opción **🎲 Aleatoria** (ruta y semilla nuevas cada partida). La "Estándar
  (demo)" sigue con semilla fija y produce los números del spec. "Repetir ruta" conserva
  ruta+semilla.
- **Retorno a CEDIS ahora es dinámico** por capacidad (`calcularRetornos`), soporta
  múltiples retornos (p.ej. chico en pesada = 2). Se eliminaron `retornoDespuesDe`/
  `retornoCEDISmin` por camión; el bloque de 65 min vive en `CONFIG.bloques.retornoCEDIS`.
- **Barra del minijuego más abajo** (anclada al fondo, paddings reducidos, safe-area).
- **Animación de traslado rehecha**: el camión SALE de pantalla por la derecha, a mitad
  se reconfigura el `destino` (edificio con forma/color/posición distintos por parada) y
  ENTRA por la izquierda — se siente que llega a otro lugar.
- **Paleta de rojos corporativa** aplicada al tema/branding (CSS + escena 3D). Los colores
  funcionales (4 categorías del reloj + zonas verde/amarillo/rojo del minijuego) se
  mantienen distinguibles por legibilidad; sólo 'extra' y 'rojo' usan el rojo de la paleta.
- Verificado headless en Chrome: canónica intacta (468/496/465, C.P5=12:15), rutas nuevas
  sin errores, 354 triángulos, 0 errores JS.

## Segunda iteración de UI (a petición del usuario)
- **Tema CLARO**: "demasiado rojo" → superficies claras (bg #f2ebeb, panels blancos,
  texto oscuro), rojo corporativo sólo como acento/branding. Escena 3D también aclarada (fondo,
  suelo, edificios) con camión rojo que contrasta. Corregidos varios `var(--x)cc`/`ee`
  que eran CSS inválido (ahora hex8 explícito).
- **Nombres y canal por parada**: cada ruta tiene `nombres[]` y `canal[]` (paralelos a
  `cajas`). 'tradicional' = tiendita = "Canal Tradicional"; 'moderno' = supermercado =
  "Canal Moderno". Se muestran en: lista de la pantalla de selección, panel de parada
  (con badge), avisos, resumen de desviación y tabla de resultados. En 3D, el edificio de
  destino es más grande/ancho en Canal Moderno y chico en Tradicional. Helpers:
  `nombreParada`, `canalDe`, `canalLabel`, `canalBadge`.
- Verificado headless: números intactos + resultados renderizan con ambos canales, 0 errores.

## Geocerca (nueva mecánica, a petición del usuario)
- `CONFIG.geocerca`: probabilidad 0.15/parada, forzada ≥1 (`prerodarGeocercas`, mismo
  patrón que `prerodarEventos`), `factorZonaVerde` 0.65 y `factorVelocidadAguja` 1.25.
- **Decisión de diseño confirmada con el usuario**: NO suma minutos fijos, sólo endurece
  el minijuego (se apila sobre estrecha/última/fatiga). Por eso los números canónicos
  468/496/465 quedan intactos incluso si TODAS las paradas estuvieran fuera de geocerca
  (verificado headless).
- Aviso no bloqueante al llegar ("🛰️ fuera de geocerca") + entra en `etiquetaDificultad()`
  (visible antes de la 1ª maniobra) + marca 🛰️ en la tabla de resultados.
- **3D**: aro de geocerca en el piso (`geofenceGrp`/`geoFill`/`geoRing`/`geoPosts`), teal
  cuando el camión está dentro, rojo y pulsante cuando está fuera; el camión se estaciona
  visualmente desplazado del aro (`STOP_X_OUT`). La animación de traslado ahora usa
  `desde/hasta` en vez de offsets fijos, para soportar el punto de parada variable.
- Verificado headless: números intactos, pre-rodado reproducible con la semilla,
  dificultad se aplica sólo fuera de geocerca (verde ×0.65, aguja ×1.25), 3D sin errores
  (~750 tris con el aro visible, bajo 5000), resultados marcan la anomalía.

## Despliegue online (GitHub Pages)
- Repo: https://github.com/jmtoral/stay_times_the_game (público)
- URL en vivo: https://jmtoral.github.io/stay_times_the_game/
- El `index.html` con CDN funciona tal cual en Pages (no bloquea unpkg). No se inlineó
  Three.js. `.claude/` está en `.gitignore`.
- Verificado headless contra la URL en vivo: menú carga, Three.js baja del CDN, 0 errores
  de consola reales (los "errores" que aparecen en el log son telemetría de Chrome).
- Nota: para publicar como Artifact de claude.ai en el futuro habría que INLINEAR Three.js
  (el sandbox del Artifact bloquea CDNs); en GitHub Pages no hace falta.

## Tercera iteración
- **Minijuego con fondo transparente**: el panel dejó de tapar/lavar el camión; ahora se
  aprecia cómo baja la pila de cajas mientras juegas. Cajas recoloreadas a cartón visible.
  Legibilidad del texto del minijuego resuelta con text-shadow (no cubre la escena).
- **Criterios de comportamiento verificados headless sobre el código real** (antes [~]):
  - [x] Machacar la tecla no da ventaja: 6 llamadas síncronas a resolverManiobra → 1 sola
    maniobra registrada (lock activo/resolviendo confirmado).
  - [x] Propagación: +ejecución en P2 desplaza la llegada real de P3..P7 por igual.
  Quedan garantizados por construcción (revisión de código, no test): aguja por delta-time
  (60/120 Hz), Espacio con preventDefault (no scroll), animClock pausado en document.hidden.
  Sólo falta confirmación humana del tacto a 375px y la "sensación" de la aguja.

## Máquina de estados
Implementada completa y una función por estado:
`MENU → SELECCION_CAMION → TRASLADO → PARADA → RETORNO_CEDIS → RESULTADOS`
- MENU: `estadoMenu()`
- SELECCION: `estadoSeleccion()` (info de ruta + specs de ambos camiones, decisión informada)
- TRASLADO: `entrarTraslado()` (2 s anim, Stay Time detenido, jornada corre)
- PARADA: `entrarParada()` → minijuego → `salirParada()` (resumen desviación 2 s)
- RETORNO_CEDIS: `retornoCEDIS()` (sólo chico, +65 min tras P4)
- RESULTADOS: `estadoResultados()` (tabla plan/real, desglose, contrafactual, estrellas,
  consejo, repetir con misma semilla)

## Criterios de aceptación

Verificados de forma AUTOMÁTICA (self-test temporal en el motor JS de Chrome headless
sobre el código real, ya retirado del entregable):
- [x] Abre sin errores en consola (headless: 0 errores JS).
- [x] Camión grande perfecto: 468 min, cierra 14:48, sin tiempo extra.
- [x] Camión chico perfecto: 496 min, cierra 15:16, 16 min extra. Documentado en comentario.
- [x] Plan del planeador: 465 min, cierra 14:45. Grande perfecto queda 3 min detrás.
- [x] Chico perfecto llega a P5 a las 12:15 (ventana 12:30, 15 min de margen).
- [x] Menos de 5000 triángulos (render measurado: 438 tris).
- [x] Nº de maniobras por parada no depende del desempeño (fijo desde `num[]` = ceil(cajas/20)).
- [x] Todos los números tuneables viven en CONFIG.

Verificados por LÓGICA (mismo modelo validado en PowerShell/JS; implementados pero
pendientes de click-through manual en navegador real):
- [~] Atraso provocado en P2 se propaga a P3–P7 (acumulador de reloj; +10 en P2 → +10 en P3..P7 confirmado en modelo).
- [~] Aguja: misma velocidad angular a 60 y 120 Hz (posición por delta-time con `animClock`, no por frame).
- [~] Machacar la tecla no da ventaja (lock `activo`/`resolviendo`, un solo input por maniobra).
- [~] Espacio no hace scroll (`preventDefault` en keydown, listener no pasivo).
- [~] Ningún reloj avanza en segundo plano (`animClock` sólo suma si `!document.hidden`; reloj de jornada es discreto por acción).
- [~] Funciona con tap en viewport 375px (CSS responsive, botón ≥64px, touchstart con preventDefault).

## Desviaciones del SPEC (decisiones documentadas)
- Barra de jornada: añadí una 5ª categoría `CEDIS` (rojo claro de la paleta) para
  carga+liquidación, que no encajan en las 4 listadas pero deben representarse. Los
  minutos > 480 se recolorean a `extra` sin importar categoría.
- Corte duro 17:00: paradas restantes se marcan NO ENTREGADA y se cobran como cajas no
  entregadas (`costoCajaNoEntregada` × cajas), sin sumar `costoRechazo` (reservado a
  rechazo por ventana). No se dispara en la ruta canónica normal.
- "Última maniobra 22%" tiene precedencia sobre "estrecha 12%" cuando coinciden (es el remate).
- Paleta de rojos: aplicada como TEMA/branding, no a los colores funcionales/semánticos
  (categorías del reloj + zonas del minijuego), que deben permanecer distinguibles.
- El retorno a CEDIS dejó de ser "tras la parada 4" fijo; ahora se deriva de la capacidad
  del camión vs las cajas de la ruta (para canónica+chico da [P4], idéntico al spec).

## Siguiente paso concreto
Click-through manual en navegador (abrir index.html directo) para confirmar los 6
criterios marcados [~], sobre todo: prueba a 375px con tap, y verificar visualmente
que la aguja se siente idéntica y que machacar Espacio no adelanta maniobras.
Luego: calibrar costos/umbrales de estrellas si el usuario lo pide.
