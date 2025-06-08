from enum import Enum, auto
import threading

next_id = 1
id_lock = threading.Lock()
def getNextId():
    global next_id, id_lock
    id_lock.acquire()
    i = next_id
    next_id += 1
    id_lock.release()
    return i


class OrderStatus(Enum):
    NEW = auto()
    MODIFIED = auto()
    CANCELLED = auto()
    REJECTED = auto()
    PARTIALLY_FILLED = auto()
    FULLY_FILLED = auto()


class Order:
    def __init__(self, side, px, qty, clientId, ackEvent=None, manual=False):
        self.side = side
        self.px = px
        self.qty = qty
        self.clientId = clientId
        self.id = getNextId() * (-1 if manual else 1)
        self.ackEvent = ackEvent

    def __str__(self):
        return f'<{self.id}: {self.party} {self.side} {self.qty} @ {self.px}>'

    def __repr__(self):
        return str(self)


class OrderAck:
    def __init__(self, order, status):
        self.order = order
        self.status = status

class Fill:
    def __init__(self, date, orderId, clientOrderId, clientId, side, qty, px, isFull):
        self.date = date 
        self.orderId = orderId
        self.clientOrderId = clientOrderId
        self.clientId = clientId
        self.side = side
        self.qty = qty
        self.px = px
        self.isFull = isFull



