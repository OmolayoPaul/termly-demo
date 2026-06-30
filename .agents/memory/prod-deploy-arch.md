---
name: Production deployment architecture
description: How Termly runs in production on Replit — why node-server preset is required and how the dual-process gateway works
---

The `@lovable.dev/vite-tanstack-config` package defaults Nitro to the `cloudflare-module` preset. On Replit this must be overridden.

**Why:** The Cloudflare Workers build (`wrangler.json`) cannot be run with `node` or `vite preview`. It produces a Worker module, not a Node.js HTTP server. Replit autoscale needs a real TCP listener on port 5000.

**Fix in vite.config.ts:**
```ts
nitro: { preset: "node-server" }
```
This makes the build output `.output/server/index.mjs` — a self-contained Node.js HTTP server using srvx/H3.

**Production run command (in .replit [deployment]):**
```
bash -c "NITRO_PORT=3002 node .output/server/index.mjs & NODE_ENV=production PORT=5000 node server/index.js"
```

**How to apply:**
- Nitro SSR server: port 3002 (internal only, reads `NITRO_PORT`)
- Express gateway: port 5000 (public, reads `PORT`)
- Express handles `/api/*` and `/api/webhooks/*` directly
- Express proxies all other requests to Nitro on 3002 using Node.js built-in `http.request` (no extra packages)
- Dev mode: Express uses port 3001, Vite dev server proxies `/api/*` to it
- `IS_PROD = process.env.NODE_ENV === 'production'` controls the branch in `server/index.js`
