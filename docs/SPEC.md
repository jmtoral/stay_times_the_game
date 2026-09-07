Rol: Actúa como Lead Game Developer y diseñador de serious games. El objetivo
pedagógico manda sobre el espectáculo visual.

OBJETIVO DE APRENDIZAJE
El jugador debe salir entendiendo tres cosas:
1. El Stay Time se compone de un costo fijo de estacionamiento y maniobra que
   depende del vehículo, un bloque de atención al cliente que la habilidad no
   acelera, y un costo variable de descarga que depende de la ejecución.
2. La jornada es un presupuesto cerrado de 8 horas. Excederlo tiene costo.
3. La desviación contra el plan no cuesta linealmente: se propaga a todas las
   paradas siguientes y puede provocar rechazos por ventana de recepción.
Mensaje de fondo: la decisión de flota puede condenar la jornada antes de
descargar la primera caja, y una ejecución excelente no siempre la rescata.

Audiencia: personal de operaciones de reparto. Partida activa de 3 a 4 minutos.

STACK Y ENTREGA
- Un único archivo index.html autocontenido, sin build step.
- 3D: Three.js por CDN con versión FIJA vía importmap ES module. No uses builds
  UMD (three.min.js), ya no existen en r160+. Verifica que la URL del CDN resuelva
  antes de usarla.
- Geometría 100% procedural con primitivas. Prohibido cargar modelos, texturas o
  fuentes externas.
- HUD en HTML y CSS plano superpuesto al canvas. NO uses Tailwind ni frameworks.
- Cámara isométrica fija, sin controles de órbita. Menos de 5000 triángulos.

ESTRUCTURA DEL CODIGO
- Objeto CONFIG al inicio con TODAS las constantes: tiempos, capacidades, costos,
  umbrales, probabilidades y definición de la ruta. Ningún número mágico.
- RNG con semilla (mulberry32) desde CONFIG.seed, para demos reproducibles.
- Máquina de estados: MENU -> SELECCION_CAMION -> TRASLADO -> PARADA ->
  RETORNO_CEDIS -> RESULTADOS. Una función por estado.
- Comentarios en español que expliquen la lógica de negocio, no la sintaxis de JS.

RELOJ DE JORNADA (elemento central del HUD)
- Jornada de 480 min. Inicia 07:00, límite 15:00. Muestra SIEMPRE la hora del día,
  no una cuenta regresiva.
- Barra de jornada segmentada con colores distintos para traslado, stay time,
  retorno a CEDIS y tiempo extra.
- Al cruzar las 15:00 entra en zona roja y acumula tiempo extra. NO es game over.
- Corte duro a las 17:00 (600 min): la ruta se trunca y las paradas restantes se
  marcan como NO ENTREGADAS con su costo.
- Usa performance.now() y pausa el acumulador en visibilitychange.

DEFINICION DE LA RUTA (en CONFIG, editable)
  7 paradas.
  cajas: [80, 60, 100, 40, 90, 70, 60]        // 500 cajas totales
  zonaEstrecha = true en las paradas 2 y 5
  ventanaCierre: parada 3 -> "10:15", parada 5 -> "12:30", parada 7 -> "14:30",
                 resto null
  cajasPorManiobra = 20 (tarima con patín hidráulico)
  maniobras por parada = Math.ceil(cajas / 20)  ->  4, 3, 5, 2, 5, 4, 3 = 26
Bloques fijos que NO son Stay Time:
  cargaCEDIS = 35 min, liquidacionFinal = 25 min
  trasladoPorTramo = 17 min, 8 tramos (CEDIS -> P1, 5 entre paradas, P7 -> CEDIS)
Perfiles alternos, solo comentados en CONFIG, no activos en esta entrega:
  RUTA_LIGERA: 3 paradas, 200 cajas, 2 zonas estrechas   (gana el camión chico)
  RUTA_PESADA: 10 paradas, 700 cajas, 1 zona estrecha    (gana el camión grande)

FASE 1: SELECCION DE CAMION
Antes de elegir, muestra volumen total, número de paradas de acceso estrecho y las
ventanas de recepción. La decisión debe ser informada, no adivinada.
- Camión chico: capacidad 280 cajas, estacionamiento 3 min por parada, sin
  penalización en zona estrecha. Como 280 < 500, obliga a un RETORNO A CEDIS
  después de la parada 4. Ese bloque cuesta 65 min (25 de traslado a CEDIS, 15 de
  recarga y andén, 25 de regreso a la ruta) y es ADICIONAL al traslado normal
  entre la parada 4 y la 5. No es Stay Time, va en su propia categoría.
