import React, { useState } from 'react';
import StockData from './components/data';
import Test from './components/test';
import Ladder from './components/ladder';
// import FinChart from './components/chart';
import Sparkline from './components/sparkline'
import DockManager from './components/DockManager_';
import FinChart from './components/testchart';

function App() {
  const [sharedData, setSharedData] = useState(null);

  const handleDataChange = (newData) => {
    // console.log("Setting shared data", newData);
    setSharedData(newData);
  };

  // console.log({sharedData})

  return (
    <div style={{height:500}}>
      <StockData onDataChange={handleDataChange} />
      {/* <DockManager sharedData={sharedData} /> */}
      {/* <div style={{height:500}}><FinChart sharedData={sharedData} /></div> */}
      {/* <div style={{width:150, height:20}}><Sparkline sharedData={sharedData} /></div> */}
      <div style={{width:200, height:500}}><Ladder sharedData={sharedData}/></div>
    </div>
  );
}

export default App;
