"""
VentureNode — Clerk JWT Authentication Dependency.

Decodes the Clerk-issued JWTs passed in the Authorization header of every
protected FastAPI request.  The `clerk_user` dependency extracts the Clerk
user ID (``sub``) and uses it as the ``tenant_id`` for strict Row-Level
Security across all Notion queries.

Implementation notes:
  - Clerk's JWKs endpoint is fetched once per process and cached via
    ``lru_cache``.  The key set is rotated lazily (``PyJWKClient`` handles
    caching internally).
  - We verify ``iss``, ``aud`` (optional — Clerk omits aud for session
    tokens), ``exp``, and ``nbf``.  The ``sub`` claim is the stable Clerk
    user ID that acts as ``tenant_id``.
  - On any verification failure we raise HTTP 401 so the frontend can
    redirect to the sign-in page.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from backend.core.config import get_settings
from backend.core.logging import get_logger

logger = get_logger(__name__)

_bearer_scheme = HTTPBearer(auto_error=True)


@dataclass(frozen=True, slots=True)
class ClerkUser:
    """Authenticated Clerk session principal.

    Attributes:
        tenant_id: The Clerk ``sub`` claim — used as Row-Level Security key.
        email: Primary email address extracted from the JWT (may be ``None``
            if the token does not include the ``email`` claim).
        raw_token: Original JWT string — forwarded to the FastAPI backend
            when making downstream service calls.
    """

    tenant_id: str
    email: str | None
    raw_token: str


@lru_cache(maxsize=1)
def _get_jwks_client() -> PyJWKClient:
    """Return a cached JWKS client pointed at Clerk's public key endpoint.

    Clerk rotates signing keys regularly.  ``PyJWKClient`` caches the key
    set in-memory and re-fetches automatically when a ``kid`` miss occurs,
    so we only need one instance per process.

    Returns:
        PyJWKClient: Ready-to-use JWKS client.
    """
    settings = get_settings()
    jwks_url = f"https://{settings.clerk_frontend_api}/.well-known/jwks.json"
    return PyJWKClient(jwks_url, cache_keys=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> ClerkUser:
    """FastAPI dependency: decode and validate the Clerk JWT.

    Extracts the bearer token from the ``Authorization`` header, verifies its
    signature against Clerk's published JWK set, and returns a ``ClerkUser``
    dataclass containing the ``tenant_id`` (Clerk ``sub``).

    Args:
        credentials: Bearer credentials injected by FastAPI's ``HTTPBearer``
            security scheme.

    Returns:
        ClerkUser: Decoded, verified session principal.

    Raises:
        HTTPException 401: If the token is missing, expired, or has an invalid
            signature.
    """
    raw_token = credentials.credentials
    settings = get_settings()

    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(raw_token)

        payload: dict = jwt.decode(
            raw_token,
            signing_key.key,
            algorithms=["RS256"],
            options={
                "require": ["sub", "exp", "iss"],
                "verify_exp": True,
                "verify_iss": True,
            },
            issuer=f"https://{settings.clerk_frontend_api}",
        )
    except jwt.ExpiredSignatureError as exc:
        logger.warning("Clerk JWT expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.InvalidTokenError as exc:
        logger.warning("Clerk JWT validation failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except Exception as exc:
        logger.error("Unexpected error during JWT verification", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication service unavailable.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    tenant_id: str = payload["sub"]
    email: str | None = payload.get("email")

    logger.info("Authenticated request", tenant_id=tenant_id)

    return ClerkUser(tenant_id=tenant_id, email=email, raw_token=raw_token)


# Annotated shorthand for use in route signatures
from typing import Annotated
CurrentUser = Annotated[ClerkUser, Depends(get_current_user)]
