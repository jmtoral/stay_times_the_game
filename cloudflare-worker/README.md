# Despliegue del Leaderboard Compartido (Cloudflare Workers)

Este backend permite que todos los jugadores en **GitHub Pages** compartan el mismo Leaderboard Top 10 global en tiempo real, con costo $0 y sin necesidad de administrar servidores.

---

## Opción Rápida: Despliegue desde la Web de Cloudflare (Sin instalar nada, 2 minutos)

1. **Crea una cuenta gratuita** en [cloudflare.com](https://dash.cloudflare.com/) si aún no tienes una.
2. En el menú lateral, ve a **Compute (Workers) > Workers & Pages > Create application > Create Worker**.
3. Ponle de nombre `stay-times-leaderboard` y haz clic en **Deploy**.
4. Haz clic en **Edit code** y reemplaza todo el contenido del editor con el código de [`worker.js`](file:///d:/PROYECTOS_PERSONALES/juego_stay_times/cloudflare-worker/worker.js).
5. Haz clic en **Save and Deploy**.
6. **(Opcional pero recomendado para persistencia permanente)**:
   - En el menú lateral ve a **Storage & Databases > KV**.
   - Haz clic en **Create Namespace**, nómbralo `LEADERBOARD_KV`.
   - Vuelve a tu Worker > pestaña **Settings > Variables > KV Namespace Bindings**.
   - Haz clic en **Add binding**: Variable name = `LEADERBOARD_KV`, KV namespace = `LEADERBOARD_KV`.
   - Haz clic en **Save and Deploy**.
7. **Copia la URL pública de tu Worker** (ejemplo: `https://stay-times-leaderboard.tu-usuario.workers.dev`).
8. En `index.html`, pega esa URL en `CONFIG.leaderboard.apiUrl`:
   ```javascript
   leaderboard: {
     maxEntries: 10,
     apiUrl: 'https://stay-times-leaderboard.tu-usuario.workers.dev'
   }
   ```
9. ¡Listo! Haz `git push` a tu repositorio y tu juego en GitHub Pages estará conectado al Leaderboard global.

---

## Opción CLI: Usando Wrangler

```bash
cd cloudflare-worker

# Iniciar sesión en Cloudflare
npx wrangler login

# Crear el namespace KV
npx wrangler kv:namespace create LEADERBOARD_KV

# Copia el ID que te devuelve la terminal y descoméntalo en wrangler.toml

# Desplegar
npx wrangler deploy
```
