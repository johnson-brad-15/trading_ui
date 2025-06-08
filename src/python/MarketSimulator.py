#!/usr/bin/env python
# coding: utf-8

# In[1]:


import threading
from MarketMaker import MarketMaker
from OrderBook import OrderBook
import websockets
import asyncio
import traceback
import sys
import json
from DataEvent import DataEvent, AsyncDataEvent
from Order import OrderStatus
import datetime as dt


# In[2]:


next_client_id = 0
id_lock = threading.Lock()
def getNextClientId():
    global next_client_id, id_lock
    id_lock.acquire()
    i = next_client_id
    next_client_id += 1
    id_lock.release()
    return i


# In[3]:


# class BookSender:
#     def __init__(self, ob, event):
#         self.ob = ob
#         self.event = event
#         self.websocket = None
        
#     async def sendBook(self):
#         while True:
#             # print(f'Waiting to send')
#             self.event.wait()
#             # print(f'send event set')
#             msg = self.ob.toJson()
#             if self.websocket:
#                 print(f'Sending: {msg}')
#                 await self.websocket.send(msg)
#             self.event.clear()
#             # print(f'Send event cleared')

class WebSocketSender:
    def __init__(self, ws):
        self.ws = ws
        self.ws_send = ws.send
        print(f'Created new WebSocketSender to {self.ws.remote_address}')

    async def send(self, msg):
        try:
            print(f'{dt.datetime.now().timestamp()}:: Sending: {msg} on {self.ws.remote_address}')
            await self.ws_send(msg);
        except Exception as ex:
            print(ex)
            traceback.print_exc(file=sys.stdout)
        

class WebSocketHandler:
    def __init__(self, ob, mms):
        self.ob = ob
        self.mms = mms
        self.wsByClientId = {}
        self.wsSenders = []
        self.msgLock = asyncio.Lock()
        self.msgq = asyncio.Queue()
        self.ackEvent = AsyncDataEvent()
        asyncio.create_task(self.wait_ack(self.ackEvent))

    async def wait_ack(self, e):
        while True:
            print("MS:Awaiting acks")
            await e.waitRun(self.handle_ack)
            print("8 MS:ran handle_ack")
            e.clear()
            print("MS:cleared event")

    async def handle_ack(self, ack):
        print(f"7 MS:New ack: {ack.status} {ack.order.id} {ack.order.clientId} {self.wsByClientId}")
        if ack.order.id < 0:
            if ack.order.clientId in self.wsByClientId:
                if ack.status == OrderStatus.NEW:
                    newAck = json.dumps({35:8,
                                         56:ack.order.clientId,
                                         39:0,
                                         11:ack.order.id,
                                         54:(1 if ack.order.side == "Buy" else 2),
                                         38:ack.order.qty,
                                         44:ack.order.px,
                                         52:str(dt.datetime.now())
                                        })
                    # print(f"Sending {newAck} to self.wsByClientId[ack.order.clientId]")
                    await self.wsByClientId[ack.order.clientId].send(newAck)

    async def ws_recv(self, ws):
        # print(f'{dt.datetime.now().timestamp()}:: Waiting for msg from {ws}')
        await_msg_task = None
        asyncio.create_task(self.handle_ws_msg(ws))
        await asyncio.sleep(0)
        await ws.send(json.dumps({35:'d',55:'META'}))
        while True:
            # print(f'{dt.datetime.now().timestamp()}:: Lock: {self.msgLock}')
            # await self.msgLock.acquire()
            # print(f'{dt.datetime.now().timestamp()}:: Acquired Lock. Waiting for msg')
            try:
                msg = await ws.recv()
            
            except (websockets.exceptions.ConnectionClosedError, websockets.exceptions.ConnectionClosedOK):
                print(f'{dt.datetime.now().timestamp()}:: recv failed for {ws.remote_address}')
                break
            print(f'{dt.datetime.now().timestamp()}:: Received msg from {ws.remote_address}: {msg}')
            # self.msgLock.release()
            # print(f'{dt.datetime.now().timestamp()}:: Released Lock.')
            await self.msgq.put(msg)
        print(f'{dt.datetime.now().timestamp()}:: Done waiting on {ws.remote_address}')
        await self.msgq.put(None)

    async def handle_ws_msg(self, ws):
        while True:
            print(f'{dt.datetime.now().timestamp()}:: Waiting for queued msg from {ws.remote_address}')
            msg = await self.msgq.get()
            print(f'{dt.datetime.now().timestamp()}:: Dequeued msg from {ws.remote_address}: {msg}')
            if msg is None:
                break
            try:
                msg = json.loads(msg)
                if msg['35'] == 'A':
                    # print("Logon message")
                    if msg['49'] == -1:
                        # print("New Client")
                        clientId = getNextClientId()
                        self.wsByClientId[clientId] = ws
                        self.mms[clientId] = MarketMaker(ob, self.ob.symbol, clientId, msAckEvent=self.ackEvent, px=139.00, default_qty=10, width=4)
                        # print(f'Created MM')
                        reply = {35:"A",56:clientId,44:self.mms[clientId].px}
                        # print(f"Replying with {reply}")
                        await ws.send(json.dumps(reply))
                        await self.mms[clientId].start()
                elif msg['35'] == 5:
                    print("Logout")
                elif msg['35'] == 'D':
                    print(msg['49'])
                    print(self.mms)
                    print(f"1 MS:New order message from {self.mms[msg['49']]}")
                    await self.mms[msg['49']].placeNewOrder('Buy' if msg['38'] > 0 else 'Sell', msg['44'], abs(msg['38']))
            except Excpetion as ex:
                print(ex)
                traceback.print_exc(file=sys.stdout)
        print(f'{dt.datetime.now().timestamp()}:: Done waiting to dequeue msg from {ws.remote_address}')
        
    async def handler(self, websocket, path):
        try:
            sender = WebSocketSender(websocket)
            self.wsSenders.append(sender)
            ws_send = websocket.send
            # print(websocket.send)
            websocket.send = sender.send
            # print(websocket.send)
            self.ob.websocket.append(websocket)
            print(f"{dt.datetime.now().timestamp()}:: Client connected from: {websocket.remote_address} : {len(self.ob.websocket)}")
            await self.ws_recv(websocket)
        except websockets.exceptions.ConnectionClosedError:
            print("Client disconnected abruptly")
        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            await websocket.close()
            self.ob.websocket.remove(websocket)
            print(f"Client connection closed: {websocket.remote_address}")



# In[ ]:


async def main_async(ob, mms):
    wsHandler = WebSocketHandler(ob, mms)
    await ob.start()
    for client_id, mm in mms.items():
        await mm.start()
    try:
        port = 8765
        async with websockets.serve(wsHandler.handler, "localhost", port):
            print(f"WebSocket server started on ws://localhost:{port}")
            await asyncio.Future()  # run forever
    except Exception as ex:
        print(ex)
        traceback.print_exc(file=sys.stdout)

symbol = 'META'

if __name__ == "__main__":
    book_event = asyncio.Event()
    ob = OrderBook(symbol)
    mms = {}
    # client_id = getNextClientId()
    # mms[client_id] = MarketMaker(ob, symbol, client_id, px=139.00, default_qty=10, width=4)
    await(main_async(ob, mms))


# In[ ]:





# In[ ]:




