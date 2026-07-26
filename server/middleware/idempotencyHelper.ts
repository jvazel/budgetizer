/**
 * Enveloppe idempotente pour les handlers de route.
 *
 * Lorsqu'un handler est enveloppé avec `withIdempotency`, le middleware
 * d'idempotence intercepte la requête AVANT que le handler ne soit appelé.
 * Si la clé d'idempotence a déjà été traitée, le cached result est renvoyé
 * sans jamais invoquer le handler sous-jacent.
 *
 * Usage :
 *   export const createTransaction = withIdempotency(async (req, res) => { ... });
 */

import idempotencyMiddleware from '../middleware/idempotencyMiddleware';
import { AppRequest, AppResponse } from '../types';

const withIdempotency = (handler: (req: AppRequest, res: AppResponse, next?: (err?: unknown) => void) => Promise<void>) => async (req: AppRequest, res: AppResponse, next: (err?: unknown) => void) => {
  // Exécuter le middleware d'idempotence inline
  await idempotencyMiddleware(req, res, () => {
    return handler(req, res, next);
  });
};

export default withIdempotency;
