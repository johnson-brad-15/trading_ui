import React, { useState, useEffect, useRef } from 'react';
import Icon from '@mdi/react';
import { mdiWindowOpen, mdiClose, mdiWindowMinimize, mdiWindowMaximize } from '@mdi/js';
import Draggable from 'react-draggable';
import { Dock } from 'react-dock';
import MDIDocument from './MDIDocument';

const MDIContainer = () => {
    const [windows, setWindows] = useState([]);
    const [windowCounter, setWindowCounter] = useState(1);

    const createWindow = () => {
    setWindows([...windows, { id: windowCounter, title: `Window ${windowCounter}`, visible: true, x: 10, y: 10 }]);
    setWindowCounter(windowCounter + 1);
    };

    const closeWindow = (id) => {
    setWindows(windows.filter(window => window.id !== id));
    };

    const toggleMinimizeWindow = (id) => {
        setWindows(windows.map(window => window.id === id ? {...window, visible: !window.visible} : window));
    }

    const maximizeWindow = (id) => {
        setWindows(windows.map(window => window.id === id ? {...window, maximized: !window.maximized} : window));
    }

    const windowRefs = useRef([]);
    useEffect(() => {
        windowRefs.current = windowRefs.current.slice(0, windows.length);
    }, [windows]);

  return (
    <div className="mdi-container" style={{ position: 'relative', width: '100%', height: '500px', border: '1px solid #ccc' }}>
      <div className="toolbar">
        <button onClick={createWindow}>
          <Icon path={mdiWindowOpen} size={1} /> New Window
        </button>
      </div>
      {windows.map((window, index) => (
        window.visible && (
            <div key={window.id} className={`window ${window.maximized ? 'maximized' : ''}`} style={{ position: 'absolute', top: window.y, left: window.x, width: '200px', height: '150px', border: '1px solid blue' }} ref={windowRefs[index]}>
                <div className="foo">
                <Draggable nodeRef={windowRefs[index]}>
                    <div className="draggable-doc-div">
                        <div className="window-header">
                            {window.title}
                            <div className="window-controls">
                                <button onClick={() => toggleMinimizeWindow(window.id)}><Icon path={mdiWindowMinimize} size={0.7} /></button>
                                <button onClick={() => maximizeWindow(window.id)}><Icon path={mdiWindowMaximize} size={0.7} /></button>
                                <button onClick={() => closeWindow(window.id)}><Icon path={mdiClose} size={0.7} /></button>
                            </div>
                        </div>
                        <div className="window-content">
                            <MDIDocument />
                        </div>
                    </div>
                </Draggable>
                </div>
            </div>
        )
      ))}
    </div>
  );
};

export default MDIContainer;