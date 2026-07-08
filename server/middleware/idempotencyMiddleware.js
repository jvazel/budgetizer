/**
 * Middleware pour les requêtes idempotentes (POST / PUT / DELETE).
 *
 * Le client envoie un en-tête `Idempotency-Key` généré à partir du hash
 * de la méthode, l'URL et le payload. Ce middleware :
 *  1. Vérifie si une réponse existe déjà pour cette clé → renvoyée immédiatement (200).
 *  2. Insère une entrée `pending: true` en base avec un index unique sur `idempotencyKey`.
 *     Si un autre thread insère avant lui, l'insertion échoue et la réponse est renvoyée.
 *  3. Si l'insertion réussit → le handler original s'exécute.
 *  4. Après exécution, le résultat est stocké sous `idempotencyKey` avec `pending: false`.
 */

import IdempotentRequest from '../models/IdempotentRequest.js';

const idempotencyMiddleware = async (req, res, next) => {
  // N'appliquer l'idempotence que sur POST / PUT / DELETE
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return next();

  const key = req.headers['idempotency-key'];

  if (!key) return next(); // Sans clé → comportement normal

  try {
    // Phase 1 — Si une réponse existe déjà, renvoyer le cached result
    const existing = await IdempotentRequest.findOne({ idempotencyKey: key });

    if (existing && !existing.pending) {
      try {
        const parsedResult = JSON.parse(existing.result);
        return res.status(existing.statusCode).json(parsedResult);
      } catch {
        // Si le JSON est corrompu, on laisse passer la requête
        return next();
      }
    }

    // Phase 2 — Marquer comme en cours avec un index unique
    try {
      await IdempotentRequest.create({
        idempotencyKey: key,
        userId: req.user.id,
        method: req.method,
        path: req.originalUrl || req.url,
        requestBody: req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null,
        pending: true,
      });
    } catch (err) {
      // Unique key violation → un autre thread a traité la requête avant nous
      if (err.code === 11000 || err.name === 'MongoServerError') {
        const stillPending = await IdempotentRequest.findOne({ idempotencyKey: key });
        if (stillPending && !stillPending.pending) {
          try {
            const parsedResult = JSON.parse(stillPending.result);
            return res.status(stillPending.statusCode).json(parsedResult);
          } catch {
            return next();
          }
        }
      }
      // Erreur inattendue → continuer quand même (ne pas bloquer l'utilisateur)
    }

    // Capturer la réponse originale pour stocker le résultat
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    let capturedStatusCode = 200;
    let capturedResponseData = null;

    res.status = (...args) => {
      capturedStatusCode = args[0];
      return originalStatus(...args);
    };

    res.json = (body) => {
      capturedResponseData = body;
      return originalJson(body);
    };

    // Wrapper pour stocker le résultat après l'envoi de la réponse
    const originalEnd = res.end.bind(res);
    res.end = (...args) => {
      if (capturedResponseData !== null && key) {
        IdempotentRequest.updateOne(
          { idempotencyKey: key },
          {
            pending: false,
            statusCode: capturedStatusCode,
            result: JSON.stringify(capturedResponseData),
            responseSentAt: new Date(),
          }
        ).catch(() => { /* silently ignore — non-critical */ });
      }
      return originalEnd(...args);
    };

    next();
  } catch (error) {
    console.error('[IdempotencyMiddleware] Error:', error.message);
    // En cas d'erreur de base de données, ne pas bloquer la requête
    next();
  }
};

export default idempotencyMiddleware;
