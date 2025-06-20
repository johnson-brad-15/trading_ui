import React, { useState, useEffect, useRef } from 'react';
import InstrumentLevel from './InstrumentLevel';
import { roundTo, getPxString, handleRender } from '../utils/utils'
import { Profiler } from 'react';
import { useInstrument } from './InstrumentContext';

function InstrumentLevelView(props) {
    const { data: instrument } = useInstrument();

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

    const containerStyle = {
        overflow: "auto",
        height: "300px"
    }

    return (
        haveValidData() ?
        <Profiler id="Table" onRender={handleRender}>
            <div style={containerStyle}>
                <div key="InstrumentLevelView" className="InstrumentLevelView" >
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