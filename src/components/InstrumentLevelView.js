import React, { useState, useEffect, useRef } from 'react';
import InstrumentLevel from './InstrumentLevel';
import { roundTo, getPxString, handleRender } from '../utils/utils'
import { Profiler } from 'react';
import { useInstrument } from './InstrumentContext';
import Splitter from './SplitContainer';

function InstrumentLevelView(props) {
    const { data: instrument } = useInstrument();
    const rowCountRef = useRef(null);
    const highLevelRef = useRef(null);
    const ilvcRef = useRef(null);
    const ilvRef = useRef(null);
    const scrollYRef = useRef(0);

    const haveValidData = () => {
        return (
            instrument
            && props != null 
            && props != undefined 
            && 'sharedData' in props
            && props.sharedData != null 
            && props.sharedData != undefined
        )
    }

    useEffect(() => {
        adjustScroll();
    },);

    const handleScroll = (e) => {
        if (ilvcRef.current) {
            scrollYRef.current = ilvcRef.current.scrollTop;
        }
    };

    const adjustScroll = () => {
        if (haveValidData()) {
            if (rowCountRef.current != null) {
                if (Object.keys(props.sharedData.levels).length > rowCountRef.current) {
                    const newRowCount = Object.keys(props.sharedData.levels).filter(px => px > highLevelRef.current).length;
                    const h1 = parseFloat(getComputedStyle(ilvRef.current).height);
                    const rowHeight = 17.5; //h1 / rowCountRef.current;
                    ilvcRef.current.scrollTop = scrollYRef.current + (newRowCount * rowHeight);
                }
            }
            rowCountRef.current = Object.keys(props.sharedData.levels).length;
            highLevelRef.current = Object.keys(props.sharedData.levels).sort((a, b) => b - a)[0];
        }
    };

    const containerStyle = {
        overflow: "auto",
        height: "100%",
        widrth: '100%',
        backgroundColor: "dimgray",
        margin: 0,
        padding: 0
    }

    return (
        haveValidData() ?
        <Profiler id="Table" onRender={handleRender}>
            <div className='ilv_container hide-scrollbar' ref={ilvcRef} style={containerStyle} onScroll={handleScroll}>
                <div key="InstrumentLevelView" className="InstrumentLevelView" ref={ilvRef}>
                    {Object.keys(props.sharedData.levels).sort((a, b) => b - a).map((px) => (
                        <InstrumentLevel 
                            key={`Row:${px}`}
                            level={props.sharedData.levels[px]} 
                            traded={props.sharedData.levels[px].traded}
                            lastTradePrice={props.sharedData.lastTradePrice}
                        />
                    ))}
                </div>
            </div>
        </Profiler> :
        <div>Waiting for data</div>
    );
}

export default InstrumentLevelView;