import { useState, createContext, useContext } from "react"

export const InstrumentContext = createContext(undefined);

export const InstrumentProvider = ({children}) => {
    const [instrumentData, setInstrumentData] = useState(null)

    const updateInstrumentData = (data) => {
        setInstrumentData({ ...instrumentData, ...data});
    }

    return <InstrumentContext.Provider value={{data: instrumentData, update: updateInstrumentData}}>
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