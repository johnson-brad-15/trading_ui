import { useEffect, useState, useRef, useContext, useReducer  } from 'react';
import WebSocketManager from './WebSocketManager';
import { roundTo, getMid } from '../utils/utils'
import { useInstrument } from './InstrumentContext';
import { InstrumentContext } from './InstrumentContext';

class Level {
    constructor({proto=null, args=null}) {
        if (proto === null) {
          proto = {
            px:args.px, 
            bid:args.bid, 
            ask:args.ask, 
            myBids:args.myBids ? args.myBids : {}, 
            myAsks:args.myAsks ? args.myAsks : {},
            last: args.last ? args.last : false, 
            traded:args.traded ? args.traded : false, 
            volume:args.volume ? args.volume : 0, 
            volPct:args.volPct ? args.volPct : 0
          }
        }
        this.myBids = args?.myBids !== undefined ? args.myBids : proto.myBids;
        this.bid = args?.bid !== undefined ? args.bid : proto.bid;
        this.px = proto.px;
        this.ask = args?.ask !== undefined ? args.ask : proto.ask;
        this.myAsks = args?.myAsks !== undefined ? args.myAsks : proto.myAsks;
        this.last = proto.last;
        this.traded = proto.traded;
        this.volume = proto.volume;
        this.volPct = proto.volPct;
        this.myBidQty = Object.values(this.myBids).reduce((acc, obj) => acc + obj.qty, 0);
        this.myAskQty = Object.values(this.myAsks).reduce((acc, obj) => acc + obj.qty, 0);
      }
  }
  
class Order {
    constructor(clientId, id, date, status, px, qty) {
        this.date = date;
        this.id = id;
        this.clientId = clientId;
        this.px = px;
        this.qty = qty;
        this.status = status;
    }
}

class StateUpdater{
    constructor(instrumentRef, eventCallbacks) {
        this.instrumentRef = instrumentRef;
        this.updateState = this.updateState.bind(this);
        this.eventCallbacks = eventCallbacks;
    }

    updateState(state, msg)  {
        let newState = null;
        switch (msg[35]) {
            case('d'): //Sec def
                newState = this.processSecDef(state, msg);
                break;
            case('A'): //Logon
                newState = this.processLogon(state, msg);
                break;
            case('W'): //MD snapshot
                newState = this.processMdSnapshot(state, msg);
                break;
            case(8):
                newState = this.processExecRpt(state, msg);
                break;
            default:
                console.log("Unknown message type", msg[35]);
                return {...state};
        }
        return newState;
    }

    processSecDef(state, msg) {
        console.log("Processing sec def: ", msg);
        const newState = {
            ...state,
            symbol: msg[55],
            openingPx: msg[44],
            mid: msg[44],
        };
        this.ensureLevels(newState, msg[44]);
        return newState;
    }

    processLogon(state, msg) {
        console.log("Processing logon: ", msg);
        const newState = { 
            ...state,
            clientId: msg[56],
            symbol: msg[55],
            openingPx: msg[44]
        };
        return newState;
    }

