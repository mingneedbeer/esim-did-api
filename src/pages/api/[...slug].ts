import type { APIRoute } from "astro"
import { v4 as uuidv4 } from "uuid"
import { store } from "../../store"

function generateDID(method = "esim"): string {
  const id = uuidv4().replace(/-/g, "").slice(0, 32)
  return `did:${method}:${id}`
}

function generateICCID(): string {
  let iccid = "89"
  for (let i = 0; i < 18; i++) iccid += Math.floor(Math.random() * 10).toString()
  return iccid
}

function generateEID(): string {
  let eid = "890490"
  for (let i = 0; i < 13; i++) eid += Math.floor(Math.random() * 10).toString()
  return eid
}

function hashICCID(iccid: string): string {
  let hash = 0
  for (let i = 0; i < iccid.length; i++) {
    hash = (hash << 5) - hash + iccid.charCodeAt(i)
    hash |= 0
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(16, "0")}`
}

function generateActivationCode(): string {
  const raw = uuidv4().replace(/-/g, "").slice(0, 44)
  return `1$${raw.slice(0, 10)}.${raw.slice(10, 20)}.${raw.slice(20, 34)}:0`
}

function createDIDDocument(did: string, publicKey?: string, services?: { id: string; type: string; serviceEndpoint: string }[]) {
  const now = new Date().toISOString()
  return {
    "@context": ["https://www.w3.org/ns/did/v1", "https://ns.did.ai/esim/"],
    id: did,
    controller: did,
    verificationMethod: [{
      id: `${did}#key-1`,
      type: "Ed25519VerificationKey2020",
      controller: did,
      publicKeyMultibase: publicKey || `z${uuidv4().replace(/-/g, "")}`,
    }],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
    capabilityDelegation: [`${did}#key-1`],
    service: services,
    created: now,
    updated: now,
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })

// GET /api/
export const GET: APIRoute = async ({ url, params, request }) => {
  const path = url.pathname.replace(/^\/api\/?/, "")

  // Root
  if (path === "" || path === "/") {
    return json({
      name: "eSIM DID SDK API",
      version: "1.0.0",
      docs: "/api/docs",
      health: "/api/health",
      endpoints: { dids: "/api/dids", profiles: "/api/profiles", resolve: "/api/resolve" },
    })
  }

  // Health
  if (path === "health") {
    return json({ status: "healthy", timestamp: new Date().toISOString() })
  }

  // DID list
  if (path === "dids") {
    const page = Number(url.searchParams.get("page") || 1)
    const pageSize = Number(url.searchParams.get("pageSize") || 20)
    const result = store.listDIDs(page, pageSize)
    return json({ data: result.data, total: result.total, page, pageSize, totalPages: Math.ceil(result.total / pageSize) })
  }

  // Resolve methods
  if (path === "resolve/methods") {
    return json({ methods: ["esim", "web", "key", "ion", "peer"], context: ["https://www.w3.org/ns/did/v1", "https://ns.did.ai/esim/"] })
  }

  // Resolve DID
  if (path.startsWith("resolve/")) {
    const did = decodeURIComponent(path.slice(8))
    const doc = store.getDID(did)
    if (!doc) return json({ "@context": "https://www.w3.org/ns/did/v1", didResolutionMetadata: { contentType: "application/did+json", resolved: false }, didDocument: null, didDocumentMetadata: { created: "", updated: "" } }, 404)
    return json({ "@context": "https://www.w3.org/ns/did/v1", didResolutionMetadata: { contentType: "application/did+json", resolved: true }, didDocument: doc, didDocumentMetadata: { created: doc.created, updated: doc.updated, versionId: "1" } })
  }

  // Get single DID
  if (path.startsWith("dids/")) {
    const did = decodeURIComponent(path.slice(5))
    const doc = store.getDID(did)
    if (!doc) return json({ error: "Not Found", message: `DID ${did} not found` }, 404)
    return json(doc)
  }

  // Profile list
  if (path === "profiles") {
    const page = Number(url.searchParams.get("page") || 1)
    const pageSize = Number(url.searchParams.get("pageSize") || 20)
    const status = url.searchParams.get("status")
    const did = url.searchParams.get("did")

    if (did) {
      const profiles = store.getProfilesByDID(did)
      return json({ data: profiles, total: profiles.length, page: 1, pageSize: profiles.length, totalPages: 1 })
    }

    let result = store.listProfiles(page, pageSize)
    if (status) result = { data: result.data.filter((p) => p.status === status), total: result.data.filter((p) => p.status === status).length }
    return json({ data: result.data, total: result.total, page, pageSize, totalPages: Math.ceil(result.total / pageSize) })
  }

  // Get single profile
  if (path.startsWith("profiles/") && !path.includes("/activate") && !path.includes("/deactivate") && !path.includes("/suspend") && !path.includes("/activation-code")) {
    const iccid = path.slice(9)
    const profile = store.getProfile(iccid)
    if (!profile) return json({ error: "Not Found", message: `Profile ${iccid} not found` }, 404)
    return json(profile)
  }

  // Activation code
  if (path.endsWith("/activation-code")) {
    const iccid = path.replace("/activation-code", "").replace("profiles/", "")
    const profile = store.getProfile(iccid)
    if (!profile) return json({ error: "Not Found", message: `Profile ${iccid} not found` }, 404)
    return json({ activationCode: profile.activationCode, smdpAddress: profile.smdpAddress, eid: profile.eid })
  }

  return json({ error: "Not Found", message: `Path /${path} not found` }, 404)
}

