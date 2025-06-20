import React, { useState, useEffect } from 'react';
import { useInstrument } from './InstrumentContext';
import '../App.css';
import './InstrumentOnDay.css';
import { roundTo, getPxString } from '../utils/utils'

function InstrumentOnDay(props) {
  const { data: instrument } = useInstrument();

  if (!instrument) {
    return <div>Loading instrument data...</div>;
  }

  return (
    <div className="instrumentOnDay dkGreyBg">
      <div className="row-one">
        <div className="column-one">
          <p className='symbol'>{instrument.symbol}</p>
        </div>
        <div className="column-two">
          <p className='px'>{props.data.mid ? getPxString(props.data.mid, instrument.decimals) : '--'}</p>
        </div>
        <div className="column-three">
          <div className='currency'>{instrument.currency}</div>
        </div>
      </div>
      <div className="row-two">
        <p>{props.data.mid ? getPxString(roundTo(props.data.mid - instrument.openingPx, instrument.decimals), instrument.decimals, true) : '--'} 
          ( {props.data.mid ? getPxString(roundTo((props.data.mid - instrument.openingPx) / instrument.openingPx, instrument.decimals), instrument.decimals, true) : '--'} )% Today</p>
      </div>
    </div>
  );
}

export default InstrumentOnDay;