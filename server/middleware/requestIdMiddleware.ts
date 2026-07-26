import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { requestStore } from '../utils/logger';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('X-Request-ID', requestId);
  requestStore.run({ requestId }, () => {
    next();
  });
};

export default requestIdMiddleware;
