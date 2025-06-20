import { useEffect, useState, useRef } from 'react';
import MarketMaker from './MarketMaker';
import OrderBook from './OrderBook';
import { AsyncDataEvent } from './DataEvent';
import { OrderStatus } from './Order';
// const dt = require('date-fns');
// const fs = require('fs');
// const { promisify } = require('util');


export const MSEvent = (msg) => {
    return (
        {
            data: msg
        }
    );
}

class MarketSimulator {
    constructor(
        onopen_cb,
        onerror_cb,
        onclose_cb,
        onmessage_cb, 
        handleDataMessage
    ) {
        if (MarketSimulator.instance) {
            return MarketSimulator.instance;
        }

        this.symbol = null;
        this.tick_sz = null;
        this.opening_px = null;
        this.currency = null;
        this.next_client_id = 0;

        this.onopen_cb = onopen_cb;
        this.onerror_cb = onerror_cb;
        this.onclose_cb = onclose_cb;
        this.onmessage_cb = onmessage_cb;
        this.handleDataMessage = handleDataMessage;

        this.mms = {};

        this.ackEvent = new AsyncDataEvent();
        
        // Bind methods to preserve 'this' context when passed as callbacks
        this.handleAck = this.handleAck.bind(this);
        this.send = this.send.bind(this);
        
        this.wait_ack(this.ackEvent);

        this.readyState = WebSocket.OPEN;

        MarketSimulator.instance = this;
    }

    async wait_ack(e) { await this.wait_ack_async(e); }

    getNextClientId = () => {
        let i = this.next_client_id
        this.next_client_id += 1
        return i
    }

    async wait_ack_async(e) {
        while (true) {
            // console.log("MS:Awaiting acks");
            await e.waitRun(this.handleAck.bind(this));
            // e.clear();
        }
    }

    // async waitAck(e) {
    //     while (true) {
    //         // console.log("MS:Awaiting acks");
    //         await new Promise(resolve => e.once('run', async () => {
    //             await this.handleAck(); 
    //             resolve();
    //         }));
    //         e.emit('clear');
    //     }
    // }

    async handleAck(ack) {
        // console.log(`MS:handleAck ack: `, ack.order.id, ack.status, ack); //${ack.status} ${ack.order.id} ${ack.order.clientId}`);
        try {
            if (ack.order.id < 0) { // Manual MM
                let ack_;
                if (ack.status === OrderStatus.NEW) {
                    // console.log("MS: New ack");
                    ack_ = {
                        35: 8,
                        56: ack.order.clientId,
                        39: 0,
                        11: ack.order.id,
                        54: (ack.order.side === "Buy" ? 1 : 2),
                        38: ack.order.qty,
                        44: ack.order.px,
                        52: new Date().toISOString()
                    };
                } else if (ack.status === OrderStatus.CANCELLED) {
                    // console.log("MS: Cancel ack");
                    ack_ = {
                        35: 8,
                        56: ack.order.clientId,
                        39: 4,
                        11: ack.order.id,
                        54: (ack.order.side === "Buy" ? 1 : 2),
                        38: ack.order.qty,
                        44: ack.order.px,
                        52: new Date().toISOString()
                    };
                } else if (ack.status === OrderStatus.MODIFIED) {
                    // console.log("MS: Modify ack");
                    ack_ = {
                        35: 8,
                        56: ack.order.clientId,
                        39: 5,
                        11: ack.order.id,
                        54: (ack.order.side === "Buy" ? 1 : 2),
                        38: ack.order.qty,
                        44: ack.order.px,
                        52: new Date().toISOString()
                    };
                } else if ([OrderStatus.FULLY_FILLED, OrderStatus.PARTIALLY_FILLED].includes(ack.status)) {
                    // console.log('MS: Fill Ack: ', ack.status);
                    ack_ = {
                        35: 8,
                        56: ack.order.clientId,
                        39: (ack.status === OrderStatus.FULLY_FILLED ? 2 : 1),
                        11: ack.order.id,
                        54: (ack.order.side === "Buy" ? 1 : 2),
                        38: ack.order.filled_qty,
                        44: ack.order.px,
                        52: new Date().toISOString()
                    };
                }
                // console.log("MS:handleAck: sending: ", ack_);
                await this.send(ack_);
            }
        } catch (ex) {
            console.error(ex);
        }
    }

    async send(msg) {
        // console.log("MS: Received msg: ", msg);
        let reply = '';
        switch (msg[35]) {
            case('d'): //Sec def (ready)
                reply = msg;
                this.symbol = msg[55];
                this.tick_sz = msg[969];
                this.opening_px = msg[44];
                this.currency = msg[15];
                this.ob = new OrderBook(this.symbol, this.send);
                this.ob.start();
                let clientId = this.getNextClientId();
                this.mms[clientId] = new MarketMaker(this.ob, this.symbol, clientId, null, this.opening_px, 10, 4 );
                this.mms[clientId].start();
                console.log("About to send to WSM: ", reply);
                this.onmessage_cb(MSEvent(JSON.stringify(reply)));
                break;
            case('A'): //Logon
                console.log("MS: logon: ", msg);
                // reply = {35:"A",55:this.symbol,56:this.clientId,44:this.opening_px};

                if (msg['49'] === -1) {
                    try {
                        console.log("New Client");
                        let clientId = this.getNextClientId();
                        this.mms[clientId] = new MarketMaker(this.ob, this.symbol, clientId, this.ackEvent, this.opening_px, 10, 4 );
                        console.log('Created MM');
                        reply = { 35: "A", 55: this.symbol, 56: clientId, 44: this.mms[clientId].px };
                        // console.log(`Replying with ${JSON.stringify(reply)}`);
                        this.mms[clientId].start();
                    } catch (ex) {
                        console.log(ex);
                        console.trace();
                    }
                    // console.log("About to send to WSM: ", reply);
                    this.onmessage_cb(MSEvent(JSON.stringify(reply)));
                }
                break;
            case 'D':
                try {
                    console.log("MS New msg: ", msg);
                    this.mms[msg['49']].place_new_order(msg['38'] > 0 ? 'Buy' : 'Sell', msg['44'], Math.abs(msg['38']));
                } catch (ex) {
                    console.log(ex);
                    console.trace();
                }
                break;
            case 'F':
                try {
                    // console.log("MS Cancel msg: ", msg);
                    this.mms[msg['49']].cancel_order(msg['11']);
                } catch (ex) {
                    console.log(ex);
                    console.trace();
                }
                break;
            case 'G':
                try {
                    // console.log("MS Modify msg: ", msg);
                    this.mms[msg['49']].modify_order(msg['11'], msg['44']);
                } catch (ex) {
                    console.log(ex);
                    console.trace();
                }
                break;
            default:
                // console.log("MS: Passing data message through to DataManager: ", msg);
                this.handleDataMessage(msg);
        }
    }
}

export default MarketSimulator;