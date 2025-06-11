import {
    DockviewReact,
    DockviewReadyEvent,
    IDockviewPanelProps,
} from 'dockview';
import '../../node_modules/dockview-core/dist/styles/dockview.css';
import React from 'react';
import InstrumentLevel from './InstrumentLevel'

function DockManager(props) {

    const Default = (props) => {
        return <div>{props.api.title}</div>;
    };
    
    const PriceView = (props) => {
        return <InstrumentLevel sharedData={props.sharedData} />;
    };
    
    const components = {
        default: Default,
        priceView: PriceView
    };

    const onReady = (event) => {
        event.api.addPanel({
            id: 'panel_1',
            component: 'default',
        });

        event.api.addPanel({
            id: 'panel_2',
            component: 'priceView',
            position: {
                direction: 'right',
                referencePanel: 'panel_1',
            },
        });

        event.api.addPanel({
            id: 'panel_3',
            component: 'default',
            position: {
                direction: 'below',
                referencePanel: 'panel_1',
            },
        });
        event.api.addPanel({
            id: 'panel_4',
            component: 'default',
        });
        event.api.addPanel({
            id: 'panel_5',
            component: 'default',
        });
    };

    return (
        <DockviewReact
            className={'dockview-theme-abyss'}
            onReady={onReady}
            components={components}
        />
    );
};

export default DockManager;