// POST /api/
export const POST: APIRoute = async ({ url, request }) => {
  const path = url.pathname.replace(/^\/api\/?/, "")
  const body = await request.json().catch(() => ({}))

  // Create DID
  if (path === "dids") {
    const did = generateDID(body.method)
    const doc = createDIDDocument(did, body.publicKey, body.service)
    store.setDID(did, doc as any)
    return json({ did, document: doc }, 201)
  }

  // Create profile
  if (path === "profiles") {
    if (!store.getDID(body.did)) return json({ error: "Not Found", message: `DID ${body.did} not found` }, 404)
    const iccid = generateICCID()
    const eid = generateEID()
    const profile = {
      iccid, eid, did: body.did, iccidHash: hashICCID(iccid),
      profileType: body.profileType, status: "pending" as const,
      carrier: body.carrier, plan: body.plan,
      activationCode: generateActivationCode(), smdpAddress: "smdp.example.com",
      metadata: body.metadata || {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    store.setProfile(iccid, profile)
    return json(profile, 201)
  }

  // Activate
  if (path.endsWith("/activate")) {
    const iccid = path.replace("/activate", "").replace("profiles/", "")
    const profile = store.getProfile(iccid)
    if (!profile) return json({ error: "Not Found", message: `Profile ${iccid} not found` }, 404)
    if (["active", "activating", "deactivating"].includes(profile.status)) return json({ error: "Conflict", message: `Cannot activate profile in ${profile.status} state` }, 409)
    profile.status = "active"
    profile.updatedAt = new Date().toISOString()
    store.setProfile(iccid, profile)
    return json(profile)
  }

  // Deactivate
  if (path.endsWith("/deactivate")) {
    const iccid = path.replace("/deactivate", "").replace("profiles/", "")
    const profile = store.getProfile(iccid)
    if (!profile) return json({ error: "Not Found", message: `Profile ${iccid} not found` }, 404)
    if (["deactivated", "deactivating", "activating"].includes(profile.status)) return json({ error: "Conflict", message: `Cannot deactivate profile in ${profile.status} state` }, 409)
    profile.status = "deactivated"
    profile.updatedAt = new Date().toISOString()
    store.setProfile(iccid, profile)
    return json(profile)
  }

  // Suspend
  if (path.endsWith("/suspend")) {
    const iccid = path.replace("/suspend", "").replace("profiles/", "")
    const profile = store.getProfile(iccid)
    if (!profile) return json({ error: "Not Found", message: `Profile ${iccid} not found` }, 404)
    if (profile.status !== "active") return json({ error: "Conflict", message: `Cannot suspend profile in ${profile.status} state` }, 409)
    profile.status = "suspended"
    profile.updatedAt = new Date().toISOString()
    store.setProfile(iccid, profile)
    return json(profile)
  }

  // Resolve DID (POST)
  if (path === "resolve") {
    const { did } = body
    const doc = store.getDID(did)
    if (!doc) return json({ "@context": "https://www.w3.org/ns/did/v1", didResolutionMetadata: { contentType: "application/did+json", resolved: false }, didDocument: null, didDocumentMetadata: { created: "", updated: "" } }, 404)
    return json({ "@context": "https://www.w3.org/ns/did/v1", didResolutionMetadata: { contentType: "application/did+json", resolved: true }, didDocument: doc, didDocumentMetadata: { created: doc.created, updated: doc.updated, versionId: "1" } })
  }

  return json({ error: "Not Found" }, 404)
}

// PUT /api/
export const PUT: APIRoute = async ({ url, request }) => {
  const path = url.pathname.replace(/^\/api\/?/, "")
  const body = await request.json().catch(() => ({}))

  if (path.startsWith("dids/")) {
    const did = decodeURIComponent(path.slice(5))
    const existing = store.getDID(did)
    if (!existing) return json({ error: "Not Found", message: `DID ${did} not found` }, 404)
    const updated = { ...existing, updated: new Date().toISOString() }
    if (body.publicKey) {
      updated.verificationMethod = [{ id: `${did}#key-1`, type: "Ed25519VerificationKey2020", controller: did, publicKeyMultibase: body.publicKey }]
    }
    if (body.service) updated.service = body.service
    store.setDID(did, updated)
    return json(updated)
  }

  if (path.startsWith("profiles/")) {
    const iccid = path.slice(9)
    const existing = store.getProfile(iccid)
    if (!existing) return json({ error: "Not Found", message: `Profile ${iccid} not found` }, 404)
    const updated = { ...existing, ...body, metadata: { ...existing.metadata, ...body.metadata }, updatedAt: new Date().toISOString() }
    store.setProfile(iccid, updated)
    return json(updated)
  }

  return json({ error: "Not Found" }, 404)
}

// DELETE /api/
export const DELETE: APIRoute = async ({ url }) => {
  const path = url.pathname.replace(/^\/api\/?/, "")

  if (path.startsWith("dids/")) {
    const did = decodeURIComponent(path.slice(5))
    if (!store.deleteDID(did)) return json({ error: "Not Found", message: `DID ${did} not found` }, 404)
    return json({ success: true, message: `DID ${did} deleted` })
  }

  if (path.startsWith("profiles/")) {
    const iccid = path.slice(9)
    if (!store.deleteProfile(iccid)) return json({ error: "Not Found", message: `Profile ${iccid} not found` }, 404)
    return json({ success: true, message: `Profile ${iccid} deleted` })
  }

  return json({ error: "Not Found" }, 404)
}
