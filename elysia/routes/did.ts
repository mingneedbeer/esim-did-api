import { Elysia, t } from "elysia"
import { v4 as uuidv4 } from "uuid"
import { store } from "../../src/store"
import type { DIDDocument, CreateDIDRequest, UpdateDIDRequest } from "../../src/types"

const DID_CONTEXT = "https://www.w3.org/ns/did/v1"
const ESIM_CONTEXT = "https://ns.did.ai/esim/"

function generateDID(method = "esim"): string {
  const id = uuidv4().replace(/-/g, "").slice(0, 32)
  return `did:${method}:${id}`
}

function createDIDDocument(
  did: string,
  publicKey?: string,
  services?: { id: string; type: string; serviceEndpoint: string }[]
): DIDDocument {
  const now = new Date().toISOString()
  return {
    "@context": [DID_CONTEXT, ESIM_CONTEXT],
    id: did,
    controller: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyMultibase: publicKey || `z${uuidv4().replace(/-/g, "")}`,
      },
    ],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
    capabilityDelegation: [`${did}#key-1`],
    service: services,
    created: now,
    updated: now,
  }
}

export const didRoutes = new Elysia({ prefix: "/dids" })
  .get(
    "/",
    ({ query }) => {
      const { page = 1, pageSize = 20 } = query
      const result = store.listDIDs(page, pageSize)
      return {
        data: result.data,
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
      }
    },
    {
      detail: { summary: "List all DIDs", tags: ["DID Management"] },
      query: t.Object({
        page: t.Optional(t.Number({ default: 1 })),
        pageSize: t.Optional(t.Number({ default: 20 })),
      }),
    }
  )
  .post(
    "/",
    ({ body }) => {
      const did = generateDID(body.method)
      const doc = createDIDDocument(did, body.publicKey, body.service)
      store.setDID(did, doc)
      return { did, document: doc }
    },
    {
      detail: { summary: "Create a new DID", tags: ["DID Management"] },
      body: t.Object({
        method: t.Optional(t.String({ default: "esim" })),
        publicKey: t.Optional(t.String()),
        service: t.Optional(
          t.Array(
            t.Object({
              id: t.String(),
              type: t.String(),
              serviceEndpoint: t.String(),
            })
          )
        ),
      }),
    }
  )
  .get(
    "/:did",
    ({ params: { did }, set }) => {
      const doc = store.getDID(did)
      if (!doc) {
        set.status = 404
        return { error: "Not Found", message: `DID ${did} not found` }
      }
      return doc
    },
    {
      detail: { summary: "Get a DID document", tags: ["DID Management"] },
      params: t.Object({
        did: t.String({ description: "The DID to resolve" }),
      }),
    }
  )
  .put(
    "/:did",
    ({ params: { did }, body, set }) => {
      const existing = store.getDID(did)
      if (!existing) {
        set.status = 404
        return { error: "Not Found", message: `DID ${did} not found` }
      }

      const updated: DIDDocument = {
        ...existing,
        updated: new Date().toISOString(),
      }

      if (body.publicKey) {
        updated.verificationMethod = [
          {
            id: `${did}#key-1`,
            type: "Ed25519VerificationKey2020",
            controller: did,
            publicKeyMultibase: body.publicKey,
          },
        ]
      }

      if (body.service) {
        updated.service = body.service
      }

      store.setDID(did, updated)
      return updated
    },
    {
      detail: { summary: "Update a DID document", tags: ["DID Management"] },
      params: t.Object({
        did: t.String({ description: "The DID to update" }),
      }),
      body: t.Object({
        publicKey: t.Optional(t.String()),
        service: t.Optional(
          t.Array(
            t.Object({
              id: t.String(),
              type: t.String(),
              serviceEndpoint: t.String(),
            })
          )
        ),
      }),
    }
  )
  .delete(
    "/:did",
    ({ params: { did }, set }) => {
      const deleted = store.deleteDID(did)
      if (!deleted) {
        set.status = 404
        return { error: "Not Found", message: `DID ${did} not found` }
      }
      return { success: true, message: `DID ${did} deleted` }
    },
    {
      detail: { summary: "Delete a DID", tags: ["DID Management"] },
      params: t.Object({
        did: t.String({ description: "The DID to delete" }),
      }),
    }
  )
  .post(
    "/:did/rotate-key",
    ({ params: { did }, set }) => {
      const existing = store.getDID(did)
      if (!existing) {
        set.status = 404
        return { error: "Not Found", message: `DID ${did} not found` }
      }

      const newKeyId = `${did}#key-${Date.now()}`
      const newKey = {
        id: newKeyId,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyMultibase: `z${uuidv4().replace(/-/g, "")}`,
      }

      existing.verificationMethod.push(newKey)
      existing.authentication.push(newKeyId)
      existing.assertionMethod.push(newKeyId)
      existing.updated = new Date().toISOString()

      store.setDID(did, existing)
      return { did: existing, newKey }
    },
    {
      detail: { summary: "Rotate DID verification key", tags: ["DID Management"] },
      params: t.Object({
        did: t.String({ description: "The DID to rotate key for" }),
      }),
    }
  )
