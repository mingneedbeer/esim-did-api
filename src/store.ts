import type { DIDDocument, eSIMProfile } from "./types"

class Store {
  private dids: Map<string, DIDDocument> = new Map()
  private profiles: Map<string, eSIMProfile> = new Map()
  private iccidIndex: Map<string, string> = new Map()
  private didProfilesIndex: Map<string, Set<string>> = new Map()

  getDID(id: string): DIDDocument | undefined {
    return this.dids.get(id)
  }

  setDID(id: string, doc: DIDDocument): void {
    this.dids.set(id, doc)
  }

  deleteDID(id: string): boolean {
    return this.dids.delete(id)
  }

  listDIDs(page = 1, pageSize = 20): { data: DIDDocument[]; total: number } {
    const all = Array.from(this.dids.values())
    const start = (page - 1) * pageSize
    return {
      data: all.slice(start, start + pageSize),
      total: all.length,
    }
  }

  getProfile(iccid: string): eSIMProfile | undefined {
    return this.profiles.get(iccid)
  }

  setProfile(iccid: string, profile: eSIMProfile): void {
    this.profiles.set(iccid, profile)
    this.iccidIndex.set(profile.eid, iccid)

    if (!this.didProfilesIndex.has(profile.did)) {
      this.didProfilesIndex.set(profile.did, new Set())
    }
    this.didProfilesIndex.get(profile.did)!.add(iccid)
  }

  deleteProfile(iccid: string): boolean {
    const profile = this.profiles.get(iccid)
    if (profile) {
      this.iccidIndex.delete(profile.eid)
      const didSet = this.didProfilesIndex.get(profile.did)
      if (didSet) {
        didSet.delete(iccid)
        if (didSet.size === 0) this.didProfilesIndex.delete(profile.did)
      }
    }
    return this.profiles.delete(iccid)
  }

  getProfileByEID(eid: string): eSIMProfile | undefined {
    const iccid = this.iccidIndex.get(eid)
    return iccid ? this.profiles.get(iccid) : undefined
  }

  getProfilesByDID(did: string): eSIMProfile[] {
    const iccids = this.didProfilesIndex.get(did)
    if (!iccids) return []
    return Array.from(iccids)
      .map((iccid) => this.profiles.get(iccid))
      .filter((p): p is eSIMProfile => p !== undefined)
  }

  listProfiles(page = 1, pageSize = 20): { data: eSIMProfile[]; total: number } {
    const all = Array.from(this.profiles.values())
    const start = (page - 1) * pageSize
    return {
      data: all.slice(start, start + pageSize),
      total: all.length,
    }
  }
}

export const store = new Store()
