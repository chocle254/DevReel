"""Short-lived signed tokens that let Playwright (and only Playwright) read scene data."""
from __future__ import annotations

import hashlib
import hmac
import time

from .config import get_settings


def _sig(reel_id: str, exp: int) -> str:
    key = get_settings().render_secret.encode()
    return hmac.new(key, f"{reel_id}.{exp}".encode(), hashlib.sha256).hexdigest()[:40]


def make_render_token(reel_id: str) -> str:
    exp = int(time.time()) + get_settings().render_token_ttl_seconds
    return f"{exp}.{_sig(reel_id, exp)}"


def verify_render_token(reel_id: str, token: str | None) -> bool:
    if not token or "." not in token:
        return False
    exp_s, sig = token.split(".", 1)
    try:
        exp = int(exp_s)
    except ValueError:
        return False
    if exp < int(time.time()):
        return False
    return hmac.compare_digest(sig, _sig(reel_id, exp))
