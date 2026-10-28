# Character.AI compatibility experiment for Zara

Status: **Not connected. No authentication performed. No live deployment.**

## Current architecture
- Main Zara chat Worker: `chat-worker/src/index.js`
- Deployment configuration: `wrangler.chat.toml`
- Existing AI providers: Gemini and optional OpenRouter fallback.
- Current UI uses JSON `POST /` with `message`, `mode`, `language`, `history`, optional `image`. It expects `{ "reply": "..." }`.
- Preserve voice UI, original chat modes and existing providers.

## What was checked
The third-party CAINode project documents JavaScript support for Node, Deno and Bun and an authentication flow based on a Character.AI session token. It does **not** establish support for Cloudflare Workers. The official Character.AI consumer account is not a public developer API account. Do not assume Google sign-in is an API authorization flow.

## Safe integration gates
1. Review CAINode source, license, transitive dependencies, recent maintenance and Character.AI terms before executing or deploying third-party code.
2. Verify an approved, user-authorized authentication method. Do not ask for a Google password, paste a session token in chat, GitHub, browser JavaScript, issues or PR comments, or extract browser storage using untrusted snippets.
3. If an approved session credential is used, keep it server-side in Cloudflare Secrets; never expose it to the GitHub Pages app or logs.
4. First test in an isolated environment; confirm runtime compatibility with Cloudflare Workers and whether API access is permitted. Do not connect an untested unofficial client to the live Worker.
5. If the integration becomes viable, add an explicit provider selection or server-side fallback preserving Gemini/OpenRouter, with timeouts, errors, limits and same-origin protections.
6. Ensure users understand when their chat text would be sent to Character.AI and test the Normal, Romantic, Flirty, Roman Urdu and voice flows.
7. Merge only after successful end-to-end tests and owner approval.

## Result
This branch is a non-production review area. It intentionally contains no tokens, login extraction scripts, Character.AI network calls, dependency installation or changes to production files.

Sources:
- https://github.com/KevinAdhaikal/CAINode
- https://github.com/Xtr4F/PyCharacterAI
