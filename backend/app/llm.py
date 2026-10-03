"""Thin async client for any OpenAI-compatible chat-completions endpoint (default: NVIDIA NIM / Nemotron)."""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from .config import get_settings
from .models import PipelineError

T = TypeVar("T", bound=BaseModel)

logger = logging.getLogger("devreel.llm")

_THINK_RE = re.compile(r"<think>.*?</think>", re.S)


async def chat(messages: list[dict[str, str]], *, temperature: float = 0.3) -> str:
    """One chat completion. Returns the assistant text. Raises PipelineError('ai_failed')."""
    s = get_settings()
    if not s.llm_api_key:
        raise PipelineError("ai_failed", "The AI service isn't configured (missing LLM_API_KEY).", False)
    body: dict[str, Any] = {
        "model": s.llm_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": s.llm_max_tokens,
    }
    headers = {"Authorization": f"Bearer {s.llm_api_key}", "Content-Type": "application/json"}
    url = s.llm_base_url.rstrip("/") + "/chat/completions"
    last: Exception | None = None
    for attempt in range(2):  # one transient-error retry
        try:
            async with httpx.AsyncClient(timeout=s.llm_timeout_seconds) as client:
                r = await client.post(url, headers=headers, json=body)
            if r.status_code in (429, 500, 502, 503, 504) and attempt == 0:
                last = RuntimeError(f"HTTP {r.status_code}")
                continue
            if r.status_code != 200:
                raise PipelineError("ai_failed", f"The AI service returned an error ({r.status_code}).", False)
            data = r.json()
            return data["choices"][0]["message"]["content"] or ""
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
            last = e
            logger.warning("LLM request failed (attempt %s/2): %s", attempt + 1, e)
            if attempt == 0:
                continue
    logger.error("LLM request failed after retries: %s", last)
    raise PipelineError("ai_failed", "The AI service couldn't be reached. Please try again.", False) from last


def extract_json(text: str) -> Any:
    """Pull the first JSON object out of model text (handles <think>, ```json fences, chatter)."""
    text = _THINK_RE.sub("", text).strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    if start == -1:
        raise ValueError("no JSON object found")
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError("unterminated JSON object")


async def chat_model(
    system: str,
    user: str,
    model_cls: Type[T],
    *,
    validate=None,
    repair=None,
    temperature: float = 0.3,
) -> T:
    """Ask for JSON, validate it against `model_cls` (+ optional extra `validate`), retry ONCE with the errors.

    validate(obj) -> list[str]  problems (empty list = good). May also mutate/normalise obj.
    repair(raw_dict) -> raw_dict  optional cheap auto-fixes applied before validation.
    """
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    problems: list[str] = []
    for attempt in range(2):
        text = await chat(messages, temperature=temperature if attempt == 0 else 0.1)
        logger.info(
            "Structured LLM attempt %s/2 returned %s characters for %s",
            attempt + 1,
            len(text),
            model_cls.__name__,
        )
        try:
            raw = extract_json(text)
            logger.info(
                "Structured LLM attempt %s/2 JSON extraction succeeded for %s",
                attempt + 1,
                model_cls.__name__,
            )
            if repair:
                raw = repair(raw)
                logger.info(
                    "Structured LLM attempt %s/2 repair pass completed for %s",
                    attempt + 1,
                    model_cls.__name__,
                )
            obj = model_cls.model_validate(raw)
            problems = validate(obj) if validate else []
            if not problems:
                logger.info(
                    "Structured LLM attempt %s/2 accepted for %s",
                    attempt + 1,
                    model_cls.__name__,
                )
                return obj
            logger.warning(
                "Structured LLM attempt %s/2 quality gate rejected %s: %s",
                attempt + 1,
                model_cls.__name__,
                " | ".join(problems[:8]),
            )
        except (ValueError, ValidationError) as e:
            problems = [_short(e)]
            logger.warning(
                "Structured LLM attempt %s/2 rejected %s during parsing/validation: %s",
                attempt + 1,
                model_cls.__name__,
                " | ".join(problems[:8]),
            )
        if attempt == 0:
            messages = messages + [
                {"role": "assistant", "content": text[:6000]},
                {
                    "role": "user",
                    "content": "That output was rejected for these reasons:\n- "
                    + "\n- ".join(problems[:8])
                    + "\nReturn the corrected JSON object only, with no commentary.",
                },
            ]
    raise PipelineError("ai_failed", "The AI produced output we couldn't use. Please try again.", False)


def _short(e: Exception) -> str:
    if isinstance(e, ValidationError):
        out = []
        for err in e.errors()[:6]:
            loc = ".".join(str(x) for x in err["loc"])
            out.append(f"{loc}: {err['msg']}")
        return "; ".join(out)
    return str(e)
