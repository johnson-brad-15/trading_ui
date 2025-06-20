let nextId = 1;

function getNextId() {
    const i = nextId;
    nextId += 1;
    return i;
}

export const OrderStatus = {
    NEW: Symbol('NEW'),
    MODIFIED: Symbol('MODIFIED'),
    CANCELLED: Symbol('CANCELLED'),
    REJECTED: Symbol('REJECTED'),
    PARTIALLY_FILLED: Symbol('PARTIALLY_FILLED'),
    FULLY_FILLED: Symbol('FULLY_FILLED'),
    PENDING: Symbol('PENDING')
};

export class Order {
    constructor(side, px, qty, clientId, ackEvent = null, manual = false) {
        this.side = side;
        this.px = px;
        this.qty = qty;
        this.clientId = clientId;
        this.id = (getNextId()) * (manual ? -1 : 1);
        this.ackEvent = ackEvent;
        this.filled_qty = 0;
        this.status = OrderStatus.PENDING;
    }

    toString() {
        return `<${this.id}: ${this.clientId} ${this.side} ${this.qty} @ ${this.px}>`;
    }

    valueOf() {
        return this.toString();
    }
}

export class OrderAck {
    constructor(order, status) {
        this.order = order;
        this.status = status;
    }
}

export class Fill {
    constructor(date, orderId, clientOrderId, clientId, side, qty, px, isFull) {
        this.date = date;
        this.orderId = orderId;
        this.clientOrderId = clientOrderId;
        this.clientId = clientId;
        this.side = side;
        this.qty = qty;
        this.px = px;
        this.isFull = isFull;
    }
}

// Mutex implementation
class Mutex {
    constructor() {
        this.locked = false;
        this.queue = [];
    }

    async lock() {
        if (this.locked) {
            await new Promise(resolve => this.queue.push(resolve));
        }
        this.locked = true;
    }

    unlock() {
        this.locked = false;
        if (this.queue.length > 0) {
            const nextResolve = this.queue.shift();
            nextResolve();
        }
    }
}

