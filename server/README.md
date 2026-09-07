# Backend del leaderboard (Cloudflare Worker)

Permite que todos los jugadores compartan el mismo Top 10 global, con costo $0
y sin servidor que administrar.

| Archivo | Qué es |
|---|---|
| `worker.js` | El backend completo, un solo archivo sin dependencias |
| `wrangler.toml` | Configuración para desplegar por CLI |

## 📖 Instrucciones de despliegue

**La guía completa está en [`../docs/leaderboard.md`](../docs/leaderboard.md).**

Cubre las dos rutas de despliegue (panel web de Cloudflare y Wrangler por
terminal), la referencia de la API endpoint por endpoint, cómo verificar que
quedó bien y los problemas comunes.

## Resumen rápido

```bash
npx wrangler login
npx wrangler kv namespace create LEADERBOARD_KV   # copia el id a wrangler.toml
npx wrangler secret put ADMIN_SECRET
npx wrangler deploy
```

Después pega la URL resultante en `CONFIG.leaderboard.apiUrl`, dentro de
`index.html`.

> El binding KV **tiene** que llamarse `LEADERBOARD_KV`. Si se llama distinto,
> el worker cae en silencio a almacenamiento en memoria y los puntajes se
> pierden en cada reinicio.
