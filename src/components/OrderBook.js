import { AsyncDataEvent } from "./DataEvent";
import { OrderAck, OrderStatus, Fill } from './Order';

class OrderBook {
    constructor(symbol, ms_send) {
        this.symbol = symbol;
        this.ms_send = ms_send
        this.loop = null; // JavaScript doesn't have a direct equivalent to asyncio.get_event_loop()
        this.send_book_event = new AsyncDataEvent();
        this.send_trade_event = new AsyncDataEvent();
        this.new_event = new AsyncDataEvent();
        this.modify_event = new AsyncDataEvent();
        this.cancel_event = new AsyncDataEvent();
        this.bids = {};
        this.asks = {};
        this.ordersById = {};
    }

    async start() {
        console.log("OB: Starting OrderBook");
        this.waitNewPromise = this.wait_new(this.new_event);
        this.waitModifyPromise = this.wait_modify(this.modify_event);
        this.waitCancelPromise = this.wait_cancel(this.cancel_event);
        this.waitSendBookPromise = this.wait_send_book(this.send_book_event);
        this.waitSendTradePromise = this.wait_send_trade(this.send_trade_event);
    }

    toJson(msgType, fill = null) {
        const bids = [].concat(...Object.keys(this.bids).sort((a, b) => b - a).map(lvl => this.bids[lvl]));
        const asks = [].concat(...Object.keys(this.asks).sort().map(lvl => this.asks[lvl]));

        let fix42 = { 35: 'W', 52: new Date().toISOString(), 55: this.symbol, 268: [] };
        if (msgType === 'W') {
            const bidPxs = [...new Set(bids.map(o => o.px))].sort((a, b) => b - a);
            const askPxs = [...new Set(asks.map(o => o.px))].sort();
            const bidQtys = bidPxs.map(px => bids.filter(o => o.px === px).reduce((sum, o) => sum + o.qty, 0));
            const askQtys = askPxs.map(px => asks.filter(o => o.px === px).reduce((sum, o) => sum + o.qty, 0));
            bidPxs.forEach((px, i) => {
                fix42[268].push({ 269: 0, 270: px, 271: bidQtys[i] });
            });
            askPxs.forEach((px, i) => {
                fix42[268].push({ 269: 1, 270: px, 271: askQtys[i] });
            });
        }

        return fix42;
    }

    async wait_new(e) {
        console.log("Awaiting new orders");
        while (true) {
            await e.waitRun(this.newOrder.bind(this));
            // e.clear();
        }
    }

    async newOrder(o) {
        console.log("OB: newOrder: ", o);
        o.status = OrderStatus.NEW;
        this.ordersById[o.id] = o;
        const [side, other_side] = o.side === 'Buy' ? [this.bids, this.asks] : [this.asks, this.bids];
        if (!side[o.px]) {
            side[o.px] = [];
        }
        side[o.px].push(o);
        if (o.ackEvent) {
            console.log(`${new Date().toISOString()}:: OB:Setting New Order AckEvent: ${o.ackEvent}`);
            try {
                o.ackEvent.set(new OrderAck(o, OrderStatus.NEW));
            } catch (ex) {
                console.error(ex);
                console.trace();
            } 
            // finally {
            //     o.ackEvent.clear();
            // }
        }
        this.match(o);
        this.send_book_event.set();
    }

    async wait_modify(e) {
        console.log("Awaiting modifies");
        while (true) {
            await e.waitRun(this.modifyOrder.bind(this));
            // e.clear();
        }
    }

    async modifyOrder(data) {
        try {
            // console.log("OB: modifyOrder: ", data);
            let [orderId, px, qty] = data;
            if (!this.ordersById[orderId]) return;
            const o = this.ordersById[orderId];
            if (qty === null) qty = o.qty;
            const [side, other_side] = o.side === 'Buy' ? [this.bids, this.asks] : [this.asks, this.bids];
            const backOfTheLine = px !== o.px || qty > o.qty;
            if (backOfTheLine && o.px in side) {
                side[o.px] = side[o.px].filter(order => order !== o);
                if (side[o.px].length === 0) {
                    delete side[o.px];
                }
            }
            o.px = px;
            o.qty = qty;
            o.status = OrderStatus.MODIFIED;
            if (backOfTheLine && o.id in this.ordersById) {
                if (!(o.px in side)) {
                    side[o.px] = [];
                }
                side[o.px].push(o);
            }
            if (o.ackEvent) {
                o.ackEvent.set(new OrderAck(o, OrderStatus.MODIFIED));
            }
            this.match(o);
            this.send_book_event.set();
        } catch (ex) {
            console.error(ex);
            console.trace();
        }
    }