    processMdSnapshot(state, msg) {
        const newState = {
            ...state
        }

        let bidPx = [];
        let askPx = [];
        let bidQty = [];
        let askQty = [];
        for (let i = 0; i < msg[268].length; i++)
        {
            if (msg[268][i][269] === 0) {
            bidPx.push(msg[268][i][270]);
            bidQty.push(msg[268][i][271]);
            }
            else if (msg[268][i][269] === 1) {
            askPx.push(msg[268][i][270]);
            askQty.push(msg[268][i][271]);        
            }
        }

        // Clear out prior md snapshot levels
        if (newState && newState.levels) {
            for (const [px, level] of Object.entries(newState.levels)) {
                if (((level.bid != null) && !(level.bid in bidPx)) || ((level.ask != null) && !(level.ask in askPx))) {
                    this.updateLevel(newState, parseFloat(px), null, null);
                }
            }
        }

        // Update Bids
        for (let i = 0; i < bidPx.length; i++)
            this.updateLevel(newState, bidPx[i], bidQty[i], null);

        // Update Asks
        for (let i = 0; i < askPx.length; i++)
            this.updateLevel(newState, askPx[i], null, askQty[i]);

        const maxBid = bidPx?.length > 0 ? Math.max(...bidPx) : (Math.min(...askPx));
        const minAsk = askPx?.length > 0 ? Math.min(...askPx) : (Math.max(...bidPx));
        const midPx = roundTo((maxBid + minAsk) / 2, 2);
        this.ensureLevels(newState, midPx);

        const mid = getMid(bidPx, askPx, this.instrumentRef.current.decimals);
        // const mid = roundTo((Math.max(...bidPx) + Math.min(...askPx)) / 2.0, this.instrumentRef.current.decimals);
        newState.mid = mid;

        this.updateSparkData(newState, mid);
        // updateChartData(mid);
        return newState;
    }

    processExecRpt(state, msg) {
        // console.log("DM:SU:processExecRpt ", msg);
        const newState = { ...state };
        const date = new Date(msg[52]);
        switch (msg[39]) {
            case(0): //New
                // console.log("DM: New: ", msg);
                this.updateMyOrders(newState, msg);
            break;
            case(1):
            case(2): 
                // console.log("DM: Fill: ", msg);
                this.updateLastTradePx(newState, msg[44], msg[38], date);
                if (msg[56] === this.instrumentRef.current.clientId) {
                    console.log("DM: UpdateState: FIll: ", msg);
                    this.processFill(newState, msg);
                }
                break;
            case(4): //Cancel
                // console.log("DM: FilCancell: ", msg);
                this.processCancel(newState, msg);
                break;
            case(5): //Modify
                // console.log("DM: Modify: ", msg);
                this.processModify(newState, msg);
                break;
            default:
                console.log("Unknown execution report status", msg[39]);
        }
        return newState;
    }

    updateLastTradePx(newState, px, sz, dt) {
        if (newState.lastTradePrice != null && newState.lastTradePrice != undefined && newState.lastTradePrice in newState.levels)
            newState.levels[newState.lastTradePrice].last = false;
        newState.levels[px].last = true;
        newState.levels[px].traded = true;
        console.log(`DM: Setting traded to true for ${px}`, newState.levels[px].traded);
        newState.lastTradePrice = px;
        newState.tradedPxs[px] = dt;
        newState.volume += sz;
        newState.levels[px].volume += sz
        Object.keys(newState.tradedPxs).map((p) => {
            newState.levels[p].volPct = newState.levels[p].volume / newState.volume * 100.0;
        });
        console.log("Px: ", px, "Sz: ", sz, "vol:",newState.levels[px].volume, "Total vol: ", newState.volume, "volPct: ", newState.levels[px].volPct);
    };

    updateLevel(newState, p, qtyBid, qtyAsk) {
        p = roundTo(p, this.instrumentRef.current.decimals);
        // Preserve traded state if the level already exists
        if (newState) {
            if (newState.levels) {
                if (p in newState.levels) {
                    newState.levels[p] = new Level({
                        proto: newState.levels[p],
                        args: { bid: qtyBid, ask: qtyAsk }
                    });
                }
                else {
                    newState.levels[p] = new Level({args:{px:p, bid:qtyBid, ask:qtyAsk}});
                }
            }
            
            // Update min/max prices
            if (p < newState.minPx) newState.minPx = p;
            if (p > newState.maxPx) newState.maxPx = p;

            newState.lastDate = new Date(); 
        }
    };

