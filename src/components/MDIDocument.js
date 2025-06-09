import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
    
function MDIDocument({ title, content, onClose }) {
    const docRef = useRef(null);
    return (
        <div>
        <Draggable nodeRef={docRef}>
            <div className="mdi-document" ref={docRef}>
                MDIDocument
            </div>
        </Draggable>
        </div>
    );
}

export default MDIDocument;