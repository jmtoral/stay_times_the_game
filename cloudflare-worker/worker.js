/**
 * Stay Time — Cloudflare Worker para Leaderboard Global Compartido
 * 
 * Proporciona dos endpoints:
 * - GET  /api/leaderboard -> Devuelve el Top 10 de jugadores ordenados por NPS descendente y costo ascendente.
 * - POST /api/score       -> Registra un nuevo puntaje, actualiza el ranking en Cloudflare KV y devuelve el Top 10 actualizado.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json;charset=UTF-8'
};

// Fallback en memoria por si no se vincula KV de inmediato
let inMemoryLeaderboard = [];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Manejo de Preflight CORS (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Ruta: GET /api/leaderboard
    if (request.method === 'GET' && (url.pathname === '/api/leaderboard' || url.pathname === '/')) {
      const top = await getLeaderboard(env);
      return new Response(JSON.stringify(top), { status: 200, headers: CORS_HEADERS });
    }

    // Ruta: POST /api/score
    if (request.method === 'POST' && url.pathname === '/api/score') {
      try {
        const body = await request.json();

        // Validación básica de campos
        if (!body || typeof body.nombre !== 'string' || typeof body.npsPromedio !== 'number') {
          return new Response(JSON.stringify({ error: 'Payload inválido' }), {
            status: 400,
            headers: CORS_HEADERS
          });
        }

        const nuevaEntrada = {
          nombre: String(body.nombre).slice(0, 25).trim() || 'Anónimo',
          npsPromedio: Math.min(100, Math.max(0, Number(body.npsPromedio))),
          costoTotal: Math.max(0, Math.round(Number(body.costoTotal) || 0)),
          estrellas: Math.min(5, Math.max(1, Math.round(Number(body.estrellas) || 1))),
          paradasEntregadas: Math.max(0, Math.round(Number(body.paradasEntregadas) || 0)),
          paradasTotal: Math.max(1, Math.round(Number(body.paradasTotal) || 5)),
          ruta: String(body.ruta || 'canonica').slice(0, 20),
          fecha: String(body.fecha || new Date().toISOString().slice(0, 10))
        };

        const rankingActual = await getLeaderboard(env, 50);
        rankingActual.push(nuevaEntrada);

        // Ordenar por NPS descendente, luego menor costo
        rankingActual.sort((a, b) => b.npsPromedio - a.npsPromedio || a.costoTotal - b.costoTotal);

        // Guardar Top 50 en KV
        const top50 = rankingActual.slice(0, 50);
        await saveLeaderboard(env, top50);

        // Devolver Top 10
        const top10 = top50.slice(0, 10);
        return new Response(JSON.stringify(top10), { status: 200, headers: CORS_HEADERS });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Error procesando solicitud', details: err.message }), {
          status: 500,
          headers: CORS_HEADERS
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
      status: 404,
      headers: CORS_HEADERS
    });
  }
};

async function getLeaderboard(env, limit = 10) {
  if (env && env.LEADERBOARD_KV) {
    try {
      const data = await env.LEADERBOARD_KV.get('global_leaderboard', 'json');
      if (Array.isArray(data)) return data.slice(0, limit);
    } catch (e) {
      console.error('Error leyendo de KV:', e);
    }
  }
  return inMemoryLeaderboard.slice(0, limit);
}

async function saveLeaderboard(env, data) {
  if (env && env.LEADERBOARD_KV) {
    try {
      await env.LEADERBOARD_KV.put('global_leaderboard', JSON.stringify(data));
      return;
    } catch (e) {
      console.error('Error escribiendo en KV:', e);
    }
  }
  inMemoryLeaderboard = data;
}