- Camión grande: capacidad 550 cajas, sin retorno. Estacionamiento 6 min por
  parada, más 8 min adicionales SOLO en paradas con zonaEstrecha = true.

FASE 2: MINIJUEGO DE DESCARGA (precisión, no velocidad)
- Número de maniobras FIJO por parada. Cada maniobra entrega hasta 20 cajas. El
  acierto no cambia cuántas cajas bajas, cambia CUANTO TARDAS. Esto mantiene la
  duración de la sesión predecible.
- Barra horizontal con aguja oscilante. Zona verde central 18% del ancho, amarilla
  16% a cada lado, resto rojo.
- La aguja se mueve con delta time (requestAnimationFrame más reloj), NO con
  incrementos por frame: la dificultad debe ser idéntica a 60 y a 120 Hz.
  Ciclo completo base: 1.6 s.
- Input: tecla Espacio (con preventDefault para evitar scroll) o tap en botón de
  mínimo 64px, funcional en móvil.
- Un solo input por maniobra. Machacar la tecla no acelera nada: mientras la
  maniobra se resuelve, el input queda bloqueado. Apretar antes de la zona verde
  penaliza exactamente igual que apretar después. No hay bonus por rapidez de
  reacción, solo por precisión de timing.
- Prohibido: combos, rachas, multiplicadores o cualquier recompensa acumulativa
  por aciertos consecutivos. Cada maniobra es independiente.
- Tiempo por maniobra: verde 5.0 min, amarillo 6.5 min, rojo 8.5 min.
- Feedback visual inmediato y contador "maniobra 3 de 5".

VARIACION DE DIFICULTAD POR CONDICION OPERATIVA
La aguja y la zona verde no son constantes, y el cambio debe ser legible antes de
la primera maniobra de cada parada.
- zonaEstrecha = true: zona verde al 12% en vez de 18%.
- Paradas de 5 o más maniobras: la aguja acelera 8% por maniobra a partir de la
  tercera (fatiga y desorden acumulado en el andén).
