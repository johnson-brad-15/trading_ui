import React, { useEffect, useRef } from 'react';

const SplitContainer = (props) => {
    // const [ isResizing, setIsResizing ] = useState(false);
    const dragRef = useRef(null);
    const c1 = useRef(null);
    const splitter = useRef(null);
    const c2 = useRef(null);

    const handleMouseOver = (e) => {
        splitter.current.style.cursor = 'row-resize';
    }

    const handleMouseOut = (e) => {
        splitter.current.style.cursor = 'default';
    }

    const handleMouseDown = (e) => {
        dragRef.current = e.clientY;
        document.body.style.userSelect = 'none'; // Disable text selection
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);  
        splitter.current.style.backgroundColor = "blue";      
    };

    const handleMouseMove = e => {
        if (!dragRef.current) return;
        const dragDiff = e.clientY - dragRef.current;
        const c1h = parseFloat(getComputedStyle(c1.current).height);
        c1.current.style.height = (c1h + dragDiff) + 'px';
        dragRef.current = e.clientY;
    };

    const handleMouseUp = (e) => {
        dragRef.current = null;
        document.body.style.userSelect = ''; // Re-enable text selection
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        splitter.current.style.backgroundColor = "black"; 
    }

    useEffect(() => {
        c1.current = document.getElementById(`${props.id}_c1`);
        splitter.current = document.getElementById(`${props.id}_splitter`);
        c2.current = document.getElementById(`${props.id}_c2`);
        splitter.current.addEventListener('mousedown', handleMouseDown, true);
        splitter.current.addEventListener('mouseover', handleMouseOver);
        splitter.current.addEventListener('mouseout', handleMouseOut);
    }, []);

    const style_container = {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: 0,
        margin: 0,
        border: 0,
        height: '410px',
        width: '100%'
    }
    const style_c1_container = {
        flex: 0,
        flexBasis: 'initial', /* Initial height */
        height: '359px',
        width: '100%',
        padding: 0,
        margin: 0,
        border: '1px solid black',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'dimgray',
        overflow: 'hidden'
    }
    const style_c1 = {
        flex: 'auto', 
        overflow: 'hidden',
        width: '100%'
    }
    const style_splitter = {
        flex: 0,
        flexBasis: 'auto',
        backgroundColor: "black",
        border: '1px solid black',
        width: '100%',
        height: '2px',
        padding: 0,
        margin: 0,
        border: 0
    }
    const style_c2_container = {
        flex: 1,
        display: 'flex',
        height: '50px',
        width: '100%',
        minHeight: '26px',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: 0,
        flexGrow: 1,
        margin: 0,
        border: '1px ridge black',
        backgroundColor: 'thistle'
    }
    const style_c2 = {
        flex: 1,
        height: 'auto',
        width: '100%',
        overflow: 'auto',
        padding: 0,
        margin: 0,
        border: 0,
        backgroundColor: 'white'
    }

    return (
        <div key={`${props.id}_container`} id={`${props.id}_container`} style={style_container}>
            <div key={`${props.id}_c1`} id={`${props.id}_c1`} style={style_c1_container}>
                <div id='c1_container' style={style_c1}>
                    {props.C1}
                </div>
            </div>
            <div key={`${props.id}_splitter`} id={`${props.id}_splitter`} style={style_splitter}></div>
            <div key={`${props.id}_c2`} id={`${props.id}_c2`} style={style_c2_container}>
                <div id='c2_container' style={style_c2}>
                    {props.C2}
                </div>
            </div>
        </div>
    )
};

export default SplitContainer;