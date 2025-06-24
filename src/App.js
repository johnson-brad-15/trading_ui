import React, { useState, useEffect } from 'react';
import DataManager from './components/DataManager';
import StockData from './components/data';
import InstrumentOnDay from './components/InstrumentOnDay';
import InstrumentLevelView from './components/InstrumentLevelView';
// import FinChart from './components/chart';
import Sparkline from './components/sparkline'
import DockManager from './components/DockManager_';
import FinChart from './components/testchart';
import SplitContainer from './components/SplitContainer';
import EventLog from './components/EventLog';

import { InstrumentProvider, useInstrument } from './components/InstrumentContext';

function App() {
  // console.log("App");
  const [sharedData, setSharedData] = useState(null);

  const handleDataChange = (newData) => {
    setSharedData(newData);
  };

  return (
    <InstrumentProvider>
      <div style={{width:200, height:700}}>
        <DataManager url="ws://localhost:8765" onDataChange={handleDataChange} />
        <InstrumentOnDay style={{width:'100%', height:'30px'}} data={sharedData}/>
        {/* <StockData onDataChange={handleDataChange} /> */}
        {/* <DockManager sharedData={sharedData} /> */}
        {/* <div style={{height:500}}><FinChart sharedData={sharedData} /></div> */}
        <div style={{width:'100%', height:35}}><Sparkline sharedData={sharedData} /></div>
        {/* <div className="InstrumentLevelViewContainer" style={{width:200, height:500}}><InstrumentLevelView sharedData={sharedData}/></div> */}
        {/* <InstrumentLevelView initialWidth={200} sharedData={sharedData}/> */}
        <SplitContainer 
          id='ilv' 
          C1={<InstrumentLevelView initialWidth={200} sharedData={sharedData}/>}
          C2={<EventLog />}
        />
      </div>
    </InstrumentProvider>
  );
}

export default App;
