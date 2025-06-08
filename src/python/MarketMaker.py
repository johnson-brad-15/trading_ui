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
        self.ob_modify_evemt = ob.modify_event
        self.cancel_event = ob.cancel_event
        self.ack_event = AsyncDataEvent()
        self.is_auto = not ms_ack_event
        self.bid = None
        self.ask = None
        self.run = True
        
        if px is None:
            chrome_options.add_argument("--headless")
            driver = webdriver.Chrome(options=chrome_options)
            driver.get(url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?symbol={symbol}")
            self.px = float(p.search(driver.page_source).group().split(':')[-1].split(',')[0])

    async def start(self):
        self.wait_ack_task = asyncio.create_task(self.wait_ack())
        if self.is_auto:
            self.manage_orders_task = asyncio.create_task(self.manage_orders_loop())

    async def place_new_order(self, side, px, qty):
        # print("MM New order")
        self.ob_new_event.set(Order(side, px, qty, self.client_id, self.ack_event, not self.is_auto))

    async def modify_order(self, o, new_px, new_qty):
        # print("MM Modify order")
        self.ob_modify_event.set((o.id, new_px, new_qty))

    async def cancel_order(self, o):
        # print("MM cancel order")
        self.ob_cancel_event.set(o.id)

    async def wait_ack(self):
        print("MM Awaiting ack")
        while self.run:
            await e.waitRun(self.handle_ack)
            e.clear()

    async def handle_ack(self, ack):
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

    async def manage_orders_loop(self):
        # print("Managing orders loop")
        while self.run:
            await self.manage_orders()

    async def manage_orders(self):
        # print("Managing orders")
        try:
            bidPx = self.px - (random.randint(1, 4) * self.tick_sz)
            askPx = bidPx + (self.width * self.tick_sz)
            if self.bid:
                await self.modify_order(self.bid, bidPx, self.bid.qty)
            else:
                await self.place_new_order('Buy', bidPx, self.qty)
            if self.ask:
                await self.modify_order(self.ask, askPx, self.ask.qty)
            else:
                await self.place_new_order('Sell', askPx, self.qty)
            await asyncio.sleep(1)
        except Exception as ex:
            print(ex)
            traceback.print_exc(file=sys.stdout)

