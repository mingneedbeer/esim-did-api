import { Elysia, t } from "elysia"
import { v4 as uuidv4 } from "uuid"
import { store } from "../../src/store"
import type { eSIMProfile, eSIMProfileStatus } from "../../src/types"

function generateICCID(): string {
  let iccid = "89"
  for (let i = 0; i < 18; i++) {
    iccid += Math.floor(Math.random() * 10).toString()
  }
  return iccid
}

function generateEID(): string {
  let eid = "890490"
  for (let i = 0; i < 13; i++) {
    eid += Math.floor(Math.random() * 10).toString()
  }
  return eid
}

function hashICCID(iccid: string): string {
  let hash = 0
  for (let i = 0; i < iccid.length; i++) {
    const char = iccid.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(16, "0")}`
}

function generateActivationCode(): string {
  const match = uuidv4().replace(/-/g, "").slice(0, 44)
  return `1$${match.slice(0, 10)}.${match.slice(10, 20)}.${match.slice(20, 34)}:0`
}

export const esimRoutes = new Elysia({ prefix: "/profiles" })
  .get(
    "/",
    ({ query }) => {
      const { page = 1, pageSize = 20, status, did } = query

      if (did) {
        const profiles = store.getProfilesByDID(did)
        return {
          data: profiles,
          total: profiles.length,
          page: 1,
          pageSize: profiles.length,
          totalPages: 1,
        }
      }

      let result = store.listProfiles(page, pageSize)

      if (status) {
        result = {
          data: result.data.filter((p) => p.status === status),
          total: result.data.filter((p) => p.status === status).length,
        }
      }

      return {
        data: result.data,
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
      }
    },
    {
      detail: { summary: "List eSIM profiles", tags: ["eSIM Profiles"] },
      query: t.Object({
        page: t.Optional(t.Number({ default: 1 })),
        pageSize: t.Optional(t.Number({ default: 20 })),
        status: t.Optional(t.String()),
        did: t.Optional(t.String({ description: "Filter by DID" })),
      }),
    }
  )
  .post(
    "/",
    ({ body, set }) => {
      const existingDID = store.getDID(body.did)
      if (!existingDID) {
        set.status = 404
        return { error: "Not Found", message: `DID ${body.did} not found` }
      }

      const iccid = generateICCID()
      const eid = generateEID()

      const profile: eSIMProfile = {
        iccid,
        eid,
        did: body.did,
        iccidHash: hashICCID(iccid),
        profileType: body.profileType,
        status: "pending",
        carrier: body.carrier,
        plan: body.plan,
        activationCode: generateActivationCode(),
        smdpAddress: "smdp.example.com",
        metadata: {
          ...body.metadata,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      store.setProfile(iccid, profile)
      return profile
    },
    {
      detail: { summary: "Create an eSIM profile", tags: ["eSIM Profiles"] },
      body: t.Object({
        did: t.String({ description: "DID to associate with" }),
        carrier: t.String(),
        plan: t.String(),
        profileType: t.Union([
          t.Literal("mno"),
          t.Literal("mvno"),
          t.Literal("iot"),
          t.Literal("test"),
        ]),
        metadata: t.Optional(
          t.Object({
            imsi: t.Optional(t.String()),
            msisdn: t.Optional(t.String()),
            mcc: t.Optional(t.String()),
            mnc: t.Optional(t.String()),
            spn: t.Optional(t.String()),
            pnn: t.Optional(t.String()),
            apn: t.Optional(t.Array(t.String())),
            rat: t.Optional(t.Array(t.String())),
            preferredNetwork: t.Optional(t.Array(t.String())),
          })
        ),
      }),
    }
  )
  .get(
    "/:iccid",
    ({ params: { iccid }, set }) => {
      const profile = store.getProfile(iccid)
      if (!profile) {
        set.status = 404
        return { error: "Not Found", message: `Profile ${iccid} not found` }
      }
      return profile
    },
    {
      detail: { summary: "Get an eSIM profile by ICCID", tags: ["eSIM Profiles"] },
      params: t.Object({
        iccid: t.String({ description: "The ICCID of the profile" }),
      }),
    }
  )
  .put(
    "/:iccid",
    ({ params: { iccid }, body, set }) => {
      const existing = store.getProfile(iccid)
      if (!existing) {
        set.status = 404
        return { error: "Not Found", message: `Profile ${iccid} not found` }
      }

      const updated: eSIMProfile = {
        ...existing,
        ...body,
        metadata: {
          ...existing.metadata,
          ...body.metadata,
        },
        updatedAt: new Date().toISOString(),
      }

      store.setProfile(iccid, updated)
      return updated
    },
    {
      detail: { summary: "Update an eSIM profile", tags: ["eSIM Profiles"] },
      params: t.Object({
        iccid: t.String({ description: "The ICCID of the profile" }),
      }),
      body: t.Object({
        carrier: t.Optional(t.String()),
        plan: t.Optional(t.String()),
        status: t.Optional(
          t.Union([
            t.Literal("pending"),
            t.Literal("activating"),
            t.Literal("active"),
            t.Literal("suspended"),
            t.Literal("deactivating"),
            t.Literal("deactivated"),
            t.Literal("failed"),
          ])
        ),
        metadata: t.Optional(
          t.Object({
            imsi: t.Optional(t.String()),
            msisdn: t.Optional(t.String()),
            mcc: t.Optional(t.String()),
            mnc: t.Optional(t.String()),
            spn: t.Optional(t.String()),
            pnn: t.Optional(t.String()),
            apn: t.Optional(t.Array(t.String())),
            rat: t.Optional(t.Array(t.String())),
            preferredNetwork: t.Optional(t.Array(t.String())),
          })
        ),
      }),
    }
  )
  .delete(
    "/:iccid",
    ({ params: { iccid }, set }) => {
      const deleted = store.deleteProfile(iccid)
      if (!deleted) {
        set.status = 404
        return { error: "Not Found", message: `Profile ${iccid} not found` }
      }
      return { success: true, message: `Profile ${iccid} deleted` }
    },
    {
      detail: { summary: "Delete an eSIM profile", tags: ["eSIM Profiles"] },
      params: t.Object({
        iccid: t.String({ description: "The ICCID of the profile" }),
      }),
    }
  )
  .post(
    "/:iccid/activate",
    ({ params: { iccid }, set }) => {
      const profile = store.getProfile(iccid)
      if (!profile) {
        set.status = 404
        return { error: "Not Found", message: `Profile ${iccid} not found` }
      }

      const invalidTransitions: eSIMProfileStatus[] = ["active", "activating", "deactivating"]
      if (invalidTransitions.includes(profile.status)) {
        set.status = 409
        return {
          error: "Conflict",
          message: `Cannot activate profile in ${profile.status} state`,
        }
      }

      profile.status = "active"
      profile.updatedAt = new Date().toISOString()
      store.setProfile(iccid, profile)
      return profile
    },
    {
      detail: { summary: "Activate an eSIM profile", tags: ["eSIM Profiles"] },
      params: t.Object({
        iccid: t.String({ description: "The ICCID of the profile" }),
      }),
    }
  )
  .post(
    "/:iccid/deactivate",
    ({ params: { iccid }, set }) => {
      const profile = store.getProfile(iccid)
      if (!profile) {
        set.status = 404
        return { error: "Not Found", message: `Profile ${iccid} not found` }
      }

      const invalidTransitions: eSIMProfileStatus[] = ["deactivated", "deactivating", "activating"]
      if (invalidTransitions.includes(profile.status)) {
        set.status = 409
        return {
          error: "Conflict",
          message: `Cannot deactivate profile in ${profile.status} state`,
        }
      }

      profile.status = "deactivated"
      profile.updatedAt = new Date().toISOString()
      store.setProfile(iccid, profile)
      return profile
    },
    {
      detail: { summary: "Deactivate an eSIM profile", tags: ["eSIM Profiles"] },
      params: t.Object({
        iccid: t.String({ description: "The ICCID of the profile" }),
      }),
    }
  )
  .post(
    "/:iccid/suspend",
    ({ params: { iccid }, set }) => {
      const profile = store.getProfile(iccid)
      if (!profile) {
        set.status = 404
        return { error: "Not Found", message: `Profile ${iccid} not found` }
      }

      if (profile.status !== "active") {
        set.status = 409
        return {
          error: "Conflict",
          message: `Cannot suspend profile in ${profile.status} state`,
        }
      }

      profile.status = "suspended"
      profile.updatedAt = new Date().toISOString()
      store.setProfile(iccid, profile)
      return profile
    },
    {
      detail: { summary: "Suspend an eSIM profile", tags: ["eSIM Profiles"] },
      params: t.Object({
        iccid: t.String({ description: "The ICCID of the profile" }),
      }),
    }
  )
  .get(
    "/:iccid/activation-code",
    ({ params: { iccid }, set }) => {
      const profile = store.getProfile(iccid)
      if (!profile) {
        set.status = 404
        return { error: "Not Found", message: `Profile ${iccid} not found` }
      }

      return {
        activationCode: profile.activationCode,
        smdpAddress: profile.smdpAddress,
        eid: profile.eid,
      }
    },
    {
      detail: { summary: "Get activation code for a profile", tags: ["eSIM Profiles"] },
      params: t.Object({
        iccid: t.String({ description: "The ICCID of the profile" }),
      }),
    }
  )
