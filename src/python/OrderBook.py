from collections import deque
import datetime as dt
import json
import math
import random
from Order import Order, OrderAck, OrderStatus, Fill
from DataEvent import DataEvent, AsyncDataEvent
import asyncio
from itertools import groupby
from operator import attrgetter
import traceback
import sys

class OrderBook:
    def __init__(self, symbol):
        self.symbol = symbol
        self.websocket = []
        self.loop = asyncio.get_event_loop()
        # self.send_book_event = AsyncDataEvent()
        self.send_book_event = AsyncDataEvent()
        self.send_trade_event = AsyncDataEvent()
        self.new_event = AsyncDataEvent()
        self.modify_event = AsyncDataEvent()
        self.cancel_event = AsyncDataEvent()
        self.bids = {}
        self.asks = {}
        self.ordersById = {}

    async def start(self):
        waitNewTask = asyncio.create_task(self.wait_new(self.new_event))
        waitModifyTask = asyncio.create_task(self.wait_modify(self.modify_event))
        waitCancelTask = asyncio.create_task(self.wait_cancel(self.cancel_event))
        waitSendBookTask = asyncio.create_task(self.wait_send_book(self.send_book_event))
        waitSendTradeTask = asyncio.create_task(self.wait_send_trade(self.send_trade_event))
        # # await asyncio.gather(waitNewTask, waitModifyTask, waitCancelTask, waitSendBookTask)

    def toJson(self, msgType, fill=None):
        bids = sum([list(o) for o in [self.bids[lvl] for lvl in sorted(list(self.bids.keys()))[::-1]]], [])
        asks = sum([list(o) for o in [self.asks[lvl] for lvl in sorted(list(self.asks.keys()))]], [])

        if msgType == 'W':
            bidPxs = sorted(list(set([o.px for o in set(bids)])))[::-1]
            askPxs = sorted(list(set([o.px for o in set(asks)])))
            # if len(askPxs) > 1:
            #     print(self.asks)
            bidQtys = [sum(o.qty for o in groupedOs) for px, groupedOs in groupby(bids, attrgetter('px'))]
            askQtys = [sum(o.qty for o in groupedOs) for px, groupedOs in groupby(asks, attrgetter('px'))]
            lvlCount = len(bidPxs) + len(askPxs)
            fix42 = {35:'W',52:str(dt.datetime.now()),55:self.symbol,268:[]}
            for i in range(len(bidPxs)):
                fix42[268].append({269:0,270:bidPxs[i],271:bidQtys[i]})
            for i in range(len(askPxs)):
                fix42[268].append({269:1,270:askPxs[i],271:askQtys[i]})
        # elif msgType == 'X':
        #     fix42 = { 35:'X'
        #              ,269:2
        #              ,52:str(fill.date)
        #              ,55:self.symbol
        #              ,56:fill.clientId
        #              ,54:(1 if fill.side == "Buy" else 2)
        #              ,38:fill.qty
        #              ,44:fill.px}

        return json.dumps(fix42)

    async def wait_new(self, e):
        print("Awaiting new orders")
        while True:
            await e.waitRun(self.newOrder)
            e.clear()

    async def newOrder(self, o):
        self.ordersById[o.id] = o
        side, other_side = (self.bids, self.asks) if o.side == 'Buy' else (self.asks, self.bids)
        if o.px not in side:
            side[o.px] = deque()
        side[o.px].append(o)
        if o.ackEvent:
            print(f"{dt.datetime.now().timestamp()}:: OB:Setting New Order AckEvent: {o.ackEvent}")
            try:
                o.ackEvent.set(OrderAck(o,OrderStatus.NEW))
            except Exception as ex:
                print(ex)
                traceback.print_exc(file=sys.stdout)
            finally:
                o.ackEvent.clear()
        self.match(o)
        self.send_book_event.set()

    async def wait_modify(self, e):
        print("Awaiting modifies")
        while True:
            await e.waitRun(self.modifyOrder)
            e.clear()

    async def modifyOrder(self, data):
        try:
            (orderId, px, qty) = data
            if orderId not in self.ordersById:
                return
            o = self.ordersById[orderId]
            if qty is None: qty = o.qty
            side, other_side = (self.bids, self.asks) if o.side == 'Buy' else (self.asks, self.bids)
            backOfTheLine = px != o.px or qty > o.qty
            if backOfTheLine and o.px in side:
                side[o.px].remove(o)
                if len(side[o.px]) == 0:
                    del side[o.px]
            o.px = px
            o.qty = qty
            if backOfTheLine and o.id in self.ordersById:
                if o.px not in side:
                    side[o.px] = deque()
                side[o.px].append(o)
        except Exception as ex:
            print(ex)
            traceback.print_exc(file=sys.stdout)
        if o.ackEvent:
            print(f"{dt.datetime.now().timestamp()}:: OB:Setting Modify AckEvent: {o}")
            o.ackEvent.set(OrderAck(o,OrderStatus.MODIFIED))
        self.match(o)
        self.send_book_event.set()

    async def wait_cancel(self, e):
        print("Awaiting cancels")
        while True:
            await e.waitRun(self.cancelOrder)
            e.clear()
        
    async def cancelOrder(self, orderId):
        print(f'Cancel order {orderId}')
        o = self.ordersById[orderId]
        del self.ordersById[o.id]
        side, other_side = (self.bids, self.asks) if o.side == 'Buy' else (self.asks, self.bids)
        side[o.px].remove(o)
        if len(side[o.px]) == 0:
            del side[o.px]
        if o.ackEvent:
            o.ackEvent.set(OrderAck(o,OrderStatus.CANCELLED))
        self.send_book_event.set()
            
    def fill(self, o, sz):
        print(f'OB: Fill')
        exec_time = dt.datetime.now()
        side, other_side = (self.bids, self.asks) if o.side == 'Buy' else (self.asks, self.bids)
        o.qty -= sz
        pre = 'PARTIAL'
        if o.qty == 0:
            del self.ordersById[o.id]
            pre = 'FULL'
            # print(f'Removing {o} from {o.side} orders')
            side[o.px].remove(o)
            if len(side[o.px]) == 0:
                # print(f'Removing {o.px} from side: {o.side}')
                del side[o.px]
            if o.ackEvent:
                print('OB: Full fill')
                o.ackEvent.set(OrderAck(o,OrderStatus.FULLY_FILLED))
        else:
            if o.ackEvent:
                o.ackEvent.set(OrderAck(o,OrderStatus.PARTIALLY_FILLED))
        self.send_trade_event.set(Fill(exec_time, o.id, o.id, o.clientId, o.side, sz, o.px, o.qty == 0))
        print(f'{pre} FILL: {o.clientId} {o.side}s {sz} @ {o.px} {o.qty} Remaining')
        self.send_book_event.set()
        

    def match(self, o):
        side, other_side = (self.bids, self.asks) if o.side == 'Buy' else (self.asks, self.bids)
        # orders = side[o.px]
        matching_orders = [self.asks[k] for k in sorted(list(self.asks.keys())) if k <= o.px] if o.side == 'Buy' else [self.bids[k] for k in sorted(list(self.bids.keys())) if k >= o.px]
        matching_orders = [order for orders in matching_orders for order in orders]
        found_matches = len(matching_orders) > 0
        # if found_matches:
        #     print(f'o:{o} matching_orders:{matching_orders}')
        i = 0
        while o.qty > 0 and i < len(matching_orders):
            mo = matching_orders[i]
            print(f'{o} matched with {mo}')
            print(self)
            sz = min(o.qty, mo.qty)
            # full_fill_o = o.qty - sz == 0
            self.fill(o,sz)
            # print(f'After FILL, o.qty = {o.qty}')
            full_fill_mo = mo.qty - sz == 0
            self.fill(mo, sz)
            if full_fill_mo:
                i += 1
            print(self)

    async def wait_send_book(self, e):
        print(f'Waiting to send book')
        while True:
            await e.waitRun(self.send_book)
            e.clear()

    async def send_book(self, data=None):
        msg = self.toJson('W')
        if self.websocket:
            for ws in self.websocket:
                if ws.open:
                    print(f"{dt.datetime.now().timestamp()}:: OB:Sending Book")
                    await ws.send(msg)

    async def wait_send_trade(self, e):
        print(f'Waiting to send trades')
        while True:
            await e.waitRun(self.send_trade)
            e.clear()

    async def send_trade(self, fill=None):
        pass;
        # msg = self.toJson('X', fill=fill)
        # if self.websocket:
        #     for ws in self.websocket:
        #         if ws.open:
        #             await ws.send(msg)

    def __str__(self):
        # return "OrderBook"
        return f'bids: {self.bids}\nasks: {self.asks}'

    def __repr__(self):
        return str(self)