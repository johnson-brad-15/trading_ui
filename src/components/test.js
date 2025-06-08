import React, { useState, useEffect, useRef } from 'react';

function Test(props) {
    console.log(`test: ${props}`);
    let data = props['sharedData'];
    if (data == null || data == undefined)
        return (
            <div>No data</div>
        );
    else
        return (
            <div>Last Date: {data.lastDate.toString()}</div>
        );
}

export default Test;