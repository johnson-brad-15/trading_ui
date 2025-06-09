import React, { useState, useEffect, useRef } from 'react';
import { Profiler } from 'react';


function roundTo(num, places) {
    return +(Math.round(num + `e+${places}`)  + `e-${places}`);
}

const handleRender = (id, phase, actualDuration) => {
    //console.log(`[${phase}] Component: ${id} rendered in ${actualDuration}ms`);
};

const getPxString = (px) => { 
    try {
      let strPx = px.toFixed(2);
    }
    catch (e) {
    //   console.log(px, typeof(px));
    //   console.log(e);
    }
    return px.toFixed(2);
  }

const LadderTD_MyBids = React.memo(function LadderTD_Bid(props) {
    const level = props.level;
    const px = level.px;
    const qty = level.myBidQty;
    const socket = props.socket;
    const compId = props.compId;
    const dragBids = (event) => { 
        event.dataTransfer.setData('application/json', JSON.stringify(level.myBids));
        event.dataTransfer.effectAllowed = 'move'; 
        // event.dataTransfer.items.add("JSON.stringify(level.myBids)", 'text/plain');
        console.log('Dragging from ', px);
    }
    const handleDragOver = (event) => {
        event.preventDefault();
    }
    const dropBids = (event) => {
        event.preventDefault();
        const droppedData = event.dataTransfer.getData('application/json');
        const items = JSON.parse(droppedData);
        console.log('Dropped Bids:', items, ' at ', px);
        Object.values(items).map((order, index) => (
            socket.send(JSON.stringify({35:'G',49:compId,11:order.id,44:px}))
        ));
    }
    const handleRightClick = (event) => {
        console.log('Cancelled bids at:', px);
        event.preventDefault();
        Object.values(level.myBids).map((order, index) => (
            socket.send(JSON.stringify({35:'F',49:compId,11:order.id}))
          ));
    };
    return (
        <Profiler id={`TD:${px}.myBid`} onRender={handleRender}>
            <div 
                onContextMenu={handleRightClick}
                draggable="true"
                onDragStart={dragBids} 
                onDragOver={handleDragOver} 
                onDrop={dropBids}
                key={`myBid:${px}`} 
                className={`myBid${qty != 0 ? 'Qty' : ''}`}>
                {qty === 0 ? '' : qty}
            </div>
        </Profiler>
    )
}, (prevProps, nextProps) => {
    // Custom comparison function to determine if re-render is needed
    return (
        prevProps.level.px === nextProps.level.px &&
        prevProps.level.myBidQty === nextProps.level.myBidQty &&
        prevProps.compId === nextProps.compId
    );
}); 

const LadderTD_Bid = React.memo(function LadderTD_Bid(props) {
    const px = props.px;
    const qty = props.qty;
    const socket = props.socket;
    const compId = props.compId;
    const mdBidClick = () => { console.log('Clicked md bids:', px, compId); socket.send(JSON.stringify({49:compId,35:'D',38:10,44:px}))};
    return (
        <Profiler id={`TD:${px}.Bid`} onRender={handleRender}>
            <div key={`Bid:${px}`} onClick={() => mdBidClick()} className={`mdBid${qty != null ? 'Qty' : ''}`}>{qty}</div>
        </Profiler>
    )
});

const LadderTD_Px = React.memo(function LadderTD_Px(props) {
    const px = props.level.px;
    const isLast = props.level.last;
    const isTraded = props.level.traded;
    const volPct = props.level.volPct;
    if (isTraded && !isLast) {
        return (
                <div key={`Px:${px}`} id={`Px:${px}`} className={`priceRow Px Traded`}>
                    <div className="content">{getPxString(px)}</div>
                    <div className="volume">
                        <div style={{ backgroundColor: 'paleGreen', height: '1px', width: `${volPct}%`}}></div>
                        <div className="empty" style={{height: '1px'}}></div>
                    </div>
                </div>
        )
    }
    return (
        // <Profiler id={`TD:${px}.Px`} onRender={handleRender}>
            <div key={`Px:${px}`} id={`Px:${px}`} className={`priceRow Px ${isLast ? 'Last' : (isTraded ? 'Traded' : '')}`}>
                {/* <span style={{ backgroundColor: 'black', width: '1px', height: '100%' }}></span> */}
                <span>{getPxString(px)}</span>
                {/* <span style={{ backgroundColor: 'black', width: '1px', height: '100%' }}></span> */}
            </div>
        // </Profiler>
    )
});

