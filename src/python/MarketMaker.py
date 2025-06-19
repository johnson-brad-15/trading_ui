import asyncio
from DataEvent import AsyncDataEvent
import sys
import traceback
from Order import Order, OrderAck, OrderStatus, Fill
import random

class MarketMaker:
    def __init__(self, ob, symbol, client_id, ms_ack_event=None, px=None, default_qty=None, width=4):
        self.symbol = symbol
        self.client_id = client_id
        self.default_qty = default_qty
        self.px = px
        self.qty = default_qty
        self.width = width
        self.tick_sz = 0.01
        self.ob_new_event = ob.new_event
        self.ob_modify_event = ob.modify_event
        self.ob_cancel_event = ob.cancel_event
        self.ms_ack_event = ms_ack_event;
        self.ack_event = AsyncDataEvent()
        self.is_auto = not ms_ack_event
        self.bid = None
        self.ask = None
        self.run = True

    async def start(self):
        self.wait_ack_task = asyncio.create_task(self.wait_ack(self.ack_event))
        if self.is_auto:
            self.manage_orders_task = asyncio.create_task(self.manage_orders_loop())

    async def place_new_order(self, side, px, qty):
        self.ob_new_event.set(Order(side, px, qty, self.client_id, self.ack_event, not self.is_auto))

    async def modify_order(self, order_id, new_px, new_qty=None):
        self.ob_modify_event.set((order_id, new_px, new_qty))

    async def cancel_order(self, order_id):
        # print(f"MM cancel order: {order_id}")
        self.ob_cancel_event.set(order_id)

    async def wait_ack(self, e):
        print(f"MM Awaiting ack event set: {e}")
        while self.run:
            await e.waitRun(self.handle_ack)
            e.clear()

    async def handle_ack(self, ack):
        try:
            if ack.status in [OrderStatus.NEW, OrderStatus.MODIFIED]:
                if ack.order.side == 'Buy':
                    self.bid = ack.order
                else:
                    self.ask = ack.order
            elif ack.status in [OrderStatus.CANCELLED, OrderStatus.FULLY_FILLED]:
                if ack.order.side == 'Buy':
                    self.bid = None
                else:
                    self.ask = None
            if self.ms_ack_event:
                self.ms_ack_event.set(ack)
        except Exception as ex:
            print(ex) 
            traceback.print_exc(file=sys.stdout)

    async def manage_orders_loop(self):
        while self.run:
            await self.manage_orders()

    async def manage_orders(self):
        try:
            bidPx = self.px - (random.randint(0, 3) * self.tick_sz)
            askPx = bidPx + (self.width * self.tick_sz)
            self.px = (bidPx + askPx) / 2;
            if self.bid:
                await self.modify_order(self.bid.id, bidPx, self.bid.qty)
            else:
                await self.place_new_order('Buy', bidPx, self.qty)
            if self.ask:
                await self.modify_order(self.ask.id, askPx, self.ask.qty)
            else:
                await self.place_new_order('Sell', askPx, self.qty)
            await asyncio.sleep(1)
        except Exception as ex:
            print(ex)
            traceback.print_exc(file=sys.stdout)

