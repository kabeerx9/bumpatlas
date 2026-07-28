# Deployment

This starter is deployment-provider neutral, but it includes working Vercel entrypoints for the web app and Fastify API.

## Recommended Shape

| App | Suggested project | Local config | Build command |
| --- | --- | --- | --- |
| Fastify API | `<slug>-server` | `vercel.json` | `pnpm -F server build` |
| Web app | `<slug>-web` | `apps/web/vercel.json` | `pnpm -F web build` |

Native builds are handled separately with EAS from `apps/native`.

## Environment Variables

Server project:

```txt
DATABASE_URL=your-production-pooled-postgres-url
DIRECT_URL=your-production-direct-postgres-url
CLERK_SECRET_KEY=your-clerk-secret-key
CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_WEBHOOK_SIGNING_SECRET=your-clerk-webhook-secret
CORS_ORIGIN=https://<slug>-web.vercel.app
```

Web project:

```txt
VITE_SERVER_URL=https://<slug>-server.vercel.app
VITE_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
```

Native EAS environment:

```txt
EXPO_PUBLIC_SERVER_URL=https://<slug>-server.vercel.app
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
```

## Vercel Notes

The API deploys from the repo root through `api/index.mjs`, which imports the bundled server app from `apps/server/dist/create-app.mjs`.

The web app deploys from `apps/web`. Enable "Include source files outside Root Directory" because the web app imports workspace packages.

Before production deploys, run:

```bash
pnpm run init:project -- --name "Your App" --slug your-app --scope your-app --scheme your-app --bundle-id com.example.yourapp
pnpm run doctor
pnpm -F server check-types
pnpm -F server build
pnpm -F web build
```
