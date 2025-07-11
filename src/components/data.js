import React, { useState, useEffect, useRef } from 'react';

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

class ChartData {
  constructor(date, open, low, high, close, volume) {
      this.date = date;
      this.open = open;
      this.low = low;
      this.high = high;
      this.close = close;
      this.volume = volume;
  }
}

// let data = {
//   symbol: null,
//   tickSz: null,
//   minDepth: 10,
//   levels: {},
//   minPx: Number.MX_VALUE,
//   maxPx: Number.MIN_VALUE,
//   lastTradePrice: null,
//   chartData: []
// }

let lastMsg = null;

const getPxString = (px) => { 
  try {
    let strPx = px.toFixed(2);
  }
  catch (e) {
    console.log(e)
  }
  return px.toFixed(2);
}

function roundTo(num, places) {
  return +(Math.round(num + `e+${places}`)  + `e-${places}`);
}

function StockData({onDataChange}) {
  const [data, setData] = useState({
    symbol: null,
    tickSz: 0.01,
    minDepth: 10,
    levels: {},
    orders: {},
    minPx: Number.MX_VALUE,
    maxPx: Number.MIN_VALUE,
    tradedPxs: {},
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
    compId: -1,
    socket: null  // Initialize as null
  });
  const [socket, setSocket] = useState(null);

  const dataRef = useRef(data);

  // const chartDataRef = useRef(dataRef.current.chartData);
  const levelsRef = useRef(dataRef.current.levels);

  useEffect(() => {
    dataRef.current = data;
    // chartDataRef.current = data.chartData;
    // levelsRef.current = data.levels;
    onDataChange(data);
  }, [data]);

  useEffect(() => {
    levelsRef.current = data.levels;
  }, [data.levels]);

  // useEffect(() => {
  //   chartDataRef.current = data.chartData;
  // }, [data.chartData]);

  const updateChartData = (mid) => {
    setData(prevData => {
      const newData = { ...prevData };
      const now = new Date();
      newData.mid = mid;
      if (newData.lastChartClose == null) {
        newData.lastChartClose = newData.mid;
      }
      if ((now.getTime() - newData.lastChartDate.getTime()) / (1000 * 5) >= 1) {
        const open = newData.lastChartClose;
        newData.lastChartClose = null;
        newData.chartData.push(new ChartData(now, open, newData.currChartLow, newData.currChartHi, newData.mid, 10000));
        newData.currChartLow = newData.mid;
        newData.currChartHi = newData.mid;
        newData.lastChartDate = now;
        // console.log(newData.chartData);
      }
      else {
        newData.currChartLow = Math.min(newData.currChartLow, newData.mid);
        newData.currChartHi = Math.max(newData.currChartHi, newData.mid);
      }
      return newData;
    });
  }

  const updateSparkData = (mid) => {
    setData(prevData => {
      const newData = { ...prevData };
      const now = new Date();
      if ((now.getTime() - newData.lastSparkDate.getTime()) / (1000 * 0.1) >= 1) {
        newData.lastSparkDate = now;
        newData.sparkData.push(mid)
      }
      return newData;
    });
  }

  const updateLevel = (p, qtyBid, qtyAsk) => {
    setData(prevData => {
      const newData = { ...prevData };
      // Preserve traded state if the level already exists
      if (p in prevData.levels) {
        newData.levels[p] = new Level({
          proto: prevData.levels[p],
          args: { bid: qtyBid, ask: qtyAsk }
        });
      }
      else
        newData.levels[p] = new Level({args:{px:p, bid:qtyBid, ask:qtyAsk}});

      // Update min/max prices
      if (p < prevData.minPx) newData.minPx = p;
      if (p > prevData.maxPx) newData.maxPx = p;

      newData.lastDate = new Date(); 

      return newData;
    });
  };

  const updateLastTradePx = (px, sz, dt) => {
    setData(prevData => {
        const newData = { ...prevData };
        if (newData.lastTradePrice != null && newData.lastTradePrice != undefined && newData.lastTradePrice in newData.levels)
          newData.levels[newData.lastTradePrice].last = false;
        newData.levels[px].last = true;
        newData.levels[px].traded = true;
        console.log(`Setting traded to true for ${px}`, newData.levels[px].traded);
        newData.lastTradePrice = px;
        newData.tradedPxs[px] = dt;
        newData.volume += sz;
        newData.levels[px].volume += sz
        newData.levels[px].volPct = newData.levels[px].volume / newData.volume * 100.0;
        console.log("Px: ", px, "vol:",newData.levels[px].volume, "Total vol: ", newData.volume, "volPct: ", newData.levels[px].volPct);
        return newData;
    });
  };

  const processLogon = (msg) => {
    setData(prevData => {
      const newData = { ...prevData };
      newData.compId = msg[56];
      console.log("Logon successfull", newData.compId);
      ensureLevels(msg[44], msg[44]);
      return newData;
    });
  }

  const ensureLevels = (bidPx, askPx) => {
    // Create price levels based on min bid
    for (let p = bidPx; p >= bidPx - (dataRef.current.tickSz * dataRef.current.minDepth); p -= dataRef.current.tickSz) {
        p = roundTo(p, 2);
        if (!(p in levelsRef.current)) {
            updateLevel(p, null, null);
        }
    }

    // Create extra price levels based on max ask
    for (let p = askPx; p <= askPx + (dataRef.current.tickSz * dataRef.current.minDepth); p += dataRef.current.tickSz) {
        p = roundTo(p, 2);
        if (!(p in levelsRef.current)) {
            updateLevel(p, null, null);
        }
    }

    for (let p = bidPx + dataRef.current.tickSz; p <= askPx - dataRef.current.tickSz; p += dataRef.current.tickSz) {
        p = roundTo(p, 2);
        if (!(p in levelsRef.current)) {
            updateLevel(p, null, null);
        }
    }
  }

  const processMdSnapshot = (msg) => {
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
    if (askPx.length > 1) {
      console.log(msg);
    }

    // Clear out prior md snapshot levels
    for (const [px, level] of Object.entries(levelsRef.current)) {
      if (((level.bid != null) && !(level.bid in bidPx)) || ((level.ask != null) && !(level.ask in askPx))) {
        // console.log(px, typeof(px));
        updateLevel(parseFloat(px), null, null);
      }
    }

    // Update Bids
    for (let i = 0; i < bidPx.length; i++)
      updateLevel(bidPx[i], bidQty[i], null);

    // Update Asks
    for (let i = 0; i < askPx.length; i++)
      updateLevel(askPx[i], null, askQty[i]);

    const minBid = bidPx?.length > 0 ? Math.min(...bidPx) : (Math.min(...askPx));
    const maxAsk = askPx?.length > 0 ? Math.max(...askPx) : (Math.max(...bidPx));
    ensureLevels(minBid, maxAsk);

    // // Create price levels based on min bid
    // const minBid = bidPx?.length > 0 ? Math.min(...bidPx) : (Math.min(...askPx));
    // for (let p = minBid; p >= minBid - (dataRef.current.tickSz * dataRef.current.minDepth); p -= dataRef.current.tickSz) {
    //     p = roundTo(p, 2);
    //     if (!(p in levelsRef.current)) {
    //         updateLevel(p, null, null);
    //     }
    // }

    // // Create extra price levels based on max ask
    // const maxAsk = askPx?.length > 0 ? Math.max(...askPx) : (Math.max(...bidPx));
    // for (let p = maxAsk; p <= maxAsk + (dataRef.current.tickSz * dataRef.current.minDepth); p += dataRef.current.tickSz) {
    //     p = roundTo(p, 2);
    //     if (!(p in levelsRef.current)) {
    //         updateLevel(p, null, null);
    //     }
    // }

    // for (let p = minBid + dataRef.current.tickSz; p <= maxAsk - dataRef.current.tickSz; p += dataRef.current.tickSz) {
    //     p = roundTo(p, 2);
    //     if (!(p in levelsRef.current)) {
    //         updateLevel(p, null, null);
    //     }
    // }

    const mid = (Math.max(...bidPx) + Math.min(...askPx)) / 2.0
    updateSparkData(mid);
    updateChartData(mid);
  }

  const updateMyOrders = (exRpt) => {
    console.log("Updating my orders");
    setData(prevData => { 
        const newData = { ...prevData };
        const orderId = exRpt[11];
        const px = exRpt[44]
        let order = null;
        if (orderId in newData.orders) 
          order = newData.orders[orderId];
        else {
          order = new  Order(exRpt[56],orderId,exRpt[52],exRpt[39],px,exRpt[38] );
          newData.orders[orderId] = order;
        }
        if (!(px in levelsRef.current)) {
          updateLevel(px, null, null);
        }
        if (exRpt[54] === 1)
          levelsRef.current[px].myBids[orderId] = order;
        else
          levelsRef.current[px].myAsks[orderId] = order;
        levelsRef.current[px].myBidQty = Object.values(levelsRef.current[px].myBids).reduce((acc, obj) => acc + obj.qty, 0);
        levelsRef.current[px].myAskQty = Object.values(levelsRef.current[px].myAsks).reduce((acc, obj) => acc + obj.qty, 0);
        console.log("myBids", px, levelsRef.current[px].myBidQty);
        return newData;
    });
  }

  const processCancel = (exRpt) => {
    const orderId = exRpt[11];
    const px = exRpt[44]
    setData(prevData => { 
      const newData = { ...prevData };
      const level = newData.levels[px];
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
      delete newData.orders[orderId];
      return newData;
    });
  }

  const processModify = (exRpt) => {
    const orderId = exRpt[11];
    const px = exRpt[44]
    setData(prevData => { 
      const newData = { ...prevData };
      console.log("Modifying order ", orderId, " to ", px);
      console.log("Old orders: ", newData.orders);
      const level_new = newData.levels[px];
      const level_old = newData.levels[newData.orders[orderId].px];
      let order = newData.orders[orderId];
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
        console.log("New replace ask ack");
        if (level_old && orderId in level_old.myAsks) {
          console.log("Found old ask");
          delete level_old.myAsks[orderId];
          level_old.myAskQty = Object.values(level_old.myAsks).reduce((acc, obj) => acc + obj.qty, 0);
        }
        console.log("Setting new ask");
        level_new.myAsks[orderId] = order;
        level_new.myAskQty = Object.values(level_new.myAsks).reduce((acc, obj) => acc + obj.qty, 0);
      }
      return newData;
    });
  }

  const processExecRpt = (msg) => {
    console.log("Received execution report");
    const date = new Date(msg[52]);
    switch (msg[39]) {
      case(0): //New
        updateMyOrders(msg);
        break;
      case(1):
      case(2):
        updateLastTradePx(msg[31], msg[38], date);
        if (msg[56] === data.compId) {
          processFill(msg[31], msg[38], date);
        }
        break;
      case(4): //Cancel
        processCancel(msg);
        break;
      case(5): //Modify
        processModify(msg);
        break;
      default:
        console.log("Unknown execution report status", msg[39]);
    }
  }

  const processFill = (px, qty, dt) => {
    console.log('Fill: ', qty, '@', px, dt);
  }

  const websocketReady = (ws, msg) => {
    setSocket(ws);
    setData(prevData => ({
      ...prevData,
      socket: ws,
      symbol: msg[55]
    }));
    console.log(Date.now()/1000, ":: Sending logon message");
    ws.send(JSON.stringify({49:data.compId,35:'A'}))
  }

  useEffect(() => {
    console.log("Websocket useEffect");
    // Create WebSocket connection inside useEffect

    const ws = new WebSocket('ws://localhost:8765');
    // let clientId = null;
    // const handleBeforeUnload = (event) => {
    //   // if (ws && ws.readyState === WebSocket.OPEN) {
    //     console.log("Window unloading")
    //     ws.send(JSON.stringify({49:clientId,35:5}));
    //     ws.close();
    //     event.preventDefault();
    //     event.returnValue = '';
    //   // }
    // };
    // window.addEventListener('beforeunload', handleBeforeUnload);

    ws.onmessage = (event) => {
      console.log("socket.onmessage", event);
        const msg = JSON.parse(event.data);
        console.log(Date.now()/1000, ":: Received socket msg", msg);

        if (!(msg === null)) {
          if (35 in msg) {
            // console.log("Received fix42 message");
            // console.log(msg)
            switch (msg[35]) {
              case('d'): //Sec def (ready)
                websocketReady(ws, msg);
                break;
              case('A'): //Logon
                processLogon(msg);
                break;
              case('W'): //MD snapshot
                processMdSnapshot(msg);
                break;
              case(8):
                processExecRpt(msg);
                break;
              default:
                console.log("Unknown message type", msg[35]);
            }
          }
        }
    };
    
    ws.onopen = (event) => {
      console.log("Websocket connection successful");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      ws.send(JSON.stringify({49:data.compId,35:'5'}))
    };

    ws.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      // ws.send(JSON.stringify({49:data.compId,35:'5'}))
    };

    // Cleanup function
    return () => {
      // if (ws.readyState === WebSocket.OPEN) {
      //   ws.close();
      // }
    };
  }, []); // Empty dependency array means this runs once on mount

  // useEffect(() => {
  //   if (!socket) return;

  //   socket.onmessage = (event) => {
  //     console.log("socket.onmessage", event);
  //       const msg = JSON.parse(event.data);
  //       console.log("Received socket msg", msg);

  //       if (!(msg === null)) {
  //         if (35 in msg) {
  //           // console.log("Received fix42 message");
  //           // console.log(msg)
  //           switch (msg[35]) {
  //             case('A'): //Logon
  //               processLogon(msg);
  //               break;
  //             case('W'): //MD snapshot
  //               processMdSnapshot(msg);
  //               break;
  //             case(8):
  //               processExecRpt(msg);
  //               break;
  //             default:
  //               console.log("Unknown message type", msg[35]);
  //           }
  //         }
  //       }
  //   };

  //   return () => {
  //     socket.onmessage = null;
  //   };
  // }, [socket]); // Re-run when socket changes

  return (
    // <div style={{display: "none"}}>blah</div>
    <div>{data.lastDate.toString()}</div>
  )
}

