export const getPxString = (px, dec=2, showPlus=false) => { 
    try {
        let strPx = px.toFixed(dec);
        if (showPlus)
            strPx = (px >= 0 ? '+' : '') + strPx;
        return strPx
    }
    catch (e) {
        console.log(e)
    }
    return '';
}

export const getMid = (bids, asks, decimals) => {
    if ((bids && bids.length) && (asks && asks.length)) {
        return roundTo((Math.max(...bids) + Math.min(...asks)) / 2.0, decimals);
    }
    else if (bids && bids.length) {
        return roundTo(Math.max(...bids), decimals);
    }
    else {
        return roundTo(Math.min(...asks), decimals);
    }
}
  
export const roundTo = (num, places) => {
    return +(Math.round(num + `e+${places}`)  + `e-${places}`);
}

export const handleRender = (id, phase, actualDuration) => {
    // console.log(`[${phase}] Component: ${id} rendered in ${actualDuration}ms`);
};

export const AreArraysIndexEqual = (a1, a2) => {
    return a1.every((item, index) => item === a2[index]);
}