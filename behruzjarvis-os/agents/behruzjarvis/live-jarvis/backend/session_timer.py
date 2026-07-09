import time
from typing import Callable


class SilenceTimer:
    def __init__(self, timeout_seconds: float = 10.0, clock: Callable[[], float] = time.monotonic):
        self.timeout_seconds = timeout_seconds
        self._clock = clock
        self._last_activity = clock()

    def touch(self) -> None:
        self._last_activity = self._clock()

    def expired(self) -> bool:
        return (self._clock() - self._last_activity) >= self.timeout_seconds