    async wait_cancel(e) {
        console.log("Awaiting cancels");
        while (true) {
            await e.waitRun(this.cancelOrder.bind(this));
            // e.clear();
        }
    }

    async cancelOrder(orderId) {
        console.log(`Cancel order ${orderId}`);
        const o = this.ordersById[orderId];
        o.status = OrderStatus.CANCELLED;
        delete this.ordersById[o.id];
        const [side, other_side] = o.side === 'Buy' ? [this.bids, this.asks] : [this.asks, this.bids];
        side[o.px] = side[o.px].filter(order => order !== o);
        if (side[o.px].length === 0) {
            delete side[o.px];
        }
        if (o.ackEvent) {
            o.ackEvent.set(new OrderAck(o, OrderStatus.CANCELLED));
        }
        this.send_book_event.set();
    }

    fill(o, sz) {
        console.log('OB: Fill');
        const exec_time = new Date();
        const [side, other_side] = o.side === 'Buy' ? [this.bids, this.asks] : [this.asks, this.bids];
        o.qty -= sz;
        o.filled_qty += sz;
        let pre = 'PARTIAL';
        if (o.qty === 0) {
            o.status = OrderStatus.FULLY_FILLED;
            delete this.ordersById[o.id];
            pre = 'FULL';
            side[o.px] = side[o.px].filter(order => order !== o);
            if (side[o.px].length === 0) {
                delete side[o.px];
            }
            if (o.ackEvent) {
                console.log('OB: Full fill', o);
                o.ackEvent.set(new OrderAck(o, OrderStatus.FULLY_FILLED));
            }
        } else {
            o.status = OrderStatus.PARTIALLY_FILLED;
            if (o.ackEvent) {
                o.ackEvent.set(new OrderAck(o, OrderStatus.PARTIALLY_FILLED));
            }
        }
        this.send_trade_event.set(new Fill(exec_time, o.id, o.id, o.clientId, o.side, sz, o.px, o.qty === 0));
        console.log(`${pre} FILL: ${o.clientId} ${o.side}s ${sz} @ ${o.px} ${o.qty} Remaining`);
        this.send_book_event.set();
    }

    match(o) {
        const [side, other_side] = o.side === 'Buy' ? [this.bids, this.asks] : [this.asks, this.bids];
        const matching_orders = o.side === 'Buy' ?
            Object.keys(this.asks).filter(k => k <= o.px).flatMap(k => this.asks[k]) :
            Object.keys(this.bids).filter(k => k >= o.px).flatMap(k => this.bids[k]);
        let found_matches = matching_orders.length > 0;
        let i = 0;
        while (o.qty > 0 && i < matching_orders.length) {
            const mo = matching_orders[i];
            console.log(`${o} matched with ${mo}`);
            const sz = Math.min(o.qty, mo.qty);
            this.fill(o, sz);
            const full_fill_mo = mo.qty - sz === 0;
            this.fill(mo, sz);
            if (full_fill_mo) {
                i++;
            }
        }
    }

    async wait_send_book(e) {
        console.log('OB: Waiting to send book');
        while (true) {
            try {
                await e.waitRun(this.send_book.bind(this));
            } catch (ex) {
                console.error(ex);
                console.trace();
            }
            // e.clear();
        }
    }

    async send_book(data = null) {
        const msg = this.toJson('W');
        this.ms_send(msg);
    }

    async wait_send_trade(e) {
        console.log('Waiting to send trades');
        while (true) {
            await e.waitRun(this.send_trade.bind(this));
            // e.clear();
        }
    }

    async send_trade(fill = null) {
        // Implementation here is commented out in Python version
    }

    toString() {
        return `bids: ${JSON.stringify(this.bids)}\nasks: ${JSON.stringify(this.asks)}`;
    }
}

export default OrderBook;