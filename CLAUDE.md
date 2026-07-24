## Tarea
Implementa el juego descrito en `SPEC.md`. Léelo completo antes de escribir
código. Es la fuente de verdad; no improvises fuera de lo que dice salvo
que sea ambiguo, en cuyo caso documenta la decisión en last.md.

## Contexto
Este es un serious game para personal de operaciones de reparto.
El objetivo pedagógico manda sobre el espectáculo visual — si hay que
elegir entre "verse más impresionante" y "enseñar el concepto claro",
gana lo segundo.

## Restricciones no negociables
- Un solo archivo index.html, sin build step, sin npm/bundler
- Three.js SOLO vía importmap ES module con versión fija — nunca UMD/three.min.js
- Prohibido cargar assets externos (modelos, texturas, fuentes)
- Prohibido Tailwind u otros frameworks CSS
- Menos de 5000 triángulos

## Checkpoints
Usa la sección "CRITERIOS DE ACEPTACION" de SPEC.md como lista de milestones.
Cada vez que verifiques un criterio, actualiza (sobrescribiendo) `last.md` con:
- Criterios en [x] vs [ ]
- Qué parte de la máquina de estados está implementada
  (MENU -> SELECCION_CAMION -> TRASLADO -> PARADA -> RETORNO_CEDIS -> RESULTADOS)
- Desviaciones del spec y por qué
- Siguiente paso concreto

No pases de un bloque grande a otro (ej: FASE 1 -> FASE 2) sin antes
actualizar last.md.

## Cómo probar
No hay build step. Para verificar:
- Abre index.html directo en el navegador o corre
  `python3 -m http.server` y entra a localhost:8000
- Verifica en consola del navegador que no haya errores (criterio de
  aceptación explícito en SPEC.md)
- Corre el juego con inputs perfectos (timing exacto en la zona verde)
  y compara contra los números exactos de SPEC.md:
  camión grande 468 min / 14:48, camión chico 496 min / 15:16 y 16 min
  de tiempo extra, plan del planeador 465 min / 14:45

## Ambigüedades
Si algo en SPEC.md no está claro o los números no cuadran entre sí,
detente y pregunta antes de asumir. No "arregles" los números del spec
silenciosamente — algunos son intencionales (ej: la nota de diseño sobre
el 6 de estacionamiento estándar en el plan del planeador).

## Entregas
Al final de cada sesión, deja index.html en un estado que abra sin
errores, aunque falten features — nunca a medio romper algo que ya
funcionaba.

## Inicio de sesión
Si existe last.md, léelo antes que SPEC.md.