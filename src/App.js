import React, { useState } from 'react';
import DataManager from './components/DataManager';
import StockData from './components/data';
import Test from './components/test';
import Ladder from './components/InstrumentLevelView';
// import FinChart from './components/chart';
import Sparkline from './components/sparkline'
import DockManager from './components/DockManager_';
import FinChart from './components/testchart';

function App() {
  // console.log("App");
  const [sharedData, setSharedData] = useState(null);

  const handleDataChange = (newData) => {
    setSharedData(newData);
  };

  return (
    <div style={{height:500}}>
      <DataManager url="ws://localhost:8765" onDataChange={handleDataChange} />
      {/* <StockData onDataChange={handleDataChange} /> */}
      {/* <DockManager sharedData={sharedData} /> */}
      {/* <div style={{height:500}}><FinChart sharedData={sharedData} /></div> */}
      {/* <div style={{width:150, height:20}}><Sparkline sharedData={sharedData} /></div> */}
      <div style={{width:200, height:500}}><Ladder sharedData={sharedData}/></div>
    </div>
  );
}

export default App;
