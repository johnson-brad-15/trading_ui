import React, { useState, useEffect, useRef } from 'react';
import { Sparklines, SparklinesLine, SparklinesArea, SparklinesBars, SparklinesSpots } from 'react-sparklines';
import '../App.css';
import { useInstrument } from './InstrumentContext';

function dataExists(props) {
    return (props != null 
        && props != undefined 
        && ('sharedData' in props) 
        && props.sharedData != null 
        && props.sharedData != undefined);
}

let lastDataSize = 0;

function Sparkline(props) {
    const { data: instrument } = useInstrument();
    const [data, setData] = useState([]);
    const [sparkData, setSparkData] = useState([]);
    const [lastData, setLastData] = useState(null);

    useEffect(() => {
        if (dataExists(props)) {
            setData(props.sharedData);
        }
    },);

    useEffect(() => {
        if  (dataExists(props) && data.sparkData.length > lastDataSize) {
            lastDataSize = data.sparkData.length;
            setSparkData([...sparkData, data.sparkData[data.sparkData.length-1]]); 
            setLastData(data.sparkData[data.sparkData.length-1]);
        }
    },[data]);

    const style = {
        backgroundColor: "rgb(95, 95, 95)",
        width: "100%",
        height:"100%",
        borderTop: 0,
        borderLeft: "1px solid black",
        borderRight: "1px solid black",
    };

    // if (! dataExists(props) || !instrument)
    // {
    //     console.log("Sparkline: Null/undefined data");
    //     return (<div className='dkGreyBg' style={style}></div>);
    // }

    const openingPx = instrument ? instrument.openingPx : lastData;

    return (
        <div className='dkGreyBg' style={style}>
            <Sparklines data={sparkData} limit={50} width={100} height={20} margin={5}>
                <SparklinesLine 
                    style={{ strokeWidth: 0.5, stroke: (lastData == openingPx ? "#FFFFFF" : lastData > openingPx ? "#90ff81" : "#ff6767"), fill: "none"}} 
                    // style={{ strokeWidth: 0.5, fill: (lastData == instrumentData.openingPx ? "#FFFFFF" : lastData > instrumentData.openingPx ? "#90ff81" : "#ff6767"), stroke: "white"}} 
                />  
                <SparklinesSpots size={0}/>
            </Sparklines>
        </div>
    );
}

export default Sparkline;