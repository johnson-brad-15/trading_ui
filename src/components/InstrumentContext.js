import { useState, useRef, createContext, useContext } from "react"

export const InstrumentContext = createContext(undefined);

export const InstrumentProvider = ({children}) => {
    const [instrumentData, setInstrumentData] = useState(null)
    const eventCallbacks = useRef([]).current;

    const updateInstrumentData = (data) => {
        setInstrumentData({ ...instrumentData, ...data});
    }

    const addEventCallback = (cb) => {
        eventCallbacks.push(cb);
    }

    return <InstrumentContext.Provider value={{data: instrumentData, 
                                                update: updateInstrumentData, 
                                                callbacks: eventCallbacks, 
                                                addCallback: addEventCallback}}>
        {children}
    </InstrumentContext.Provider>
};

export const useInstrument = () => {
    const context = useContext(InstrumentContext);
    if (context === undefined) {
        throw new Error('useInstrument must be used within an InstrumentProvider');
    }
    return context;
};