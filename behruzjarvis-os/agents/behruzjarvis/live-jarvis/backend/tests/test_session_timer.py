from session_timer import SilenceTimer


def test_not_expired_immediately_after_creation():
    timer = SilenceTimer(timeout_seconds=10.0)
    assert timer.expired() is False


def test_expired_after_timeout_elapses():
    clock = {"t": 0.0}
    timer = SilenceTimer(timeout_seconds=10.0, clock=lambda: clock["t"])
    clock["t"] = 11.0
    assert timer.expired() is True


def test_touch_resets_the_timer():
    clock = {"t": 0.0}
    timer = SilenceTimer(timeout_seconds=10.0, clock=lambda: clock["t"])
    clock["t"] = 9.0
    timer.touch()
    clock["t"] = 15.0
    assert timer.expired() is False
    clock["t"] = 20.0
    assert timer.expired() is True
