# rag/analytics.py
"""
BOTRON Query Telemetry Sink.

Captures per-request telemetry vectors — query text, cosine similarity score,
LLM model identifier, retrieval outcome (answered/refused), and derived
geolocation attributes — and persists them to a Supabase Postgres table for
offline RAG quality analysis and knowledge gap identification.

DATA PIPELINE
-------------
All inserts are dispatched as fire-and-forget daemon threads; the /chat
request-response cycle completes before any I/O to Supabase or ip-api.com
occurs. The client IP is resolved to (country, city) within the thread and
is not forwarded to the Supabase payload — only the derived geo attributes
are persisted. RFC 1918 and loopback addresses are filtered before any
external geo lookup is attempted.

GEO RESOLUTION
--------------
Geolocation is resolved via ip-api.com (free tier, 45 req/min, no API key
required). A 2-second connect/read timeout is enforced; on timeout or any
non-2xx response the geo fields are stored as NULL without raising.

DECOUPLING
----------
This module is intentionally decoupled from the core RAG pipeline so it can
be swapped, extended, or removed without touching main.py or retriever.py.

Environment variables (both required to activate):
    SUPABASE_URL  - Project URL from Supabase Settings -> API
    SUPABASE_KEY  - service_role key (bypasses RLS; never the anon key)

If either variable is absent the module degrades silently: log_query() becomes
a no-op and the rest of the pipeline is completely unaffected.
"""

import json
import logging
import os
import threading
import urllib.request

logger = logging.getLogger("botron-analytics")

# ---------------------------------------------------------------------------
# Client initialisation (runs once at import time)
# ---------------------------------------------------------------------------
_client = None

_url = os.getenv("SUPABASE_URL", "").strip()
_key = os.getenv("SUPABASE_KEY", "").strip()

if _url and _key:
    try:
        from supabase import create_client

        _client = create_client(_url, _key)
        logger.info("Query telemetry sink ready.")
    except Exception as exc:
        logger.warning("Query telemetry init failed (non-fatal): %s", exc)
else:
    logger.info(
        "SUPABASE_URL / SUPABASE_KEY not set — query telemetry disabled."
    )

# Private IPs and loopback ranges that must never be forwarded to a geo API.
# Sending RFC 1918 / loopback addresses to an external resolver would return
# meaningless results and unnecessarily expose internal topology information.
_PRIVATE_PREFIXES = ("10.", "172.", "192.168.", "127.", "::1", "fc", "fd")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _resolve_geo(ip: str) -> tuple[str | None, str | None]:
    """
    Resolve an IPv4/IPv6 address to (country, city) using the ip-api.com
    free JSON endpoint. Returns (None, None) on any error so the caller
    can store NULL without raising.

    The raw IP is used only within this function scope and is discarded
    immediately after the HTTP response is parsed — it is never written
    to any persistent store.
    """
    if not ip or any(ip.startswith(p) for p in _PRIVATE_PREFIXES):
        return None, None

    try:
        req = urllib.request.urlopen(
            f"http://ip-api.com/json/{ip}?fields=status,country,countryCode,city",
            timeout=2,
        )
        data = json.loads(req.read().decode())
        if data.get("status") == "success":
            return data.get("country"), data.get("city")
    except Exception as exc:
        logger.debug("Geo resolution failed (non-fatal): %s", exc)

    return None, None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def log_query(
    question: str,
    *,
    answered: bool,
    top_score: float | None = None,
    model_used: str | None = None,
    client_ip: str | None = None,
) -> None:
    """
    Fire-and-forget insert into the botron_queries table.

    Dispatches a daemon thread that sequentially: (1) resolves client_ip to
    (country, city) via ip-api.com, (2) constructs the row payload, and
    (3) executes a single Supabase insert. The thread is detached so /chat
    latency is unaffected. Any exception in either step is caught and logged
    at WARNING level — a failed telemetry write must never propagate as an
    API error.

    client_ip is consumed by _resolve_geo() within the thread scope and is
    excluded from the persisted payload; only the derived geo attributes are
    written to the telemetry store.

    Args:
        question:   The raw user query (truncated to 500 chars before insert).
        answered:   True if the RAG pipeline returned a grounded answer.
        top_score:  Cosine similarity of the top retrieved chunk, or None.
        model_used: Groq model that generated the final answer, or None.
        client_ip:  Originating IP; resolved to geo attributes, never stored.
    """
    if _client is None:
        return

    def _insert() -> None:
        country, city = _resolve_geo(client_ip) if client_ip else (None, None)

        payload = {
            "question": question[:500],
            "answered": answered,
            "top_score": top_score,
            "model_used": model_used,
            "country": country,
            "city": city,
        }

        try:
            _client.table("botron_queries").insert(payload).execute()
        except Exception as exc:
            logger.warning("Telemetry insert failed (non-fatal): %s", exc)

    threading.Thread(target=_insert, daemon=True).start()