- Ultima maniobra de cada parada: zona verde al 22%. Es el remate.
Muestra en el HUD el motivo con una etiqueta corta ("acceso estrecho, menos margen
de maniobra"), para que el jugador conecte dificultad con condición operativa.

BLOQUE FIJO DE ATENCION AL CLIENTE
12 min por parada (conteo de tarima, factura, cobranza), automáticos. Muéstralos
explícitos en el desglose: es Stay Time que la habilidad no puede acelerar, y ese
contraste es parte de la lección.

EVENTO ALEATORIO
Probabilidad 25% por parada, con el RNG sembrado. Aviso no bloqueante ("Bodega
bloqueada"), +5 min al Stay Time de esa parada. Garantiza al menos uno por partida
forzándolo en una parada aleatoria del tramo medio si no ocurrió ninguno.

PLAN CONTRA REAL (corazón del juego)
Al iniciar la ruta calcula el PLAN teórico del planeador, UNA sola vez y con
parámetros estándar. No se recalcula: es un documento fijo hecho antes de que el
jugador eligiera camión.
  stayTimePlaneado(p) = 12 + 6 + maniobras(p) * 5.5
  horaPlaneadaLlegada(p) = 07:00 + cargaCEDIS + traslados acumulados +
                           stayTimePlaneado de las paradas previas
Nota de diseño: el 6 es el estacionamiento estándar del camión grande, así que el
plan asume implícitamente ese vehículo y además ignora las zonas estrechas. Quien
elige chico arrastra desviación desde la primera parada sin haber hecho nada mal.

HUD durante el juego, siempre visible:
  - Hora planeada de llegada contra hora real de llegada a la parada actual.
  - Atraso acumulado en minutos, con signo y color.
  - Stay Time planeado de la parada contra Stay Time real, en vivo.
Al salir de cada parada, resumen de desviación durante 2 segundos.

VENTANAS DE RECEPCION
Si la hora real de llegada supera ventanaCierre de esa parada:
  - El cliente rechaza. Las cajas no se descargan.
  - Se registra costoRechazo y las cajas quedan como venta perdida.
  - Se suman 8 min de gestión y reprogramación.
Aviso que conecte causa y efecto: "Llegaste 14 min tarde por el atraso acumulado
desde la parada 2".

TRASLADO ENTRE PARADAS
Automático, 2 s de animación. El HUD indica "en traslado, el reloj de Stay Time
está detenido" mientras el reloj de jornada SI sigue corriendo. La distinción
entre los dos relojes debe ser visualmente obvia.

MODELO DE CALCULO (pseudocódigo, impleméntalo tal cual)
  stayTimeParada(p, camion):
      t = camion.estacionamiento
      if p.zonaEstrecha: t += camion.penalizacionEstrecha
      t += 12                                  // atención al cliente
      t += suma de tiempos de las maniobras
      if eventoAleatorio(p): t += 5
      if rechazoPorVentana(p): t = camion.estacionamiento + 8
      return t

  jornadaTotal = cargaCEDIS + sum(traslados) + sum(stayTimeParada) +
                 retornoCEDIS + liquidacionFinal
  tiempoExtra = max(0, jornadaTotal - 480)

COSTOS (en CONFIG, placeholders a calibrar por el usuario)
  costoMinutoExtra = 4.5
  costoRechazo = 850
  costoCajaNoEntregada = 12
  costoRetornoCEDIS = 300

PANTALLA DE RESULTADOS
1. Cierre de jornada: hora real de término y minutos de tiempo extra, en grande.
2. Tabla PLAN contra REAL por parada: stay time planeado, real, desviación, hora
   planeada, hora real, atraso acumulado. Es el bloque más importante.
3. Desglose apilado del Stay Time: estacionamiento, atención al cliente, descarga,
   eventos. Aparte y en otro color: traslados, retorno a CEDIS y tiempo extra,
   etiquetados como NO Stay Time.
4. Costo total del turno, desglosado por concepto.
5. CONTRAFACTUAL OBLIGATORIO: recalcula la jornada con el otro camión conservando
   el desempeño real del jugador en el minijuego y la misma semilla. Las dos
   jornadas lado a lado, con tiempo extra y costo.
6. Calificación en estrellas sobre el costo total, umbrales explícitos en CONFIG.
7. Consejo operativo según el mayor contribuyente a la desviación, entre cuatro
   casos: decisión de flota, ejecución de descarga, propagación de atraso, eventos.
8. Botón "repetir ruta" que regresa a la selección de camión conservando la
   semilla, para que la comparación sea justa.

RESPONSIVE Y ACCESIBILIDAD
Meta viewport correcto, touch-action: manipulation, sin dependencia de teclado.
Resize handler que actualice cámara y renderer, devicePixelRatio limitado a 2.
El HUD usa pointer-events: none salvo en elementos interactivos.

CRITERIOS DE ACEPTACION (verifica cada uno antes de entregar)
[ ] Abre en el navegador sin errores en consola.
[ ] Camión grande con juego perfecto: 468 min, cierra 14:48, sin tiempo extra.
[ ] Camión chico con juego perfecto: 496 min, cierra 15:16, 16 min de tiempo
    extra. Es decir, la ruta por defecto condena al camión chico aunque el
    jugador sea impecable. Documenta ambos totales en un comentario.
[ ] El plan del planeador suma 465 min y cierra 14:45. Incluso el juego perfecto
    con camión grande queda 3 min por detrás del plan.
[ ] Con camión chico y juego perfecto, la llegada a la parada 5 cae a las 12:15,
    quince minutos antes de su ventana de cierre. Cualquier error previo provoca
    rechazo. Verifícalo.
[ ] Un atraso provocado en la parada 2 se refleja en la hora real de llegada de
    las paradas 3 a 7.
[ ] La aguja tiene la misma velocidad angular a 60 y a 120 Hz.
[ ] Machacar la tecla no produce ninguna ventaja.
[ ] Espacio no hace scroll de la página.
[ ] Ningún reloj avanza con la pestaña en segundo plano.
[ ] El número de maniobras por parada no depende del desempeño.
[ ] Todos los números tuneables viven en CONFIG.
[ ] Funciona con tap en un viewport de 375px de ancho.

Entrega: el archivo index.html completo, seguido de una nota breve sobre qué
constantes de CONFIG tocar para recalibrar dificultad y costos.