    ensureLevels(newState, px) {
        // Create price levels based on min bid
        for (let p = px; p >= px - (this.instrumentRef.current.tickSz * newState.minDepth); p -= this.instrumentRef.current.tickSz) {
            p = roundTo(p, 2);
            if (!(p in newState.levels)) {
                this.updateLevel(newState, p, null, null);
            }
        }

        // Create extra price levels based on max ask
        for (let p = px; p <= px + (this.instrumentRef.current.tickSz * newState.minDepth); p += this.instrumentRef.current.tickSz) {
            p = roundTo(p, 2);
            if (!(p in newState.levels)) {
                this.updateLevel(newState, p, null, null);
            }
        }

        for (let p = px + this.instrumentRef.current.tickSz; p <= px - this.instrumentRef.current.tickSz; p += this.instrumentRef.current.tickSz) {
            p = roundTo(p, 2);
            if (!(p in newState.levels)) {
                this.updateLevel(newState, p, null, null);
            }
        }
    }

    updateMyOrders(newState, exRpt) {
        const orderId = exRpt[11];
        const px = exRpt[44]
        let order = null;
        if (orderId in newState.orders) 
            order = newState.orders[orderId];
        else {
            order = new  Order(exRpt[56],orderId,exRpt[52],exRpt[39],px,exRpt[38] );
            newState.orders[orderId] = order;
        }
        if (!(px in newState.levels)) {
            this.updateLevel(newState, px, null, null);
        }
        if (exRpt[54] === 1) {
            console.log("Updating MyBids at ", px);
            newState.levels[px].myBids[orderId] = order;
        }
        else {
            console.log("Updating MyAsks at ", px);
            newState.levels[px].myAsks[orderId] = order;
        }
        newState.levels[px].myBidQty = Object.values(newState.levels[px].myBids).reduce((acc, obj) => acc + obj.qty, 0);
        newState.levels[px].myAskQty = Object.values(newState.levels[px].myAsks).reduce((acc, obj) => acc + obj.qty, 0);
    }

    updateSparkData(newState, mid) {
        mid = Number.isNaN(mid) ? newState.sparkData[newState.sparkData.length-1] : mid;
        const now = new Date();
        if ((now.getTime() - newState.lastSparkDate.getTime()) / (1000 * 0.1) >= 1) {
            newState.lastSparkDate = now;
            newState.sparkData.push(mid)
        }
    }

    processCancel(newState, exRpt) {
        const orderId = exRpt[11];
        const px = exRpt[44]
        const level = newState.levels[px];
        if (exRpt[54] === 1) {
            if (level && orderId in level.myBids) {
                delete level.myBids[orderId];
                level.myBidQty = Object.values(level.myBids).reduce((acc, obj) => acc + obj.qty, 0);
            }
        }
        else if (exRpt[54] === 2) {
            if (level && orderId in level.myAsks) {
                delete level.myAsks[orderId];
                level.myAskQty = Object.values(level.myAsks).reduce((acc, obj) => acc + obj.qty, 0);
            }
        }
        delete newState.orders[orderId];
    }

    processModify(newState, exRpt) {
        const orderId = exRpt[11];
        const px = exRpt[44]
        const level_new = newState.levels[px];
        const level_old = newState.levels[newState.orders[orderId].px];
        let order = newState.orders[orderId];
        order.px = px;
        if (exRpt[54] === 1) {
            if (level_old && orderId in level_old.myBids) {
                delete level_old.myBids[orderId];
                level_old.myBidQty = Object.values(level_old.myBids).reduce((acc, obj) => acc + obj.qty, 0);
            }
            level_new.myBids[orderId] = order;
            level_new.myBidQty = Object.values(level_new.myBids).reduce((acc, obj) => acc + obj.qty, 0);
        }
        else if (exRpt[54] === 2) {
            if (level_old && orderId in level_old.myAsks) {
                delete level_old.myAsks[orderId];
                level_old.myAskQty = Object.values(level_old.myAsks).reduce((acc, obj) => acc + obj.qty, 0);
            }
            level_new.myAsks[orderId] = order;
            level_new.myAskQty = Object.values(level_new.myAsks).reduce((acc, obj) => acc + obj.qty, 0);
        }
    }

