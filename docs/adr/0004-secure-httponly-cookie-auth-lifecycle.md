# ADR 0004: Dual-Layer Authentication with In-Memory Access Tokens & HttpOnly Refresh Cookie

## Status

Accepted (Implemented)

## Context

Storing long-lived JWT access tokens or refresh tokens in browser `localStorage` or `sessionStorage` exposes sessions to Cross-Site Scripting (XSS) extraction. Conversely, storing access tokens purely in cookies creates Cross-Site Request Forgery (CSRF) vulnerabilities unless complex double-submit cookies or CSRF tokens are maintained.

## Decision

Implement a dual-layer authentication lifecycle:

1. **Access Token**: Short-lived JWT (e.g. 15 minutes) kept strictly in **memory** (or Axios authorization header state) within `@apps/admin`. It is never stored in `localStorage` or `sessionStorage`.
2. **Refresh Token**: Long-lived token stored in a secure, **HttpOnly**, `SameSite=Lax`, `Secure` (in production) cookie managed exclusively by the browser and Go backend.
3. **Automated Rotation & Revocation**: Every call to `POST /api/v1/auth/refresh` issues a new access token and rotates the refresh token JTI, blacklisting the prior JTI in Redis.
4. **Idempotent Logout**: `POST /api/v1/auth/logout` explicitly invalidates the server-side refresh session and clears the browser cookie.

## Consequences

- **Positive**:
  - Complete protection of persistent session credentials against JavaScript XSS extraction.
  - Automatic silent refresh mechanism invisible to the end user.
  - Immediate server-side session termination upon logout or security compromise.
- **Negative / Constraints**:
  - Refresh requests require proper CORS credential configuration (`credentials: 'include'` and explicit `ALLOWED_ORIGINS` in the backend).
  - Page reload requires an initial silent refresh handshake to rehydrate the in-memory access token.
