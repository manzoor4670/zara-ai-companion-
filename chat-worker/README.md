# Zara Chat Worker Setup

This source is saved in GitHub, but **not deployed automatically** by the current Cloudflare Build. The main `wrangler.toml` still deploys the existing try-on Worker and must not be changed to this chat worker.

1. In Cloudflare create a **new** Worker named `zara-ai-chat`.
2. Use separate repository build configuration for this Worker with deploy command `npx wrangler deploy --config wrangler.chat.toml` (root directory), branch `main`. Do not reuse the existing try-on Worker's connection.
3. Set `GEMINI_API_KEY` as a Cloudflare **Secret** for the new chat Worker, not in GitHub, web page or README. Google Gemini API usage is subject to account free-tier quotas and provider policies.
4. Open the resulting HTTPS worker URL; GET should report `{"service":"Zara AI Chat","ready":true}`.
5. Paste this **actual** new Chat Worker URL in Zara Admin & Training's Secure AI Backend Endpoint, then click **Save Training**. Reload Zara Chat and send a test message.

This is a development prototype for personal use. GitHub Pages admin settings are stored only in the current browser and are **not protected by a password**. Browser-supplied training instructions are untrusted; never put credentials or sensitive data there. Deploying a public Worker requires proper server-side authentication, rate-limiting and abuse controls to prevent unwanted usage/billing.

The API accepts `{message,mode,language,instructions,examples,history,image}`, returns `{reply}`, and supports image understanding when Gemini permits it. No image generation, avatar animation or offline LLM is included.
