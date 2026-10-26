# Zara Chat Worker Setup

This chat Worker uses `wrangler.chat.toml`. Its Cloudflare GitHub Build must deploy branch `main` with `npx wrangler deploy --config wrangler.chat.toml`. The main `wrangler.toml` deploys the separate try-on Worker.

1. In Cloudflare create a **new** Worker named `zara-ai-chat`.
2. Use separate repository build configuration for this Worker with deploy command `npx wrangler deploy --config wrangler.chat.toml` (root directory), branch `main`. Do not reuse the existing try-on Worker's connection.
3. Set `GEMINI_API_KEY` as a Cloudflare **Secret** for the new chat Worker, not in GitHub, web page or README. Google Gemini API usage is subject to account free-tier quotas and provider policies.
4. Open the resulting HTTPS worker URL; GET should report `{"service":"Zara AI Chat","ready":true}`.
5. Paste this **actual** new Chat Worker URL in Zara Admin & Training's Secure AI Backend Endpoint, then click **Save Training**. Reload Zara Chat and send a test message.

This is a development prototype for personal use. GitHub Pages admin settings are stored only in the current browser and are **not protected by a password**. Browser-supplied training instructions are untrusted; never put credentials or sensitive data there. Deploying a public Worker requires proper server-side authentication, rate-limiting and abuse controls to prevent unwanted usage/billing.

The API accepts `{message,mode,language,instructions,examples,history,image}`, returns `{reply}`, and supports image understanding when Gemini permits it. No image generation, avatar animation or offline LLM is included.

## Venice text chat

Add `VENICE_API_KEY` as an encrypted runtime Secret on **zara-ai-chat**. When configured, text chat uses Venice first; the default model is `llama-3.3-70b`. An optional server-side `VENICE_MODEL` variable can select another supported text model. Never put the key into frontend settings, source files, build variables, or GitHub.

Existing language, mode, history, personality and boundary instructions are sent to Venice unchanged. Images continue to use Gemini/OpenRouter, since this Venice integration handles text only. Venice errors are returned directly, without silently sending the conversation to another provider. Removing the Venice secret restores the existing Gemini/OpenRouter text routing.

Venice API requests use the account's available credits and may incur charges. Output is capped at 500 tokens per request. GET readiness reports **configuration only**, not a successful inference or a sufficient balance. A successful chat response includes `provider: "Venice"`.

Run provider integration tests with `node --test chat-worker/test/venice.test.mjs` (Node 22+).