const LadderTD_Ask = React.memo(function LadderTD_Ask(props) {
    const px = props.px;
    const qty = props.qty;
    const socket = props.socket;
    const compId = props.compId;
    const mdAskClick = () => { console.log('Clicked md asks:', px); socket.send(JSON.stringify({49:compId,35:'D',38:-10,44:px}))};
    return (
        <Profiler id={`TD:${px}.Ask`} onRender={handleRender}>
            <div key={`Ask:${px}`} onClick={() => mdAskClick()} className={`mdAsk${qty != null ? 'Qty' : ''}`}>{qty}</div>
        </Profiler>
    )
});

const LadderTD_MyAsks = React.memo(function LadderTD_Ask(props) {
    const level = props.level;
    const px = level.px;
    const qty = level.myAskQty;
    const socket = props.socket;
    const compId = props.compId;
    const dragAsks = (event) => { 
        event.dataTransfer.setData('application/json', JSON.stringify(level.myAsks));
        event.dataTransfer.effectAllowed = 'move'; 
        // event.dataTransfer.items.add("JSON.stringify(level.myBids)", 'text/plain');
        console.log('Dragging from ', px);
    }
    const handleDragOver = (event) => {
        event.preventDefault();
    }
    const dropAsks = (event) => {
        event.preventDefault();
        const droppedData = event.dataTransfer.getData('application/json');
        const items = JSON.parse(droppedData);
        Object.values(items).map((order, index) => (
            socket.send(JSON.stringify({35:'G',49:compId,11:order.id,44:px}))
        ));
    }
    const handleRightClick = (event) => {
        event.preventDefault();
        Object.values(level.myAsks).map((order, index) => (
            socket.send(JSON.stringify({35:'F',49:compId,11:order.id}))
          ));
    };
    return (
        <Profiler id={`TD:${px}.myAsk`} onRender={handleRender}>
            <div 
                onContextMenu={handleRightClick}
                draggable="true"
                onDragStart={dragAsks} 
                onDragOver={handleDragOver} 
                onDrop={dropAsks} 
                key={`myAsk:${px}`} 
                className={`myAsk${qty != 0 ? 'Qty' : ''}`}
            >
            {qty === 0 ? '' : qty}
        </div>
        </Profiler>
    )
});

const LadderTR = React.memo(function LadderTR(props) {
    const level = props.level;
    const socket = props.socket;
    const compId = props.compId;
    return (
        <Profiler id={`TR:${level.px}`} onRender={handleRender}>
            <div className="LadderRow" key={`Row:${level.px}`} >
                <LadderTD_MyBids level={level} socket={socket} compId={compId}/>
                <LadderTD_Bid px={level.px} qty={level.bid} socket={socket} compId={compId}/>
                <LadderTD_Px level={level}/>
                <LadderTD_Ask px={level.px} qty={level.ask} socket={socket} compId={compId}/>
                <LadderTD_MyAsks level={level} socket={socket} compId={compId}/>
            </div>
        </Profiler>
    )
}, (prevProps, nextProps) => {
    // Custom comparison function to determine if re-render is needed
    return (
        prevProps.level.px === nextProps.level.px &&
        prevProps.level.bid === nextProps.level.bid &&
        prevProps.level.ask === nextProps.level.ask &&
        prevProps.level.last === nextProps.level.last &&
        prevProps.level.traded === nextProps.level.traded &&
        prevProps.lastTradePrice === nextProps.lastTradePrice &&
        prevProps.level.volPct === nextProps.level.volPct &&
        prevProps.compId === nextProps.compId &&
        prevProps.level.myBidQty === nextProps.level.myBidQty &&
        prevProps.level.myAskQty === nextProps.level.myAskQty
    );
});

function Ladder(props) {
    if (props == null 
        || props == undefined 
        || !('sharedData' in props) 
        || props.sharedData == null 
        || props.sharedData == undefined)
    {
        console.log("Null/undefined data");
        return (<div>No Data</div>);
    }

    let data = props.sharedData;
    let levels = data.levels;

    // console.log(data.lastTradePrice, levels[data.lastTradePrice].traded, data.lastTradePrice in data.tradedPxs);
    // console.log(data.compId);
    // console.log(levels);

    return (
        <Profiler id="Table" onRender={handleRender}>
            <div key="LadderInner" className="ladder">
                {Object.keys(levels).sort((a, b) => b - a).map((px) => (
                    <LadderTR 
                        key={`Row:${px}`}
                        level={levels[px]} 
                        traded={levels[px].traded}
                        lastTradePrice={data.lastTradePrice}
                        socket={data.socket} 
                        compId={data.compId}
                    />
                ))}
            </div>
        </Profiler>
    );
}

export default Ladder;