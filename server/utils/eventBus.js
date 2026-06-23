import { EventEmitter } from 'events';

// Core EventBus instance for application-wide decoupling
export const eventBus = new EventEmitter();
