import threading
import queue
import time
import asyncio
from collections import deque
import traceback
import sys

class DataEvent(threading.Event):
    def __init__(self, shouldHop=False):
        super().__init__();
        self.shouldHop = shouldHop
        self.q = deque()
        self.lock = threading.Lock()

    def set(self, data=None):
        self.lock.acquire()
        if self.shouldHop and len(self.q) > 0:
            self.q[0] = data
        else:     
            self.q.append(data)
        self.lock.release()
        super().set()

    def waitRun(self, f):
        super().wait()
        self.lock.acquire()
        q_ = self.q.copy()
        self.q.clear()
        self.lock.release()
        for d in q_:
            try:
                f(d)
            except Exception as ex:
                print(ex)
                traceback.print_exc(file=sys.stdout)


class AsyncDataEvent(asyncio.Event):
    def __init__(self, shouldHop=False):
        super().__init__();
        self.shouldHop = shouldHop
        self.q = deque()
        self.lock = threading.Lock()

    def set(self, data=None):
        self.lock.acquire()
        try:
            if self.shouldHop and len(self.q) > 0:
                self.q[0] = data
            else:
                self.q.append(data)
        except Exception as ex:
            print(ex)
            traceback.print_exc(file=sys.stdout)
        self.lock.release()
        super().set()

    async def waitRun(self, f):
        await super().wait()
        self.lock.acquire()
        try:
            q_ = self.q.copy()
            self.q.clear()
        except Exception as ex:
            print(ex)
            traceback.print_exc(file=sys.stdout)
        self.lock.release()
        await self.run_sync(q_, f)

    async def run_sync(self, data, f):
        for d in data:
            try:
                await f(d)
            except Exception as ex:
                print(ex)
                printf(f'   in: {f}')
                traceback.print_exc(file=sys.stdout)

# class AsyncDataEventVerbose(asyncio.Event):
#     def __init__(self, shouldHop=False, txt=None):
#         super().__init__();
#         self.shouldHop = shouldHop
#         self.q = deque()
#         self.lock = threading.Lock()
#         self.txt = txt

#     def set(self, data=None):
#         print(f"   acquiring set lock {self}")
#         self.lock.acquire()
#         print(f"   acquired set lock {self}")
#         if self.shouldHop and len(self.q) > 0:
#             self.q[0] = data
#         else:     
#             self.q.append(data)
#         self.lock.release()
#         print(f"   released set lock {self}")
#         # self._loop.call_soon_threadsafe(super().set)
#         super().set()
#         print(f"   super set {self}  {asyncio.get_running_loop()._thread_id}")

#     async def waitRun(self, f):
#         print(f"   waiting {self} {asyncio.get_running_loop()._thread_id}")
#         await super().wait()
#         print(f"   super out of wait {self}")
#         self.lock.acquire()
#         q_ = self.q.copy()
#         self.q.clear()
#         self.lock.release()
#         print(f'Data: {q_} f:{f}')
#         await self.run_sync(q_, f)

#     async def run_sync(self, data, f):
#         for d in data:
#             print(f'Running {f} on {d}')
#             try:
#                 await f(d)
#             except Exception as ex:
#                 print(ex)
#                 traceback.print_exc(file=sys.stdout)
#             print(f'Ran {f} on {d}')