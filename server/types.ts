import type { Request, Response } from 'express';

export interface IUserDocument {
  id: string;
  name: string;
  email: string;
  currency: { code: string; symbol: string };
  preferences: {
    theme: string;
    dateFormat: string;
    language: string;
    firstDayOfWeek: number;
    anomalyThreshold: number;
    lowBalanceThreshold: number;
    enableBudgetAlerts: boolean;
    enableScheduledAlerts: boolean;
    enableSavingsAlerts: boolean;
    enableLowBalanceAlerts: boolean;
    enableAiInsightsAlerts: boolean;
   };
}

export type AppRequest = Request & {
  user?: IUserDocument;
  file?: { buffer: Buffer };
};

export type AppResponse = Response;