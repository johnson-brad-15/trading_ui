import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import DockManager from './components/DockManager';
import './index.css';
import Ladder from './components/ladder';
import App from './App.js'



console.log('Starting React application');
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  //<React.StrictMode>
    <App />
  //</React.StrictMode>
);