import React, { useState, useEffect, useRef, useCallback } from 'react';
import { themeAbyss } from "dockview";
import '../../node_modules/dockview-core/dist/styles/dockview.css';
import { DockviewReact, DockviewReadyEvent, IDockviewPanelProps } from 'dockview';
import Ladder from './InstrumentLevelView.js';
import FinChart from './testchart.js';
import Sparkline from './sparkline'

function DockManager(props) {
    // console.log("DockManager");
    const dockApiRef = useRef(null);
    const [dockApi, setDockApi] = useState(null); // Store the API

    useEffect(() => {
        console.log("dockApi set");
        dockApiRef.current = dockApi;
      }, [dockApi]);

    useEffect(() => {
        if (!(dockApiRef.current === null)) {
            dockApiRef.current.getPanel('ladderPanel').api.updateParameters({sharedData: props.sharedData});
            dockApiRef.current.getPanel('sparkPanel').api.updateParameters({sharedData: props.sharedData});
            dockApiRef.current.getPanel('chartPanel').api.updateParameters({sharedData: props.sharedData, height:dockApiRef.current.getPanel('chartPanel').api.height});
        }
    },);

    const onReady = (event) => {
        console.log("DockManager");

        setDockApi(event.api);

        event.api.addPanel({
            id: 'chartPanel',
            title: 'Chart',
            component: 'chart',
            position: {
                direction: 'within',
                height: '300px',
            },
            params: {
                sharedData: props.sharedData,
                height: 600
              },
        });

        event.api.addPanel({
            id: 'ladderPanel',
            title: 'PriceView',
            component: 'priceView',
            initialWidth: 150,
            params: {
                sharedData: props.sharedData,
              },
            position: {
                width: '150px',
                direction: 'left',
                referencePanel: 'chartPanel',
            },
        });

        event.api.addPanel({
            id: 'sparkPanel',
            title: 'Spark',
            component: 'sparkLine',
            initialHeight: 50,
            params: {
                sharedData: props.sharedData,
            },
            position: {
                direction: 'above',
                referencePanel: 'ladderPanel',
            },
        });

        event.api.addPanel({
            id: 'panel1',
            title: 'Trades',
            component: 'default',
            // initialHeight: 50,
            position: {
                direction: 'below',
                referencePanel: 'chartPanel',
            },
        });
    }

    const Default = (props) => {
        return <div>{props.api.title}</div>;
    };

    const PriceView = (priceViewProps) => {
        return (
            <Ladder sharedData={priceViewProps.params.sharedData}/>
        );
    }; 

    const SparkLine = (sparkProps) => {
        return (
            <div style={{width:'100%', height:'100%'}}><Sparkline sharedData={sparkProps.params.sharedData}/></div>
        );
    };

    const Chart = (chartProps) => {
        return (
            <div style={{height:"100%"}}><FinChart sharedData={chartProps.params.sharedData} height={chartProps.params.height}/></div>
        );
    };

    const components = {
        default: Default,
        priceView: PriceView, 
        sparkLine: SparkLine, 
        chart: Chart
    };

    return (
        <div style={{height: 600}}>
            <DockviewReact
                className={'dockview-theme-abyss'}
                onReady={onReady}
                // ref={dockviewRef}
                components={ components }
            />
        </div>
    );
}

export default DockManager;