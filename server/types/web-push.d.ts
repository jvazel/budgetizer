declare module 'web-push' {
  export function generateVAPIDKeys(): {
    publicKey: string;
    privateKey: string;
  };
  export function setVapidDetails(
    source: string,
    publicKey: string,
    privateKey: string
  ): void;
  export function sendNotification(
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
    payload: string,
    options?: {
      TTL?: number;
      Urgent?: boolean;
      contentEncoding?: string;
      userPublicKey?: string;
      userAuth?: string;
    }
  ): Promise<unknown>;
}