    processFill(newState, exRpt) {
        console.log('Fill: ', exRpt[38], '@', exRpt[44], exRpt[52]);
        const orderId = exRpt[11];
        const px = exRpt[44];
        if (exRpt[39] == 2) { // full fill
            this.processCancel(newState, exRpt);
        }
        else if (exRpt[39] == 1) { // partial fill
            if (exRpt[54] === 1) {
                console.log("Updating MyBids due to partial fill at ", px);
                newState.levels[px].myBids[orderId].qty -= exRpt[38];
            }
            else {
                console.log("Updating MyAsks due to partial fill at ", px);
                newState.levels[px].myAsks[orderId] -= exRpt[38];
            }
            newState.levels[px].myBidQty = Object.values(newState.levels[px].myBids).reduce((acc, obj) => acc + obj.qty, 0);
            newState.levels[px].myAskQty = Object.values(newState.levels[px].myAsks).reduce((acc, obj) => acc + obj.qty, 0);
        }
    }

}

function DataManager({url, onDataChange}) {
    const { data: instrument, update: updateInstrument, callbacks: callbacks } = useInstrument();
    const instrumentRef = useRef(instrument);

    const stateUpdaterRef = useRef(null);
    if (stateUpdaterRef.current === null)
        stateUpdaterRef.current = new StateUpdater(instrumentRef, callbacks);
    const stateUpdater = stateUpdaterRef.current;

    const webSocketManagerRef = useRef(null);

    const initialState = {
        symbol: null,
        tickSz: 0.01,
        minDepth: 10,
        levels: {},
        orders: {},
        minPx: Number.MAX_VALUE,
        maxPx: Number.MIN_VALUE,
        tradedPxs: {},
        openingPx: null,
        lastTradePrice: null,
        volume: 0,
        mid: null,
        chartData: [],
        sparkData: [],
        lastDate: new Date(),
        lastChartDate: new Date(),
        lastChartClose: null,
        currChartLow: Number.MAX_VALUE,
        currChartHi: Number.MIN_VALUE,
        lastSparkDate: new Date(),
        clientId: -1,
        wsSend: null
    };

    const [state, dispatch] = useReducer(stateUpdater.updateState.bind(stateUpdater), initialState);

    useEffect(() => {
        onDataChange(state);
    }, [state, onDataChange]);

    useEffect(() => {
        if (instrument != null) {
            instrumentRef.current = instrument;
        }
    }, [instrument]);

    const updateInstrumentContext = (msg)  => {
        if (msg[35] === 'd') {
            instrumentRef.current = {
                ...instrumentRef.current,
                symbol: msg[55],
                tickSz: msg[969],
                decimals: msg[969].toString().split('').reverse().join('').indexOf('.'),
                openingPx: msg[44],
                currency: msg[15],
                wsSend: webSocketManagerRef.current.sendMessage
            }
            updateInstrument(instrumentRef.current);
        }
        else if (msg[35] === 'A') {
            instrumentRef.current = {
                ...instrumentRef.current,
                clientId: msg[56]
            }
            updateInstrument(instrumentRef.current);
        }
    }

    const handleWebSocketMessage = (msg) => {
        if (!(msg === null) && 35 in msg) {
            updateInstrumentContext(msg); //Update Constext
            dispatch(msg); // Update State
        }
    }

    useEffect(() => {
        console.log("initializing WebSocket connection");
        console.log(stateUpdater);
        webSocketManagerRef.current = new WebSocketManager('ws://localhost', 8765, handleWebSocketMessage, callbacks);
        webSocketManagerRef.current.connect(true);
    }, []);

    return (
        <></>
        // <div style={{display: "none"}}>blah</div>
        // <div>{data.lastDate.toString()}</div>
    )
}

export default DataManager;