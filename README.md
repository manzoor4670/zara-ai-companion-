# Zara AI Companion

An Android-friendly static web app with two separate pages.

- `index.html`: Zara Chat (Normal, Romantic, and 18+ Flirty but non-explicit modes), Roman Urdu/Urdu/English, speech-to-text when browser supports it, text-to-speech, image preview, chat history.
- `admin.html`: Separate Admin & Training editor for name, personality instructions, example Q&A, language, welcome message and backend endpoint.

## Run
Open `index.html` directly for the offline demo, or enable GitHub Pages: Settings > Pages > Deploy from a branch > main > /(root). Chat and admin then share settings through browser localStorage on the same origin.

## Important
This is a **frontend starter**, not a deployed AI model. Without a backend it provides clearly labeled sample replies only. Image upload previews files but does not interpret them. AI image generation is not yet connected. Real AI needs a trusted server endpoint returning JSON `{"reply":"..."}` in response to POST JSON `{message,mode,language,instructions,examples,history,image}`. The optional image field carries a data URL. Never embed Gemini/OpenRouter API secrets in GitHub or the browser. Endpoint CORS must allow the deployed origin.

Admin changes are stored **only in this browser**, not in GitHub or a cloud database. The admin page is NOT authenticated: anyone with access to this browser or public admin URL can view the editor. Before collecting personal chats or publishing admin access, implement server-side authentication and private storage. Do not put secrets or sensitive training data here. Adult mode is for adults only and is flirty, not sexually explicit.
