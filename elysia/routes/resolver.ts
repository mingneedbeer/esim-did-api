import { Elysia, t } from "elysia"
import { resolver } from "../resolver"

export const resolverRoutes = new Elysia({ prefix: "/resolve" })
  .get(
    "/:did",
    ({ params: { did }, set }) => {
      if (!resolver.validateDID(did)) {
        set.status = 400
        return {
          error: "Bad Request",
          message: "Invalid DID format",
        }
      }

      const result = resolver.resolve(did)

      if (!result.didResolutionMetadata.resolved) {
        set.status = 404
        return {
          error: "Not Found",
          message: `DID ${did} could not be resolved`,
        }
      }

      return result
    },
    {
      detail: { summary: "Resolve a DID", tags: ["DID Resolution"] },
      params: t.Object({
        did: t.String({ description: "The DID to resolve" }),
      }),
    }
  )
  .get(
    "/web/:domain/*",
    ({ params, set }) => {
      const domain = params.domain
      const path = params["*"] || ""
      const did = `did:web:${domain}${path ? `:${path}` : ""}`

      const result = resolver.resolveDIDWeb(did)

      if (!result.didResolutionMetadata.resolved) {
        set.status = 404
        return {
          error: "Not Found",
          message: `DID ${did} could not be resolved`,
        }
      }

      return result
    },
    {
      detail: { summary: "Resolve a did:web DID", tags: ["DID Resolution"] },
      params: t.Object({
        domain: t.String({ description: "The domain for did:web" }),
        "*": t.String({ description: "Optional path components" }),
      }),
    }
  )
  .post(
    "/",
    ({ body, set }) => {
      const { did } = body

      if (!resolver.validateDID(did)) {
        set.status = 400
        return {
          error: "Bad Request",
          message: "Invalid DID format",
        }
      }

      const result = resolver.resolve(did)

      if (!result.didResolutionMetadata.resolved) {
        set.status = 404
        return {
          error: "Not Found",
          message: `DID ${did} could not be resolved`,
        }
      }

      return result
    },
    {
      detail: { summary: "Resolve a DID via POST", tags: ["DID Resolution"] },
      body: t.Object({
        did: t.String({ description: "The DID to resolve" }),
      }),
    }
  )
  .get(
    "/methods",
    () => {
      return {
        methods: resolver.getMethods(),
        context: resolver.getContext(),
      }
    },
    {
      detail: { summary: "List supported DID methods", tags: ["DID Resolution"] },
    }
  )
