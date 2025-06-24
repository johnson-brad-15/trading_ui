import { useEffect, useState, useRef } from 'react';
import MarketSimulator, { MSEvent } from './MarketSimulator';

class WebSocketManager {
    constructor(domain, port, handleDataMessage, callbacks) {
        this.dommain = domain;
        this.port = port;
        this.url = domain + ':' + port.toString();
        this.handleDataMessage = handleDataMessage;
        this.eventCallbacks = callbacks;

        if (WebSocketManager.instance) {
            return WebSocketManager.instance;
        }
        this.ws = null;
        WebSocketManager.instance = this;
    }

    connect(runLocal=false) {
        console.log("Connecting");

        this.onopen = (event) => {
            console.log("Websocket connection successful");
        };

        this.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
        
        this.onclose = (event) => {
            console.log("WebSocket connection closed:", event.code, event.reason);
        };

        this.onmessage = (event) => {
            console.log("WSM: onmessge: ", event);
            const msg = JSON.parse(event.data);
            // console.log(Date.now()/1000, ":: Received socket msg", msg);
            if (!(msg === null)) {
                if (35 in msg) {
                  // console.log("Received fix42 message");
                  // console.log(msg)
                  switch (msg[35]) {
                    case('d'): //Sec def (ready)
                      console.log("WSM: Sec def: ", msg);
                      this.websocketReady(this.ws, msg);
                      this.handleDataMessage(msg);
                      break;
                    case('A'): //Logon
                      console.log("WSM: logon: ", msg);
                      this.processLogon(msg);
                      this.disseminateEvent(msg);
                      break;
                    default:
                      console.log("WSM: Passing msg off via handleDataMessage: ", msg);
                      this.handleDataMessage(msg);
                    //   this.disseminateEvent(msg);
                  }
                }
            }
        };

        if (runLocal) {
            console.log("Connecting local");
            this.ws = new MarketSimulator(
                this.onopen,
                this.onerror,
                this.onclose,
                this.onmessage,
                (msg) => { this.processDataMessage(msg); }
            );
            this.sendMessage = (msg) => { this.sendMSMessage(msg); };
            this.websocketReady = (ws, msg) => {
                console.log(Date.now()/1000, ":: Sending logon message");
                this.sendMessage({49:-1,35:'A'});
            }
            console.log("Connected local");
            // this.websocketReady(this.ws, JSON.stringify({35:'d',55:'META',15:'USD',969:0.01,44:720}));
            this.sendMessage({35:'d',55:'META',15:'USD',969:0.01,44:720});
        }
        else {
            this.ws = new WebSocket(this.url);
            this.ws.onopen = this.onopen;
            this.ws.onerror = this.onerror;
            this.ws.onclose = this.onclose;
            this.ws.onmessage  = this.onmessage;
            this.sendMessage = (msg) => { this.sendWSMessage(msg); };
        }
    }

    disseminateEvent(msg) {
        this.eventCallbacks.forEach((cb) => { cb(msg); });
    }

    websocketReady(ws, msg) {
        console.log(Date.now()/1000, ":: Sending logon message");
        this.sendMessage(JSON.stringify({49:-1,35:'A'}))
    }

    processLogon(msg) {
        console.log("WSM: ProcessLogon: ", msg);
        const clientId = msg[56];
        console.log("Logon successfull", clientId);
        this.handleDataMessage(msg);
    }

    processDataMessage(msg) {
        this.handleDataMessage(msg);
        if (!(msg === null) && (35 in msg) && msg[35] != 'W')
            this.disseminateEvent(msg);
    }

    sendWSMessage = (message) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            if (typeof message === 'string') {
                this.ws.send(message);
                // this.disseminateEvent(message);
            }
            else {
                this.ws.send(JSON.stringify(message));
                // this.disseminateEvent(message);
            }
        }
    }

    sendMSMessage = (msg) => {
        this.ws.send(msg);
    }
}

export default WebSocketManager;