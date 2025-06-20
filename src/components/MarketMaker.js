import { AsyncDataEvent } from './DataEvent';
import { Order, OrderStatus } from './Order';

class MarketMaker {
    constructor(ob, symbol, client_id, ms_ack_event = null, px = null, default_qty = null, width = 4) {
        this.symbol = symbol;
        this.client_id = client_id;
        this.default_qty = default_qty;
        this.px = px;
        this.qty = default_qty;
        this.width = width;
        this.tick_sz = 0.01;
        this.ob_new_event = ob.new_event;
        this.ob_modify_event = ob.modify_event;
        this.ob_cancel_event = ob.cancel_event;
        this.ms_ack_event = ms_ack_event;
        this.ack_event = new AsyncDataEvent();
        this.is_auto = !ms_ack_event;
        this.bid = null;
        this.ask = null;
        this.run = true;
    }

    async start() {
        console.log("MM: Starting mm ", this.client_id, this.is_auto);
        this.wait_ack_promise = this.wait_ack(this.ack_event);
        if (this.is_auto) {
            this.manage_orders_promise = await this.manage_orders_loop();
        }
    }

    place_new_order(side, px, qty) {
        console.log("MM:", this.client_id, " place_new_order: ", side, px, qty);
        let order = new Order(side, px, qty, this.client_id, this.ack_event, !this.is_auto);
        if (side == 'Buy')
            this.bid = order;
        else
            this.ask = order;
        this.ob_new_event.set(order);
    }

    async modify_order(order_id, new_px, new_qty = null) {
        this.ob_modify_event.set([order_id, new_px, new_qty]);
    }

    async cancel_order(order_id) {
        this.ob_cancel_event.set(order_id);
    }

    async wait_ack(e) {
        console.log(`MM Awaiting ack event set: ${e}`);
        while (this.run) {
            await e.waitRun(this.handle_ack.bind(this));
            // e.clear();
        }
    }

    async handle_ack(ack) {
        try {
            if ([OrderStatus.NEW, OrderStatus.MODIFIED].includes(ack.status)) {
                console.log("MM:", this.client_id, " New/Modify ack recieved: ", ack);
                if (ack.order.side === 'Buy') {
                    this.bid = ack.order;
                } else {
                    this.ask = ack.order;
                }
            } else if ([OrderStatus.CANCELLED, OrderStatus.FULLY_FILLED].includes(ack.status)) {
                if (ack.order.side === 'Buy') {
                    this.bid = null;
                } else {
                    this.ask = null;
                }
            }
            if (this.ms_ack_event) {
                console.log("MM: handleAck: setting MS ack event", ack.status, ack);
                this.ms_ack_event.set(ack);
            }
        } catch (ex) {
            console.error(ex);
            console.trace();
        }
    }

    async manage_orders_loop() {
        console.log("MM: Managing orders");
        while (this.run) {
            await this.manage_orders();
        }
    }

    async manage_orders() {
        try {
            console.log("MM:", this.client_id, " Managing orders: ", this.bid, this.ask);
            const bidPx = this.px - (Math.floor(Math.random() * 4) * this.tick_sz);
            const askPx = bidPx + (this.width * this.tick_sz);
            this.px = (bidPx + askPx) / 2;
            if (!this.bid) 
                this.place_new_order('Buy', bidPx, this.qty);
            else if (this.bid.status != OrderStatus.PENDING)
                this.modify_order(this.bid.id, bidPx, this.bid.qty);
            if (!this.ask) 
                this.place_new_order('Sell', askPx, this.qty);
            else if (this.bid.status != OrderStatus.PENDING)
                this.modify_order(this.ask.id, askPx, this.ask.qty);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (ex) {
            console.error(ex);
            console.trace();
        }
    }
}

export default MarketMaker;