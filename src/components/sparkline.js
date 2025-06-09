import React, { useState, useEffect, useRef } from 'react';
import { Sparklines, SparklinesLine, SparklinesBars, SparklinesSpots } from 'react-sparklines';

function dataExists(props) {
    return (props != null 
        && props != undefined 
        && ('sharedData' in props) 
        && props.sharedData != null 
        && props.sharedData != undefined);
}

let lastDataSize = 0;

function Sparkline(props) {
    const [data, setData] = useState([]);
    const [sparkData, setSparkData] = useState([]);

    useEffect(() => {
        if (dataExists(props)) {
            // console.log("Updating data");
            setData(props.sharedData);
        }
    },);

    useEffect(() => {
        if  (dataExists(props) && data.sparkData.length > lastDataSize) {
            // console.log("Updating sparkData");
            lastDataSize = data.sparkData.length;
            setSparkData([...sparkData, data.sparkData[data.sparkData.length-1]]); 
            // console.log(sparkData);
        }
    },[data]);

    if (! dataExists(props))
    {
        console.log("Null/undefined data");
        return (<div>No Data</div>);
    }
    // setSparkData([...sparkData, props.sharedData.sparkData[props.sharedData.sparkData.length-1]]); 

    return (
        <Sparklines data={sparkData} limit={50} width={100} height={20} margin={5}>
            <SparklinesBars style={{ fill: "#41c3f9", fillOpacity: ".25" }} />
            <SparklinesLine style={{ stroke: "#41c3f9", fill: "none" }} />
            <SparklinesSpots />
        </Sparklines>
    );
}

export default Sparkline;