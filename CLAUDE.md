## Tarea
Implementa y mantén el juego descrito en `docs/SPEC.md`. Léelo completo antes de
escribir código. Es la fuente de verdad para la MECÁNICA y los NÚMEROS; no
improvises fuera de lo que dice salvo que sea ambiguo, en cuyo caso documenta
la decisión en `docs/handoff.md`.

Ojo: el spec describe el modelo pedagógico, no el stack. Donde el spec y este
archivo se contradigan sobre assets o arquitectura, manda este archivo (ver
"Restricciones" e "Historia de las restricciones").

## Contexto
Este es un serious game para personal de operaciones de reparto.
El objetivo pedagógico manda sobre el espectáculo visual — si hay que
elegir entre "verse más impresionante" y "enseñar el concepto claro",
gana lo segundo.

Proyecto hermano: `../juego_fleet_sizing` (Fleet Sizing). Comparten filosofía
—una sola palanca, modelo determinista, contrafactual al final— pero NO
comparten restricciones de stack: Fleet Sizing sí es un solo archivo
autocontenido, este no.

## Restricciones
- Sin build step, sin npm/bundler. Se edita y se recarga.
- Three.js SOLO vía importmap ES module con **versión fija** (hoy
  `three@0.160.0` desde unpkg) — nunca UMD/three.min.js.
- Prohibido Tailwind u otros frameworks CSS.
- La lógica del juego vive en `index.html`. No se fragmenta en módulos JS
  sueltos: el archivo único es para la LÓGICA, no para los assets.

## Assets externos: permitidos
El proyecto **carga assets externos y está bien** que lo haga. Hoy usa:

| Recurso | Origen |
|---|---|
| Modelos 3D (7 `.obj`, ~24 MB) | Archivos locales en `assets/models/` |
| Three.js 0.160.0 | `unpkg.com` vía importmap |
| Tipografía Plus Jakarta Sans | `fonts.googleapis.com` |
| Logo Coca-Cola | `upload.wikimedia.org` (hotlink) |
| Leaderboard | Worker propio en `workers.dev` |

Consecuencias que hay que tener presentes al trabajar:
- **El entregable NO es un solo archivo.** Mover `index.html` solo lo rompe.
  Se distribuye la carpeta completa.
- Las rutas de los `.obj` salen de la constante `MODELOS` en `index.html`. Si
  cambias de lugar `assets/models/`, ése es el único punto a tocar.
- **No abre con `file://`.** Los `.obj` se bloquean por CORS ("Cross origin
  requests are only supported for protocol schemes: ... http, https").
  Hay que servirlo por HTTP siempre.
- **No funciona sin internet** (fuentes, Three.js, logo).
- El logo de Coca-Cola viene hotlinkeado de Wikimedia: si se necesita
  estabilidad o uso fuera de demo interna, hay que traerlo local o quitarlo.

## Presupuesto de geometría
El spec pide "<5000 triángulos". **Eso ya no aplica** y hace mucho: los
modelos OBJ suman ~133,300 caras.

| Modelo | Caras |
|---|---|
| `restaurante-chino.obj` | 55,728 |
| `caja-refrescos.obj` | 40,344 |
| `distribution-center.obj` | 9,744 |
| `tiendita-de-barri2o.obj` | 8,952 |
| `supermarket.obj` | 7,952 |
| `beverage-delivery-truck.obj` | 6,312 |
| `tiendita-de-barrio.obj` | 4,236 |

El criterio real hoy es de RENDIMIENTO, no de conteo: la escena debe correr
fluida en una laptop de oficina sin GPU dedicada. Antes de agregar otro modelo
pesado, medir FPS. `caja-refrescos.obj` se instancia varias veces por parada,
así que su costo se multiplica: es el primer candidato a decimar si algo va
lento.

## Bitácora
El registro de sesiones es **`docs/handoff.md`** (versiones anteriores de este
archivo mencionaban un `last.md` que nunca existió). Cada vez que verifiques
un criterio de aceptación o cierres un bloque de trabajo, agrega ahí:
- Criterios en [x] vs [ ]
- Qué parte de la máquina de estados está implementada
  (MENU -> SELECCION_CAMION -> TRASLADO -> PARADA -> RETORNO_CEDIS -> RESULTADOS)
- Desviaciones del spec y por qué
- Siguiente paso concreto

No pases de un bloque grande a otro sin antes actualizar `docs/handoff.md`.

## Cómo probar
**Hace falta un servidor HTTP; abrir el archivo directo no sirve.**

```bash
node serve.js                 # → http://localhost:8000
node serve.js 3000            # otro puerto
python -m http.server 8000    # equivalente, si tienes Python
```

En la máquina de Manuel **no hay Python instalado**: usa `serve.js`.

Verificaciones:
- Consola del navegador sin errores (criterio de aceptación explícito del spec).
  Ignora el 404 de `favicon.ico`: no existe en el repo.
- Que los 7 modelos OBJ carguen: si ves cubos genéricos o huecos donde van las
  paradas —o tres cajas rojas en lugar del CEDIS— están fallando.
- Que el botón DESCARGAR responda a mouse/touch, no sólo la barra espaciadora
  (fue un bug real: el botón no tenía handler y el juego era injugable en táctil).
- Correr con inputs perfectos (timing exacto en la zona verde) y comparar
  contra los números de docs/SPEC.md. **Ojo:** el spec habla de camión grande
  (468 min / 14:48) y chico (496 min / 15:16), pero el juego ya usa un
  **camión único**; ese criterio quedó desfasado.

## Ambigüedades
Si algo en `docs/SPEC.md` no está claro o los números no cuadran entre sí,
detente y pregunta antes de asumir. No "arregles" los números del spec
silenciosamente — algunos son intencionales (ej: la nota de diseño sobre
el 6 de estacionamiento estándar en el plan del planeador).

## Entregas
Al final de cada sesión, deja `index.html` en un estado que abra sin
errores, aunque falten features — nunca a medio romper algo que ya
funcionaba.

## Historia de las restricciones
La versión original de este archivo declaraba como "no negociables":
"un solo archivo index.html" y "prohibido cargar assets externos (modelos,
texturas, fuentes)". El proyecto se alejó de ambas de forma deliberada al
adoptar modelos OBJ, tipografía web y un leaderboard con backend propio, y
las restricciones quedaron describiendo un proyecto que ya no existía.

Se relajaron a petición explícita de Manuel (2026-09-04) para que este archivo
describa la realidad. Lo que **sí** sigue siendo firme es lo de la sección
"Restricciones": sin build step, Three.js por importmap con versión fija, sin
frameworks CSS, y la lógica en un solo archivo.
