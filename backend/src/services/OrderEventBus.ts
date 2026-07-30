import { EventEmitter } from 'events';

class OrderEventBus extends EventEmitter {}

export const orderEventBus = new OrderEventBus();
orderEventBus.setMaxListeners(100);