export let initialData = [
    {
      date: "2021-02-02 16:00:00",
      open: 134.9307,
      low: 134.9105,
      high: 135.4215,
      close: 135.0087,
      volume: 73591581
    },
    {
      date: "2021-02-02 15:45:00",
      open: 134.9707,
      low: 134.9307,
      high: 134.9707,
      close: 134.9307,
      volume: 67639193
    },
    {
      date: "2021-02-02 15:30:00",
      open: 134.6608,
      low: 134.6608,
      high: 134.975,
      close: 134.975,
      volume: 64815258
    },
    {
      date: "2021-02-02 15:15:00",
      open: 134.8585,
      low: 134.6237,
      high: 134.9716,
      close: 134.6608,
      volume: 62892896
    },
    {
      date: "2021-02-02 15:00:00",
      open: 134.985,
      low: 134.78,
      high: 135.0,
      close: 134.8585,
      volume: 60880828
    },
    {
      date: "2021-02-02 14:45:00",
      open: 135.0361,
      low: 134.895,
      high: 135.07,
      close: 134.985,
      volume: 58154799
    },
    {
      date: "2021-02-02 14:30:00",
      open: 135.065,
      low: 134.965,
      high: 135.0799,
      close: 135.0361,
      volume: 56547384
    },
    {
      date: "2021-02-02 14:15:00",
      open: 134.97,
      low: 134.86,
      high: 135.04,
      close: 134.975,
      volume: 55064426
    },
    {
      date: "2021-02-02 14:00:00",
      open: 135.1,
      low: 134.9501,
      high: 135.19,
      close: 134.97,
      volume: 53781369
    },
    {
      date: "2021-02-02 13:45:00",
      open: 134.76,
      low: 134.725,
      high: 135.1001,
      close: 135.1,
      volume: 52259221
    },
    {
      date: "2021-02-02 13:30:00",
      open: 134.8993,
      low: 134.63,
      high: 134.96,
      close: 134.76,
      volume: 49705143
    },
    {
      date: "2021-02-02 13:15:00",
      open: 134.98,
      low: 134.8593,
      high: 135.0799,
      close: 134.8993,
      volume: 47910633
    },
    {
      date: "2021-02-02 13:00:00",
      open: 135.2338,
      low: 134.94,
      high: 135.2593,
      close: 135.0108,
      volume: 46217357
    },
    {
      date: "2021-02-02 12:45:00",
      open: 135.275,
      low: 135.14,
      high: 135.4692,
      close: 135.2338,
      volume: 44569949
    },
    {
      date: "2021-02-02 12:30:00",
      open: 135.095,
      low: 134.96,
      high: 135.275,
      close: 135.275,
      volume: 42806818
    },
    {
      date: "2021-02-02 12:15:00",
      open: 135.07,
      low: 135.03,
      high: 135.23,
      close: 135.095,
      volume: 41098062
    },
    {
      date: "2021-02-02 12:00:00",
      open: 134.985,
      low: 134.91,
      high: 135.1573,
      close: 135.07,
      volume: 39155809
    },
    {
      date: "2021-02-02 11:45:00",
      open: 135.24,
      low: 134.889,
      high: 135.285,
      close: 134.9501,
      volume: 36999582
    },
    {
      date: "2021-02-02 11:30:00",
      open: 135.4,
      low: 135.235,
      high: 135.6321,
      close: 135.24,
      volume: 34086377
    },
    {
      date: "2021-02-02 11:15:00",
      open: 135.57,
      low: 135.1485,
      high: 135.57,
      close: 135.4,
      volume: 32048146
    },
    {
      date: "2021-02-02 11:00:00",
      open: 135.2099,
      low: 135.085,
      high: 135.69,
      close: 135.57,
      volume: 30026663
    },
    {
      date: "2021-02-02 10:45:00",
      open: 135.26,
      low: 135.0608,
      high: 135.38,
      close: 135.2099,
      volume: 26982389
    },
    {
      date: "2021-02-02 10:30:00",
      open: 135.4193,
      low: 135.26,
      high: 135.53,
      close: 135.26,
      volume: 23752063
    },
    {
      date: "2021-02-02 10:15:00",
      open: 135.43,
      low: 135.14,
      high: 135.87,
      close: 135.8154,
      volume: 19673745
    },
    {
      date: "2021-02-02 10:00:00",
      open: 135.4399,
      low: 135.04,
      high: 135.825,
      close: 135.43,
      volume: 15909299
    },
    {
      date: "2021-02-02 09:45:00",
      open: 134.14,
      low: 134.14,
      high: 136.22,
      close: 135.4399,
      volume: 10820024
    },
    {
      date: "2021-02-02 09:30:00",
      open: 134.14,
      low: 134.14,
      high: 134.14,
      close: 134.14,
      volume: 104212352
    },
    {
      date: "2021-02-01 16:00:00",
      open: 134.8,
      low: 134.085,
      high: 134.82,
      close: 134.125,
      volume: 97173319
    },
    {
      date: "2021-02-01 15:45:00",
      open: 134.36,
      low: 134.31,
      high: 134.8314,
      close: 134.8,
      volume: 91194914
    },
    {
      date: "2021-02-01 15:30:00",
      open: 134.34,
      low: 134.2393,
      high: 134.4999,
      close: 134.47,
      volume: 88193616
    },
    {
      date: "2021-02-01 15:15:00",
      open: 134.1785,
      low: 134.1785,
      high: 134.5401,
      close: 134.34,
      volume: 86187092
    },
    {
      date: "2021-02-01 15:00:00",
      open: 134.33,
      low: 134.1301,
      high: 134.5473,
      close: 134.1785,
      volume: 84120270
    },
    {
      date: "2021-02-01 14:45:00",
      open: 134.38,
      low: 133.94,
      high: 134.395,
      close: 134.33,
      volume: 82250557
    },
    {
      date: "2021-02-01 14:30:00",
      open: 134.51,
      low: 134.04,
      high: 134.6599,
      close: 134.38,
      volume: 79950724
    },
    {
      date: "2021-02-01 14:15:00",
      open: 134.545,
      low: 134.46,
      high: 134.55,
      close: 134.51,
      volume: 77493396
    },
    {
      date: "2021-02-01 14:00:00",
      open: 134.48,
      low: 134.29,
      high: 134.72,
      close: 134.72,
      volume: 75461060
    },
    {
      date: "2021-02-01 13:45:00",
      open: 134.8817,
      low: 134.43,
      high: 135.1112,
      close: 134.48,
      volume: 73104604
    },
    {
      date: "2021-02-01 13:30:00",
      open: 134.9392,
      low: 134.8301,
      high: 135.36,
      close: 134.8817,
      volume: 70187343
    },
    {
      date: "2021-02-01 13:15:00",
      open: 134.87,
      low: 134.6524,
      high: 134.99,
      close: 134.9392,
      volume: 67015304
    },
    {
      date: "2021-02-01 13:00:00",
      open: 134.5801,
      low: 134.49,
      high: 134.87,
      close: 134.87,
      volume: 64345090
    },
    {
      date: "2021-02-01 12:45:00",
      open: 134.79,
      low: 134.4201,
      high: 134.95,
      close: 134.49,
      volume: 62121484
    },
    {
      date: "2021-02-01 12:30:00",
      open: 134.68,
      low: 134.53,
      high: 134.8392,
      close: 134.79,
      volume: 59055235
    },
    {
      date: "2021-02-01 12:15:00",
      open: 133.82,
      low: 133.82,
      high: 134.74,
      close: 134.68,
      volume: 56074424
    },
    {
      date: "2021-02-01 12:00:00",
      open: 134.2,
      low: 133.8,
      high: 134.3999,
      close: 133.82,
      volume: 52777911
    },
    {
      date: "2021-02-01 11:45:00",
      open: 134.025,
      low: 133.9,
      high: 134.3401,
      close: 134.2,
      volume: 49831279
    },
    {
      date: "2021-02-01 11:30:00",
      open: 133.2999,
      low: 133.2624,
      high: 134.0601,
      close: 134.0276,
      volume: 46324896
    },
    {
      date: "2021-02-01 11:15:00",
      open: 132.7815,
      low: 132.4199,
      high: 133.52,
      close: 133.2999,
      volume: 42861204
    },
    {
      date: "2021-02-01 11:00:00",
      open: 133.5601,
      low: 132.5799,
      high: 133.83,
      close: 132.7815,
      volume: 39083686
    },
    {
      date: "2021-02-01 10:45:00",
      open: 133.2399,
      low: 132.97,
      high: 133.64,
      close: 133.5601,
      volume: 34812287
    },
    {
      date: "2021-02-01 10:30:00",
      open: 132.745,
      low: 132.3,
      high: 133.2399,
      close: 133.2399,
      volume: 30807577
    },
    {
      date: "2021-02-01 10:15:00",
      open: 132.1626,
      low: 131.3615,
      high: 132.46,
      close: 132.46,
      volume: 26173151
    },
    {
      date: "2021-02-01 10:00:00",
      open: 133.26,
      low: 131.22,
      high: 133.26,
      close: 132.1626,
      volume: 20799937
    },
    {
      date: "2021-02-01 09:45:00",
      open: 131.96,
      low: 131.96,
      high: 134.6849,
      close: 133.26,
      volume: 12628512
    },
    {
      date: "2021-02-01 09:30:00",
      open: 131.96,
      low: 131.96,
      high: 131.96,
      close: 131.96,
      volume: 177523812
    },
    {
      date: "2021-01-29 16:00:00",
      open: 132.58,
      low: 131.94,
      high: 132.8,
      close: 131.94,
      volume: 161865494
    },
    {
      date: "2021-01-29 15:45:00",
      open: 132.5393,
      low: 132.53,
      high: 133.495,
      close: 132.79,
      volume: 152339458
    },
    {
      date: "2021-01-29 15:30:00",
      open: 132.79,
      low: 132.5393,
      high: 133.21,
      close: 132.5393,
      volume: 146166317
    },
    {
      date: "2021-01-29 15:15:00",
      open: 131.6601,
      low: 131.6601,
      high: 132.92,
      close: 132.79,
      volume: 141222089
    },
    {
      date: "2021-01-29 15:00:00",
      open: 131.49,
      low: 131.32,
      high: 131.9901,
      close: 131.6601,
      volume: 136310125
    },
    {
      date: "2021-01-29 14:45:00",
      open: 131.5199,
      low: 131.0779,
      high: 131.68,
      close: 131.49,
      volume: 132849170
    },
    {
      date: "2021-01-29 14:30:00",
      open: 132.14,
      low: 131.9288,
      high: 132.4799,
      close: 132.0001,
      volume: 128804590
    },
    {
      date: "2021-01-29 14:15:00",
      open: 131.62,
      low: 131.62,
      high: 132.53,
      close: 132.14,
      volume: 125888558
    },
    {
      date: "2021-01-29 14:00:00",
      open: 132.69,
      low: 131.58,
      high: 132.79,
      close: 131.62,
      volume: 121399503
    },
    {
      date: "2021-01-29 13:45:00",
      open: 132.0,
      low: 131.6399,
      high: 132.69,
      close: 132.69,
      volume: 117233820
    },
    {
      date: "2021-01-29 13:30:00",
      open: 130.65,
      low: 130.63,
      high: 132.0,
      close: 132.0,
      volume: 110562871
    },
    {
      date: "2021-01-29 13:15:00",
      open: 130.6017,
      low: 130.37,
      high: 131.61,
      close: 131.0299,
      volume: 105338561
    },
    {
      date: "2021-01-29 13:00:00",
      open: 131.0715,
      low: 130.22,
      high: 131.37,
      close: 130.6017,
      volume: 99553785
    },
    {
      date: "2021-01-29 12:45:00",
      open: 132.0093,
      low: 130.73,
      high: 132.21,
      close: 131.0715,
      volume: 90996575
    },
    {
      date: "2021-01-29 12:30:00",
      open: 132.9401,
      low: 131.48,
      high: 132.9401,
      close: 132.0093,
      volume: 83027416
    },
    {
      date: "2021-01-29 12:15:00",
      open: 133.22,
      low: 132.63,
      high: 133.22,
      close: 132.9401,
      volume: 76856349
    },
    {
      date: "2021-01-29 12:00:00",
      open: 132.4108,
      low: 132.1451,
      high: 132.975,
      close: 132.9099,
      volume: 72257218
    },
    {
      date: "2021-01-29 11:45:00",
      open: 132.2699,
      low: 131.24,
      high: 132.42,
      close: 132.4108,
      volume: 66562585
    },
    {
      date: "2021-01-29 11:30:00",
      open: 132.2,
      low: 131.99,
      high: 132.88,
      close: 132.2699,
      volume: 58361348
    },
    {
      date: "2021-01-29 11:15:00",
      open: 134.1993,
      low: 132.2,
      high: 134.33,
      close: 132.2,
      volume: 49903777
    },
    {
      date: "2021-01-29 11:00:00",
      open: 134.2799,
      low: 133.9101,
      high: 134.43,
      close: 134.1993,
      volume: 40986184
    },
    {
      date: "2021-01-29 10:45:00",
      open: 135.26,
      low: 134.4493,
      high: 135.4307,
      close: 134.4493,
      volume: 36190973
    },
    {
      date: "2021-01-29 10:30:00",
      open: 134.95,
      low: 134.52,
      high: 135.54,
      close: 135.26,
      volume: 32415900
    },
    {
      date: "2021-01-29 10:15:00",
      open: 135.08,
      low: 134.06,
      high: 135.25,
      close: 134.95,
      volume: 27621937
    },
    {
      date: "2021-01-29 10:00:00",
      open: 134.68,
      low: 134.2255,
      high: 135.15,
      close: 135.08,
      volume: 21829414
    },
    {
      date: "2021-01-29 09:45:00",
      open: 136.6799,
      low: 134.0,
      high: 136.6799,
      close: 134.68,
      volume: 14974587
    },
    {
      date: "2021-01-29 09:30:00",
      open: 137.09,
      low: 137.09,
      high: 137.09,
      close: 137.09,
      volume: 142621028
    },
    {
      date: "2021-01-28 16:00:00",
      open: 137.21,
      low: 136.9399,
      high: 137.36,
      close: 136.94,
      volume: 128713666
    },
    {
      date: "2021-01-28 15:45:00",
      open: 138.3785,
      low: 137.8301,
      high: 138.55,
      close: 137.8301,
      volume: 118804767
    },
    {
      date: "2021-01-28 15:30:00",
      open: 139.285,
      low: 138.3785,
      high: 139.285,
      close: 138.3785,
      volume: 112402836
    },
    {
      date: "2021-01-28 15:15:00",
      open: 139.3601,
      low: 138.87,
      high: 139.3601,
      close: 139.285,
      volume: 108315329
    },
    {
      date: "2021-01-28 15:00:00",
      open: 139.41,
      low: 139.052,
      high: 139.49,
      close: 139.3601,
      volume: 105007791
    },
    {
      date: "2021-01-28 14:45:00",
      open: 139.4507,
      low: 139.31,
      high: 139.691,
      close: 139.41,
      volume: 102543500
    },
    {
      date: "2021-01-28 14:30:00",
      open: 139.26,
      low: 139.055,
      high: 139.8508,
      close: 139.71,
      volume: 100010878
    },
    {
      date: "2021-01-28 14:15:00",
      open: 140.235,
      low: 139.26,
      high: 140.33,
      close: 139.26,
      volume: 96358515
    },
    {
      date: "2021-01-28 14:00:00",
      open: 140.435,
      low: 140.045,
      high: 140.48,
      close: 140.235,
      volume: 91807451
    },
    {
      date: "2021-01-28 13:45:00",
      open: 140.2285,
      low: 140.1,
      high: 140.54,
      close: 140.435,
      volume: 89559155
    },
    {
      date: "2021-01-28 13:30:00",
      open: 140.32,
      low: 140.13,
      high: 140.64,
      close: 140.2285,
      volume: 87049781
    },
    {
      date: "2021-01-28 13:15:00",
      open: 140.73,
      low: 140.1065,
      high: 140.875,
      close: 140.36,
      volume: 83892854
    },
    {
      date: "2021-01-28 13:00:00",
      open: 140.96,
      low: 140.72,
      high: 141.45,
      close: 140.73,
      volume: 80857848
    },
    {
      date: "2021-01-28 12:45:00",
      open: 141.1382,
      low: 140.6982,
      high: 141.5501,
      close: 140.96,
      volume: 77221035
    },
    {
      date: "2021-01-28 12:30:00",
      open: 140.67,
      low: 140.66,
      high: 141.9285,
      close: 141.1382,
      volume: 72833557
    },
    {
      date: "2021-01-28 12:15:00",
      open: 139.609,
      low: 139.609,
      high: 140.7075,
      close: 140.67,
      volume: 65464139
    },
    {
      date: "2021-01-28 12:00:00",
      open: 138.7285,
      low: 138.53,
      high: 139.0185,
      close: 139.0185,
      volume: 59789245
    },
    {
      date: "2021-01-28 11:45:00",
      open: 138.9299,
      low: 138.6,
      high: 139.2,
      close: 138.7285,
      volume: 56886996
    },
    {
      date: "2021-01-28 11:30:00",
      open: 139.55,
      low: 138.9299,
      high: 139.9586,
      close: 138.9299,
      volume: 53853733
    },
    {
      date: "2021-01-28 11:15:00",
      open: 139.1315,
      low: 139.0015,
      high: 139.8508,
      close: 139.55,
      volume: 49482641
    },
    {
      date: "2021-01-28 11:00:00",
      open: 139.08,
      low: 138.87,
      high: 139.6295,
      close: 139.1315,
      volume: 45630252
    },
    {
      date: "2021-01-28 10:45:00",
      open: 139.5382,
      low: 138.6199,
      high: 140.17,
      close: 138.907,
      volume: 41565209
    },
    {
      date: "2021-01-28 10:30:00",
      open: 139.2,
      low: 139.2,
      high: 140.245,
      close: 139.5382,
      volume: 36506474
    },
    {
      date: "2021-01-28 10:15:00",
      open: 138.3499,
      low: 138.01,
      high: 139.2824,
      close: 139.2,
      volume: 29596619
    },
    {
      date: "2021-01-28 10:00:00",
      open: 139.76,
      low: 138.08,
      high: 139.81,
      close: 138.3499,
      volume: 23942902
    },
    {
      date: "2021-01-28 09:45:00",
      open: 139.52,
      low: 138.1,
      high: 139.76,
      close: 139.76,
      volume: 17241958
    },
    {
      date: "2021-01-28 09:30:00",
      open: 142.06,
      low: 142.06,
      high: 142.06,
      close: 142.06,
      volume: 140843759
    },
    {
      date: "2021-01-27 16:00:00",
      open: 141.98,
      low: 141.85,
      high: 142.48,
      close: 142.16,
      volume: 111809608
    },
    {
      date: "2021-01-27 15:45:00",
      open: 141.5401,
      low: 140.5022,
      high: 141.615,
      close: 141.25,
      volume: 102483867
    },
    {
      date: "2021-01-27 15:30:00",
      open: 141.91,
      low: 141.47,
      high: 142.14,
      close: 141.5401,
      volume: 95548705
    },
    {
      date: "2021-01-27 15:15:00",
      open: 141.92,
      low: 141.49,
      high: 142.39,
      close: 141.91,
      volume: 91743369
    },
    {
      date: "2021-01-27 15:00:00",
      open: 142.55,
      low: 141.3,
      high: 142.69,
      close: 141.92,
      volume: 87544914
    },
    {
      date: "2021-01-27 14:45:00",
      open: 142.68,
      low: 142.0,
      high: 142.8,
      close: 142.55,
      volume: 82693731
    },
    {
      date: "2021-01-27 14:30:00",
      open: 143.9593,
      low: 142.75,
      high: 143.98,
      close: 142.9511,
      volume: 76743059
    },
    {
      date: "2021-01-27 14:15:00",
      open: 143.4697,
      low: 143.4697,
      high: 143.99,
      close: 143.9593,
      volume: 72702933
    },
    {
      date: "2021-01-27 14:00:00",
      open: 143.18,
      low: 143.0507,
      high: 143.63,
      close: 143.4697,
      volume: 69340604
    },
    {
      date: "2021-01-27 13:45:00",
      open: 143.2915,
      low: 143.13,
      high: 143.4099,
      close: 143.18,
      volume: 66462250
    },
    {
      date: "2021-01-27 13:30:00",
      open: 143.11,
      low: 143.02,
      high: 143.385,
      close: 143.2915,
      volume: 64427090
    },
    {
      date: "2021-01-27 13:15:00",
      open: 143.2821,
      low: 142.93,
      high: 143.4,
      close: 143.065,
      volume: 62350072
    },
    {
      date: "2021-01-27 13:00:00",
      open: 143.2299,
      low: 142.945,
      high: 143.2885,
      close: 143.2821,
      volume: 59268137
    },
    {
      date: "2021-01-27 12:45:00",
      open: 143.37,
      low: 142.759,
      high: 143.3901,
      close: 143.2299,
      volume: 57235263
    },
    {
      date: "2021-01-27 12:30:00",
      open: 142.7206,
      low: 142.7206,
      high: 143.4,
      close: 143.37,
      volume: 54457867
    },
    {
      date: "2021-01-27 12:15:00",
      open: 141.81,
      low: 141.81,
      high: 142.7693,
      close: 142.7206,
      volume: 50989243
    },
    {
      date: "2021-01-27 12:00:00",
      open: 142.38,
      low: 141.87,
      high: 142.44,
      close: 141.87,
      volume: 48137387
    },
    {
      date: "2021-01-27 11:45:00",
      open: 142.5916,
      low: 141.99,
      high: 142.8493,
      close: 142.38,
      volume: 44424562
    },
    {
      date: "2021-01-27 11:30:00",
      open: 143.12,
      low: 142.46,
      high: 143.26,
      close: 142.5916,
      volume: 40682741
    },
    {
      date: "2021-01-27 11:15:00",
      open: 143.3,
      low: 142.91,
      high: 143.36,
      close: 143.12,
      volume: 37991418
    },
    {
      date: "2021-01-27 11:00:00",
      open: 143.49,
      low: 143.26,
      high: 143.6215,
      close: 143.3,
      volume: 35344102
    },
    {
      date: "2021-01-27 10:45:00",
      open: 143.81,
      low: 142.91,
      high: 143.81,
      close: 143.5,
      volume: 31953327
    },
    {
      date: "2021-01-27 10:30:00",
      open: 143.3273,
      low: 143.06,
      high: 143.96,
      close: 143.81,
      volume: 28269152
    },
    {
      date: "2021-01-27 10:15:00",
      open: 142.9801,
      low: 142.83,
      high: 144.24,
      close: 143.3273,
      volume: 24189094
    },
    {
      date: "2021-01-27 10:00:00",
      open: 142.54,
      low: 141.77,
      high: 142.9801,
      close: 142.9801,
      volume: 18318054
    },
    {
      date: "2021-01-27 09:45:00",
      open: 143.16,
      low: 141.6347,
      high: 143.63,
      close: 142.54,
      volume: 12303669
    },
    {
      date: "2021-01-27 09:30:00",
      open: 143.16,
      low: 143.16,
      high: 143.16,
      close: 143.16,
      volume: 98390455
    },
    {
      date: "2021-01-26 16:00:00",
      open: 142.995,
      low: 142.9,
      high: 143.29,
      close: 143.29,
      volume: 86424881
    },
    {
      date: "2021-01-26 15:45:00",
      open: 143.105,
      low: 142.91,
      high: 143.195,
      close: 143.195,
      volume: 81268903
    },
    {
      date: "2021-01-26 15:30:00",
      open: 142.9599,
      low: 142.78,
      high: 143.105,
      close: 143.105,
      volume: 78324693
    },
    {
      date: "2021-01-26 15:15:00",
      open: 142.91,
      low: 142.8201,
      high: 143.065,
      close: 142.9599,
      volume: 76171020
    },
    {
      date: "2021-01-26 15:00:00",
      open: 143.01,
      low: 142.6899,
      high: 143.0231,
      close: 142.91,
      volume: 74525212
    },
    {
      date: "2021-01-26 14:45:00",
      open: 143.05,
      low: 142.87,
      high: 143.1,
      close: 143.01,
      volume: 72410233
    },
    {
      date: "2021-01-26 14:30:00",
      open: 143.2801,
      low: 142.8401,
      high: 143.31,
      close: 142.9499,
      volume: 70568405
    },
    {
      date: "2021-01-26 14:15:00",
      open: 142.9962,
      low: 142.79,
      high: 143.33,
      close: 143.2801,
      volume: 68255502
    },
    {
      date: "2021-01-26 14:00:00",
      open: 143.1,
      low: 142.7804,
      high: 143.1615,
      close: 142.9962,
      volume: 65712472
    },
    {
      date: "2021-01-26 13:45:00",
      open: 142.495,
      low: 142.495,
      high: 143.102,
      close: 143.1,
      volume: 63576955
    },
    {
      date: "2021-01-26 13:30:00",
      open: 142.22,
      low: 142.148,
      high: 142.5901,
      close: 142.495,
      volume: 60891762
    },
    {
      date: "2021-01-26 12:15:00",
      open: 142.08,
      low: 142.08,
      high: 142.23,
      close: 142.22,
      volume: 51597141
    },
    {
      date: "2021-01-26 12:00:00",
      open: 142.15,
      low: 141.87,
      high: 142.3,
      close: 141.87,
      volume: 49069162
    },
    {
      date: "2021-01-26 11:45:00",
      open: 142.2899,
      low: 142.15,
      high: 142.44,
      close: 142.15,
      volume: 46359440
    },
    {
      date: "2021-01-26 11:30:00",
      open: 142.279,
      low: 142.26,
      high: 142.67,
      close: 142.2899,
      volume: 44387856
    },
    {
      date: "2021-01-26 11:15:00",
      open: 142.5036,
      low: 142.279,
      high: 142.985,
      close: 142.279,
      volume: 41861566
    },
    {
      date: "2021-01-26 11:00:00",
      open: 142.43,
      low: 142.35,
      high: 142.59,
      close: 142.5036,
      volume: 37362848
    },
    {
      date: "2021-01-26 10:45:00",
      open: 142.1549,
      low: 141.94,
      high: 142.56,
      close: 142.11,
      volume: 33894432
    },
    {
      date: "2021-01-26 10:30:00",
      open: 142.35,
      low: 141.915,
      high: 142.67,
      close: 142.1549,
      volume: 30053711
    },
    {
      date: "2021-01-26 10:15:00",
      open: 143.02,
      low: 142.19,
      high: 143.205,
      close: 142.35,
      volume: 26021601
    },
    {
      date: "2021-01-26 10:00:00",
      open: 142.18,
      low: 141.4296,
      high: 143.1,
      close: 143.02,
      volume: 21341690
    },
    {
      date: "2021-01-26 09:45:00",
      open: 143.8201,
      low: 142.155,
      high: 143.94,
      close: 142.18,
      volume: 13522385
    },
    {
      date: "2021-01-26 09:30:00",
      open: 142.92,
      low: 142.92,
      high: 142.92,
      close: 142.92,
      volume: 157611713
    },
    {
      date: "2021-01-25 16:00:00",
      open: 142.53,
      low: 142.53,
      high: 143.125,
      close: 142.98,
      volume: 148703367
    },
    {
      date: "2021-01-25 15:45:00",
      open: 142.1018,
      low: 142.01,
      high: 142.53,
      close: 142.53,
      volume: 142839526
    },
    {
      date: "2021-01-25 15:30:00",
      open: 141.98,
      low: 141.7598,
      high: 142.3815,
      close: 142.1018,
      volume: 139414771
    },
    {
      date: "2021-01-25 15:15:00",
      open: 142.78,
      low: 141.98,
      high: 142.81,
      close: 141.98,
      volume: 136210068
    },
    {
      date: "2021-01-25 15:00:00",
      open: 142.83,
      low: 142.6801,
      high: 142.98,
      close: 142.78,
      volume: 132817991
    },
    {
      date: "2021-01-25 14:45:00",
      open: 142.6553,
      low: 142.495,
      high: 142.83,
      close: 142.83,
      volume: 130574480
    },
    {
      date: "2021-01-25 14:30:00",
      open: 142.21,
      low: 142.1321,
      high: 142.56,
      close: 142.56,
      volume: 128053133
    },
    {
      date: "2021-01-25 14:15:00",
      open: 142.7118,
      low: 141.87,
      high: 142.818,
      close: 142.21,
      volume: 126010807
    },
    {
      date: "2021-01-25 14:00:00",
      open: 142.575,
      low: 142.39,
      high: 143.11,
      close: 142.7118,
      volume: 123084146
    },
    {
      date: "2021-01-25 13:45:00",
      open: 142.93,
      low: 142.3,
      high: 143.071,
      close: 142.575,
      volume: 119955213
    },
    {
      date: "2021-01-25 13:30:00",
      open: 142.999,
      low: 142.721,
      high: 143.07,
      close: 142.93,
      volume: 116831669
    },
    {
      date: "2021-01-25 13:15:00",
      open: 142.46,
      low: 142.1601,
      high: 143.24,
      close: 143.24,
      volume: 113736483
    },
    {
      date: "2021-01-25 13:00:00",
      open: 141.9004,
      low: 141.8401,
      high: 142.79,
      close: 142.46,
      volume: 109766921
    },
    {
      date: "2021-01-25 12:45:00",
      open: 141.235,
      low: 141.05,
      high: 141.98,
      close: 141.9004,
      volume: 105644937
    },
    {
      date: "2021-01-25 12:30:00",
      open: 141.84,
      low: 140.94,
      high: 141.93,
      close: 141.235,
      volume: 102336962
    },
    {
      date: "2021-01-25 12:15:00",
      open: 142.67,
      low: 141.74,
      high: 142.78,
      close: 141.84,
      volume: 97496423
    },
    {
      date: "2021-01-25 12:00:00",
      open: 142.3399,
      low: 141.92,
      high: 142.73,
      close: 142.57,
      volume: 93347705
    },
    {
      date: "2021-01-25 11:45:00",
      open: 141.18,
      low: 141.18,
      high: 142.3399,
      close: 142.3399,
      volume: 88997806
    },
    {
      date: "2021-01-25 11:30:00",
      open: 141.2,
      low: 140.44,
      high: 141.885,
      close: 141.18,
      volume: 83345154
    },
    {
      date: "2021-01-25 11:15:00",
      open: 141.38,
      low: 136.65,
      high: 141.73,
      close: 141.2,
      volume: 75653555
    },
    {
      date: "2021-01-25 11:00:00",
      open: 143.55,
      low: 141.34,
      high: 143.5501,
      close: 141.38,
      volume: 59380119
    },
    {
      date: "2021-01-25 10:45:00",
      open: 144.19,
      low: 143.5507,
      high: 144.32,
      close: 143.9,
      volume: 51279988
    },
    {
      date: "2021-01-25 10:30:00",
      open: 144.32,
      low: 143.925,
      high: 144.71,
      close: 144.19,
      volume: 46278553
    },
    {
      date: "2021-01-25 10:15:00",
      open: 144.96,
      low: 144.11,
      high: 144.96,
      close: 144.32,
      volume: 40878745
    },
    {
      date: "2021-01-25 10:00:00",
      open: 144.42,
      low: 143.635,
      high: 144.96,
      close: 144.96,
      volume: 34347004
    },
    {
      date: "2021-01-25 09:45:00",
      open: 144.615,
      low: 144.16,
      high: 145.05,
      close: 144.42,
      volume: 21028884
    },
    {
      date: "2021-01-25 09:30:00",
      open: 139.07,
      low: 139.07,
      high: 139.07,
      close: 139.07,
      volume: 114459360
    },
    {
      date: "2021-01-22 16:00:00",
      open: 139.785,
      low: 139.155,
      high: 139.83,
      close: 139.1767,
      volume: 104075767
    },
    {
      date: "2021-01-22 15:45:00",
      open: 139.322,
      low: 139.2715,
      high: 139.79,
      close: 139.785,
      volume: 97312994
    },
    {
      date: "2021-01-22 15:30:00",
      open: 138.88,
      low: 138.88,
      high: 139.4092,
      close: 139.322,
      volume: 91212458
    },
    {
      date: "2021-01-22 15:15:00",
      open: 139.075,
      low: 138.67,
      high: 139.1393,
      close: 138.855,
      volume: 86498603
    },
    {
      date: "2021-01-22 15:00:00",
      open: 138.5292,
      low: 138.48,
      high: 139.1701,
      close: 139.075,
      volume: 82468702
    },
    {
      date: "2021-01-22 14:45:00",
      open: 138.43,
      low: 138.4001,
      high: 138.5799,
      close: 138.5292,
      volume: 78160314
    },
    {
      date: "2021-01-22 14:30:00",
      open: 138.229,
      low: 138.13,
      high: 138.475,
      close: 138.43,
      volume: 76030972
    },
    {
      date: "2021-01-22 14:15:00",
      open: 138.0024,
      low: 138.0024,
      high: 138.345,
      close: 138.229,
      volume: 73832871
    },
    {
      date: "2021-01-22 14:00:00",
      open: 138.231,
      low: 138.0431,
      high: 138.32,
      close: 138.0431,
      volume: 71266229
    },
    {
      date: "2021-01-22 13:45:00",
      open: 138.04,
      low: 137.88,
      high: 138.28,
      close: 138.231,
      volume: 69200082
    },
    {
      date: "2021-01-22 13:30:00",
      open: 137.95,
      low: 137.875,
      high: 138.17,
      close: 138.04,
      volume: 66517350
    },
    {
      date: "2021-01-22 13:15:00",
      open: 137.96,
      low: 137.75,
      high: 138.105,
      close: 137.95,
      volume: 64490775
    },
    {
      date: "2021-01-22 13:00:00",
      open: 137.9638,
      low: 137.8,
      high: 138.035,
      close: 137.96,
      volume: 62325535
    },
    {
      date: "2021-01-22 12:45:00",
      open: 138.0899,
      low: 137.72,
      high: 138.115,
      close: 137.9337,
      volume: 60079201
    },
    {
      date: "2021-01-22 12:30:00",
      open: 137.72,
      low: 137.72,
      high: 138.16,
      close: 138.0899,
      volume: 57023980
    },
    {
      date: "2021-01-22 09:45:00",
      open: 136.87,
      low: 135.08,
      high: 136.954,
      close: 136.8485,
      volume: 12645699
    }
  ];

export default StockData;

  