/// <reference types="vite/client" />

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    immediate?: boolean;
    onRegistered?: (registration: ServiceWorkerRegistration | null) => void;
    onRegisterError?: (error: Error) => void;
  }): void;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
