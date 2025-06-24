import React, { useEffect, useState, useRef } from 'react';
import { useInstrument } from './InstrumentContext';
import './EventLog.css';

const EventLog = (props) => {
    const { addCallback: addCallback } = useInstrument();
    const [log, setLog ] = useState([]);
    const logRef = useRef(log);

    useEffect(() => {
        logRef.current = log;
    }, [log]);

    const handleEvent = (msg) => {
        const now = new Date(msg[52]);
        const strTime = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false, 
            fractionalSecondDigits: 3 
          });
        switch (msg[35]) {
            case('A'):// logon
                setLog([...logRef.current, {timestamp: strTime, type: 'logon', msg: "Logon successful"}]);
                break;
            case(8):
            switch (msg[39]) {
                case(0): //New
                    setLog([...logRef.current, {timestamp: strTime, type: 'new', msg: `NEW: ${msg[54] === 1 ? 'Buy' : 'Sell'} ${msg[38]} @ ${msg[44]}`}]);
                    break;
                case(1):
                case(2): 
                    setLog([...logRef.current, {timestamp: strTime, type: 'fill', msg: `FILL:  ${msg[54] === 1 ? 'Buy' : 'Sell'} ${msg[38]} @ ${msg[44]}`}]);
                    break;
                case(4): //Cancel
                    setLog([...logRef.current, {timestamp: strTime, type: 'cancel', msg: `CANCEL ${msg[54] === 1 ? 'Buy' : 'Sell'} ${msg[38]} @ ${msg[44]}`}]);
                    break;
                case(5): //Modify
                    setLog([...logRef.current, {timestamp: strTime, type: 'modify', msg: `MODIFY ${msg[54] === 1 ? 'Buy' : 'Sell'} ${msg[38]} @ ${msg[44]}`}]);
                    break;
            }
        }
    }

    useEffect(() => {
        addCallback(handleEvent);
    }, [])

    const eventLogContainerStyle = {
        backgroundColor: 'white',
        flex: 1,
        overflow: 'auto'
    }

    const eventLogStyle = {
        backgroundColor: 'white'
    }

    return (
        
        <div id='eventLog_container' style={eventLogContainerStyle}>
            {log.map((entry, index) => (
                <div key={index} className={`entry ${entry.type}`}>
                    {entry.timestamp}:: {entry.msg} 
                </div>
            ))}
        </div>
    )
}

export default EventLog;