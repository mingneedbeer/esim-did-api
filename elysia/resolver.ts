import { store } from "../src/store"
import type { DIDDocument, DIDResolutionResult } from "../src/types"

const DID_CONTEXT = "https://www.w3.org/ns/did/v1"
const ESIM_CONTEXT = "https://ns.did.ai/esim/"

export class DIDResolver {
  resolve(did: string): DIDResolutionResult {
    const doc = store.getDID(did)
    if (!doc) {
      return {
        "@context": DID_CONTEXT,
        didResolutionMetadata: {
          contentType: "application/did+json",
          resolved: false,
        },
        didDocument: null,
        didDocumentMetadata: {
          created: "",
          updated: "",
        },
      }
    }

    return {
      "@context": DID_CONTEXT,
      didResolutionMetadata: {
        contentType: "application/did+json",
        resolved: true,
      },
      didDocument: doc,
      didDocumentMetadata: {
        created: doc.created,
        updated: doc.updated,
        versionId: "1",
      },
    }
  }

  resolveDIDWeb(did: string): DIDResolutionResult {
    const parsed = this.parseDID(did)
    if (!parsed) {
      return {
        "@context": DID_CONTEXT,
        didResolutionMetadata: {
          contentType: "application/did+json",
          resolved: false,
        },
        didDocument: null,
        didDocumentMetadata: {
          created: "",
          updated: "",
        },
      }
    }

    if (parsed.method === "esim") {
      return this.resolve(did)
    }

    if (parsed.method === "web") {
      return this.resolveWeb(parsed)
    }

    return {
      "@context": DID_CONTEXT,
      didResolutionMetadata: {
        contentType: "application/did+json",
        resolved: false,
      },
      didDocument: null,
      didDocumentMetadata: {
        created: "",
        updated: "",
      },
    }
  }

  private resolveWeb(parsed: { method: string; identifier: string }): DIDResolutionResult {
    const doc: DIDDocument = {
      "@context": [DID_CONTEXT, ESIM_CONTEXT],
      id: `did:web:${parsed.identifier}`,
      controller: `did:web:${parsed.identifier}`,
      verificationMethod: [
        {
          id: `did:web:${parsed.identifier}#key-1`,
          type: "Ed25519VerificationKey2020",
          controller: `did:web:${parsed.identifier}`,
        },
      ],
      authentication: [`did:web:${parsed.identifier}#key-1`],
      assertionMethod: [`did:web:${parsed.identifier}#key-1`],
      capabilityDelegation: [`did:web:${parsed.identifier}#key-1`],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }

    return {
      "@context": DID_CONTEXT,
      didResolutionMetadata: {
        contentType: "application/did+json",
        resolved: true,
      },
      didDocument: doc,
      didDocumentMetadata: {
        created: doc.created,
        updated: doc.updated,
        versionId: "1",
      },
    }
  }

  parseDID(did: string): { method: string; identifier: string } | null {
    const match = did.match(/^did:([a-zA-Z0-9]+):(.+)$/)
    if (!match) return null
    return {
      method: match[1].toLowerCase(),
      identifier: match[2],
    }
  }

  validateDID(did: string): boolean {
    return this.parseDID(did) !== null
  }

  getMethods(): string[] {
    return ["esim", "web", "key", "ion", "peer"]
  }

  getContext(): string[] {
    return [DID_CONTEXT, ESIM_CONTEXT]
  }
}

export const resolver = new DIDResolver()
