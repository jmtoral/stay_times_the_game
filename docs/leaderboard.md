# Cómo montar el leaderboard

Guía completa para levantar el marcador global del juego. El backend es un
**Cloudflare Worker** con almacenamiento **KV**: plan gratuito, sin servidor que
administrar, sin tarjeta.

El código vive en [`server/`](../server/):

| Archivo | Qué es |
|---|---|
| `worker.js` | El backend completo (un solo archivo, sin dependencias) |
| `wrangler.toml` | Configuración para desplegar por CLI |

> **¿El juego funciona sin leaderboard?** Sí. Si no configuras nada, cada
> jugador ve su propio Top 10 guardado en el `localStorage` de su navegador.
> El leaderboard global sólo agrega el ranking compartido entre todos.

---

## Antes de empezar

Necesitas:

- Una cuenta gratuita en [dash.cloudflare.com](https://dash.cloudflare.com/).
- Para la ruta por CLI: Node.js instalado (`node -v`).

Decide también el **nombre del worker**. Se convierte en tu URL pública:

```
https://<nombre-del-worker>.<tu-subdominio>.workers.dev
```

En esta guía usamos `stay-times-leaderboard`.

---

## Ruta A — Desde el panel web (≈5 minutos, sin instalar nada)

### 1. Crear el worker

1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com/).
2. **Compute (Workers) → Workers & Pages → Create application → Create Worker**.
3. Nombre: `stay-times-leaderboard`. Clic en **Deploy**.

### 2. Pegar el código

1. Clic en **Edit code**.
2. Borra todo lo que trae el editor y pega el contenido íntegro de
   [`server/worker.js`](../server/worker.js).
3. Clic en **Save and Deploy**.

### 3. Crear el almacenamiento KV

Sin este paso el worker sí responde, pero guarda el ranking **en memoria**: se
borra en cada reinicio del worker (minutos u horas). Para un evento real, hazlo.

1. Menú lateral → **Storage & Databases → KV → Create Namespace**.
2. Nómbralo `LEADERBOARD_KV`.
3. Vuelve a tu worker → **Settings → Bindings → Add binding → KV namespace**.
4. Llena exactamente así:
   - **Variable name:** `LEADERBOARD_KV`
   - **KV namespace:** `LEADERBOARD_KV`
5. **Deploy** de nuevo.

> El nombre de la variable **debe** ser `LEADERBOARD_KV`: es el que busca
> `worker.js`. Si lo escribes distinto, el worker cae silenciosamente al modo
> memoria y parecerá que "se borran solos" los puntajes.

### 4. Definir la clave de administrador

El endpoint de reinicio trae una clave por defecto escrita en el código. Cámbiala:

1. Worker → **Settings → Variables and Secrets → Add**.
2. Tipo **Secret**, nombre `ADMIN_SECRET`, valor: la contraseña que tú elijas.
3. **Deploy**.

### 5. Conectar el juego

Copia la URL pública del worker y pégala en `index.html`, dentro de `CONFIG`:

```javascript
leaderboard: {
  maxEntries: 10,
  apiUrl: 'https://stay-times-leaderboard.tu-subdominio.workers.dev'
}
```

Sin barra final. Guarda, recarga el juego y listo.

---

## Ruta B — Desde la terminal (Wrangler)

```bash
cd server

# 1. Iniciar sesión (abre el navegador)
npx wrangler login

# 2. Crear el namespace KV
npx wrangler kv namespace create LEADERBOARD_KV
```

El comando imprime un `id`. Descomenta y complétalo en `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "LEADERBOARD_KV"
id = "el-id-que-te-devolvio-el-comando"
```

```bash
# 3. Guardar la clave de administrador (te la pide por stdin)
npx wrangler secret put ADMIN_SECRET

# 4. Desplegar
npx wrangler deploy
```

Wrangler imprime la URL final. Pégala en `CONFIG.leaderboard.apiUrl` igual que
en la Ruta A.

---

## La API

Todos los endpoints responden con CORS abierto (`Access-Control-Allow-Origin: *`),
que es lo que permite consumirlos desde GitHub Pages.

### `GET /api/leaderboard`

Devuelve el Top 10 como arreglo JSON. `GET /` hace lo mismo.

```bash
curl https://stay-times-leaderboard.tu-subdominio.workers.dev/api/leaderboard
```

### `POST /api/score`

Registra una partida y devuelve el Top 10 ya actualizado.

```bash
curl -X POST https://stay-times-leaderboard.tu-subdominio.workers.dev/api/score \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Prueba","puntos":50000,"npsPromedio":80,"costoTotal":1400,
       "estrellas":5,"paradasEntregadas":5,"paradasTotal":5,
       "ruta":"canonica","fecha":"2026-09-06"}'
```

Campos del payload:

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `nombre` | string | **sí** | Se recorta a 25 caracteres |
| `npsPromedio` | number | **sí** | Se limita al rango −100 … +100 |
| `puntos` | number | no | Criterio principal de orden |
| `costoTotal` | number | no | Desempate final (menor gana) |
| `estrellas` | number | no | Se limita a 1 … 5 |
| `paradasEntregadas` | number | no | |
| `paradasTotal` | number | no | Default 5 |
| `ruta` | string | no | Default `canonica` |
| `fecha` | string | no | Default: hoy |

Si falta `nombre` o `npsPromedio`, responde `400`.

**Orden del ranking:** `puntos` desc → `npsPromedio` desc → `costoTotal` asc.
El worker guarda el Top 50 en KV y devuelve el Top 10.

### `POST /api/reset` (o `DELETE /api/leaderboard`)

Vacía el ranking. Requiere la clave de administrador:

```bash
curl -X POST https://stay-times-leaderboard.tu-subdominio.workers.dev/api/reset \
  -H "X-Admin-Secret: tu-clave"
```

También acepta `?admin_key=tu-clave` en la URL.

Desde la consola del navegador, con el juego abierto:

```javascript
adminResetLeaderboard('tu-clave')
```

Eso borra el `localStorage` local **y** llama al endpoint remoto.

---

## Verificar que quedó bien

1. Abre el juego servido por HTTP (`node serve.js`) y juega una ruta completa.
2. En la pantalla de resultados, tu partida debe aparecer en el leaderboard
   resaltada en amarillo.
3. Abre el juego en **otro navegador o dispositivo**. Si tu partida aparece ahí
   también, el worker y el KV están funcionando.
4. Comprobación directa: `curl .../api/leaderboard` debe listar tu partida.

---

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| El leaderboard sale vacío y nunca se llena | `apiUrl` mal escrita o con barra final | Revisa `CONFIG.leaderboard.apiUrl`; el juego normaliza la barra, pero el host debe ser exacto |
| Los puntajes se borran solos cada rato | El binding KV no existe o se llama distinto | El binding **tiene** que llamarse `LEADERBOARD_KV` |
| Sólo veo mis propias partidas | El fetch al worker falla y cae al `localStorage` | Abre la consola del navegador y revisa el error de red o CORS |
| `403` al reiniciar | Clave equivocada | Debe coincidir con el secret `ADMIN_SECRET` |
| `400 Payload inválido` | Falta `nombre` o `npsPromedio` | Son los dos campos obligatorios |

El juego está diseñado para **degradarse en silencio**: si el worker no
responde, nadie ve un error, simplemente se usa el ranking local. Eso es bueno
para una demo, pero significa que un backend mal configurado no avisa —
verifícalo con `curl`.
