# eSIM DID SDK API

RESTful API for managing Decentralized Identifiers (DIDs) and eSIM profiles, with a Universal Resolver driver for `did:esim`.

**Live API:** https://esim-did-api.vercel.app/api/

## Architecture

```
src/                    # Shared core (types, store, resolver)
  types.ts              # TypeScript interfaces
  store.ts              # In-memory data store
  pages/api/[...slug].ts  # Astro catch-all endpoint (Vercel serverless)
elysia/                 # Elysia app (local dev)
  app.ts                # Elysia app definition
  standalone.ts         # Local dev entry point (Swagger UI)
  routes/
    did.ts              # DID CRUD routes
    esim.ts             # eSIM profile routes
    resolver.ts         # DID resolution routes
uniresolver-did-esim/   # Uni-Resolver driver
  server.js             # Proxy to Vercel API
  Dockerfile            # Docker image
```

## Quick Start

```bash
bun install
```

**Local dev (with Swagger UI):**

```bash
bun run dev          # http://localhost:3000
bun run astro:dev    # http://localhost:4321/api/
```

**Type check:**

```bash
bun run typecheck
```

## API Reference

Base URL: `https://esim-did-api.vercel.app/api/`

### DID Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dids` | List all DIDs (paginated) |
| `POST` | `/api/dids` | Create a new DID |
| `GET` | `/api/dids/:did` | Get a DID document |
| `PUT` | `/api/dids/:did` | Update a DID document |
| `DELETE` | `/api/dids/:did` | Delete a DID |
| `POST` | `/api/dids/:did/rotate-key` | Rotate verification key |

### eSIM Profiles

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profiles` | List profiles (filter by `?did=` or `?status=`) |
| `POST` | `/api/profiles` | Create an eSIM profile |
| `GET` | `/api/profiles/:iccid` | Get profile by ICCID |
| `PUT` | `/api/profiles/:iccid` | Update a profile |
| `DELETE` | `/api/profiles/:iccid` | Delete a profile |
| `POST` | `/api/profiles/:iccid/activate` | Activate profile |
| `POST` | `/api/profiles/:iccid/deactivate` | Deactivate profile |
| `POST` | `/api/profiles/:iccid/suspend` | Suspend profile |
| `GET` | `/api/profiles/:iccid/activation-code` | Get activation code |

### DID Resolution

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/resolve/:did` | Resolve a DID |
| `POST` | `/api/resolve` | Resolve a DID via POST body |
| `GET` | `/api/resolve/methods` | List supported DID methods |

## Examples

### Create a DID

```bash
curl -X POST https://esim-did-api.vercel.app/api/dids \
  -H "Content-Type: application/json" \
  -d '{"method":"esim","service":[{"id":"#messaging","type":"MessagingService","serviceEndpoint":"https://example.com"}]}'
```

### Create an eSIM Profile

```bash
curl -X POST https://esim-did-api.vercel.app/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "did": "did:esim:YOUR_DID_HERE",
    "carrier": "T-Mobile",
    "plan": "Premium",
    "profileType": "mno",
    "metadata": {
      "msisdn": "+15551234567",
      "mcc": "310",
      "mnc": "260"
    }
  }'
```

### Resolve a DID

```bash
curl https://esim-did-api.vercel.app/api/resolve/did:esim:YOUR_DID_HERE
```

## DID Document Structure

```json
{
  "@context": ["https://www.w3.org/ns/did/v1", "https://ns.did.ai/esim/"],
  "id": "did:esim:f3ba074d9d0f486da203ba52f7818a78",
  "controller": "did:esim:f3ba074d9d0f486da203ba52f7818a78",
  "verificationMethod": [{
    "id": "did:esim:f3ba074d9d0f486da203ba52f7818a78#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:esim:f3ba074d9d0f486da203ba52f7818a78",
    "publicKeyMultibase": "z649d83d6a9f34f2e85dffde08f972e97"
  }],
  "authentication": ["did:esim:f3ba074d9d0f486da203ba52f7818a78#key-1"],
  "assertionMethod": ["did:esim:f3ba074d9d0f486da203ba52f7818a78#key-1"],
  "capabilityDelegation": ["did:esim:f3ba074d9d0f486da203ba52f7818a78#key-1"],
  "service": [{"id":"#messaging","type":"MessagingService","serviceEndpoint":"https://example.com"}],
  "created": "2026-07-12T08:08:56.233Z",
  "updated": "2026-07-12T08:08:56.233Z"
}
```

## eSIM Profile Status Lifecycle

```
pending → activating → active → suspending → suspended
                    ↓                    ↑
               deactivating → deactivated
```

Valid transitions enforced by the API:
- `pending`, `suspended`, `deactivated`, `failed` → `active` (via `/activate`)
- `active`, `pending`, `suspended` → `deactivated` (via `/deactivate`)
- `active` → `suspended` (via `/suspend`)

## Uni-Resolver Driver

A [Universal Resolver](https://dev.uniresolver.io/) driver for `did:esim` is included in `uniresolver-did-esim/`.

```bash
cd uniresolver-did-esim

# Run directly
node server.js   # http://localhost:8080

# Or with Docker
docker build -t uni-resolver-driver-did-esim:0.1 .
docker run -p 8080:8080 uni-resolver-driver-did-esim:0.1
```

Resolve via the driver:

```bash
curl http://localhost:8080/1.0/identifiers/did:esim:YOUR_DID_HERE
```

## Tech Stack

- [Bun](https://bun.sh/) - Runtime
- [Elysia](https://elysiajs.com/) - Local dev framework + Swagger UI
- [Astro](https://astro.build/) - Vercel serverless adapter
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## License

MIT
