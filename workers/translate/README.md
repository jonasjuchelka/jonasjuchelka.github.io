# Live translation proxy

Cloudflare Worker between the static site and the Claude API. The API key is a Worker secret, never part of the site.

```sh
cd workers/translate
npx wrangler secret put ANTHROPIC_API_KEY   # asks for the key, nothing is written to disk
npx wrangler deploy                         # prints https://jonas-translate.<account>.workers.dev
```

Then set the repository variable `TRANSLATE_ENDPOINT` (GitHub → Settings → Secrets and variables → Actions → Variables) to that URL and rebuild. Without it, the live option stays hidden.

Safeguards: origin allow-list (only jonasjuchelka.github.io), size limits, per-IP rate limit, no logging of texts. **Also set a monthly spend limit for this key in the Anthropic Console.** The origin check only stops other websites, not scripts.
