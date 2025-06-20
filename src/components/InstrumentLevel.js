import React, { useState, useEffect, useRef } from 'react';
import { Profiler } from 'react';
import { roundTo, getPxString, handleRender, AreArraysIndexEqual } from '../utils/utils'
import { useInstrument } from './InstrumentContext';

const InstrumentLevel_MyBids = React.memo(function InstrumentLevel_MyBids(props) {
    const { data: instrument } = useInstrument();
    const level = props.level;
    const px = level.px;
    const qty = level.myBidQty;
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
            instrument.wsSend({35:'G',49:instrument.clientId,11:order.id,44:px})
        ));
    }
    const handleRightClick = (event) => {
        console.log('Cancelled bids at:', px);
        event.preventDefault();
        Object.values(level.myBids).map((order, index) => (
            instrument.wsSend({35:'F',49:instrument.clientId,11:order.id})
          ));
    };
    return (
        // <Profiler id={`TD:${px}.myBid`} onRender={handleRender}>
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
        // </Profiler>
    )
}, (prevProps, nextProps) => { // Is re-render unneeded
    return (
        prevProps.level.px == nextProps.level.px &&
        prevProps.level.myBidQty == nextProps.level.myBidQty
    )
    // return AreArraysIndexEqual([...Object.values(prevProps)], [...Object.values(nextProps)]);
});

const InstrumentLevel_Bid = React.memo(function InstrumentLevel_Bid(props) {
    const { data: instrument } = useInstrument();
    const px = props.px;
    const qty = props.qty;
    const mdBidClick = () => { console.log('Clicked md bids:', px, instrument.clientId, instrument.wsSend); instrument.wsSend({49:instrument.clientId,35:'D',38:10,44:px})};
    return (
        // <Profiler id={`TD:${px}.Bid`} onRender={handleRender}>
            <div key={`Bid:${px}`} onClick={() => mdBidClick()} className={`mdBid${qty != null ? 'Qty' : ''}`}>{qty}</div>
        // </Profiler>
    )
}, (prevProps, nextProps) => { // Is re-render unneeded
    return AreArraysIndexEqual([...Object.values(prevProps)], [...Object.values(nextProps)]);
});

const InstrumentLevel_Px = React.memo(function InstrumentLevel_Px(props) {
    const { data: instrument } = useInstrument();
    const px = props.level.px;
    const isLast = props.level.last;
    const isTraded = props.level.traded;
    const volPct = props.level.volPct;
    if (isTraded && !isLast) {
        return (
                <div key={`Px:${px}`} id={`Px:${px}`} className={`priceRow Px Traded`}>
                    <div className="content">{getPxString(px, instrument.decimals)}</div>
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
                <span>{getPxString(px, instrument.decimals)}</span>
            </div>
        // </Profiler>
    )
}, (prevProps, nextProps) => { // Is re-render unneeded
    const p1 = [prevProps.level.px,prevProps.level.last,prevProps.level.traded,prevProps.level.volPct];
    const p2 = [nextProps.level.px,nextProps.level.last,nextProps.level.traded,nextProps.level.volPct];
    return AreArraysIndexEqual(p1, p2) && !nextProps.level.traded;
});

const InstrumentLevel_Ask = React.memo(function InstrumentLevel_Ask(props) {
    const { data: instrument } = useInstrument();
    const px = props.px;
    const qty = props.qty;
    const mdAskClick = () => { console.log('Clicked md asks:', px); instrument.wsSend({49:instrument.clientId,35:'D',38:-10,44:px})};
    return (
        // <Profiler id={`TD:${px}.Ask`} onRender={handleRender}>
            <div key={`Ask:${px}`} onClick={() => mdAskClick()} className={`mdAsk${qty != null ? 'Qty' : ''}`}>{qty}</div>
        // </Profiler>
    )
}, (prevProps, nextProps) => { // Is re-render unneeded
    return AreArraysIndexEqual([...Object.values(prevProps)], [...Object.values(nextProps)]);
});

const InstrumentLevel_MyAsks = React.memo(function InstrumentLevel_MyAsks(props) {
    const { data: instrument } = useInstrument();
    const level = props.level;
    const px = level.px;
    const qty = level.myAskQty;
    const dragAsks = (event) => { 
        event.dataTransfer.setData('application/json', JSON.stringify(level.myAsks));
        event.dataTransfer.effectAllowed = 'move'; 
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
            instrument.wsSend({35:'G',49:instrument.clientId,11:order.id,44:px})
        ));
    }
    const handleRightClick = (event) => {
        event.preventDefault();
        Object.values(level.myAsks).map((order, index) => (
            instrument.wsSend({35:'F',49:instrument.clientId,11:order.id})
          ));
    };
    return (
        // <Profiler id={`TD:${px}.myAsk`} onRender={handleRender}>
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
        // </Profiler>
    )
}, (prevProps, nextProps) => { // Is re-render unneeded
    return AreArraysIndexEqual([...Object.values(prevProps)], [...Object.values(nextProps)]);
});

const InstrumentLevel = React.memo(function InstrumentLevel(props) {
    const level = props.level;
    return (
        // <Profiler id={`TR:${level.px}`} onRender={handleRender}>
            <div className="LadderRow" key={`Row:${level.px}`} >
                <InstrumentLevel_MyBids level={level}/>
                <InstrumentLevel_Bid px={level.px} qty={level.bid}/>
                <InstrumentLevel_Px level={level}/>
                <InstrumentLevel_Ask px={level.px} qty={level.ask}/>
                <InstrumentLevel_MyAsks level={level}/>
            </div>
        // </Profiler>
    )
});

export default InstrumentLevel;