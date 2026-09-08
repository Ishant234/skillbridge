"""OpenRouter / OpenAI-compatible client for AI engines."""

from __future__ import annotations

import json
import os
import re
from typing import Any

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def get_model() -> str:
    return os.getenv("LLM_MODEL", "openrouter/free")


def get_llm_client() -> OpenAI:
    """
    Prefer OPENROUTER_API_KEY; fall back to OPENAI_API_KEY.
    Defaults to OpenRouter when model is openrouter/* or *:free.
    """
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY") or "missing-key"
    model = get_model()

    base_url = os.getenv("LLM_BASE_URL")
    if not base_url:
        if (
            os.getenv("OPENROUTER_API_KEY")
            or model.startswith("openrouter/")
            or ":free" in model
        ):
            base_url = OPENROUTER_BASE_URL

    kwargs: dict = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
        kwargs["default_headers"] = {
            "HTTP-Referer": os.getenv("NEXTAUTH_URL", "http://localhost:3000"),
            "X-Title": "SkillBridge SIH",
        }

    return OpenAI(**kwargs)


def extract_message_text(response: Any) -> str:
    """
    Free / reasoning models sometimes put text in `reasoning` and leave
    `content` null when max_tokens is too low. Prefer content, else reasoning.
    """
    msg = response.choices[0].message
    content = (msg.content or "").strip()
    if content:
        return content

    reasoning = getattr(msg, "reasoning", None)
    if isinstance(reasoning, str) and reasoning.strip():
        return reasoning.strip()

    # Some SDKs stash extras on model_extra
    extra = getattr(msg, "model_extra", None) or {}
    if isinstance(extra, dict):
        for key in ("reasoning", "reasoning_content"):
            val = extra.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()

    return ""


def extract_json_object(text: str) -> dict[str, Any]:
    """Parse JSON from model output, tolerating markdown fences / preamble."""
    text = text.strip()
    if not text:
        raise ValueError("Empty LLM response")

    # Strip ```json fences if present
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fenced:
        text = fenced.group(1).strip()

    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    # Find first {...} block
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        data = json.loads(text[start : end + 1])
        if isinstance(data, dict):
            return data

    raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}")


def chat_completion(
    *,
    messages: list[dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int | None = None,
    json_mode: bool = False,
) -> str:
    """
    Call the configured model and return assistant text.
    Uses a generous default max_tokens so reasoning models still emit content.
    """
    client = get_llm_client()
    token_budget = max_tokens or int(os.getenv("LLM_MAX_TOKENS", "4096"))

    kwargs: dict[str, Any] = {
        "model": get_model(),
        "messages": messages,
        "temperature": temperature,
        "max_tokens": token_budget,
    }
    if json_mode:
        # Best-effort; free router may ignore unsupported response_format
        kwargs["response_format"] = {"type": "json_object"}

    try:
        response = client.chat.completions.create(**kwargs)
    except Exception:
        # Retry without response_format if provider rejects it
        if json_mode:
            kwargs.pop("response_format", None)
            response = client.chat.completions.create(**kwargs)
        else:
            raise

    return extract_message_text(response)
