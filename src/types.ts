export interface DIDDocument {
  "@context": string[]
  id: string
  controller: string
  verificationMethod: VerificationMethod[]
  authentication: string[]
  assertionMethod: string[]
  capabilityDelegation: string[]
  service?: ServiceEndpoint[]
  created: string
  updated: string
}

export interface VerificationMethod {
  id: string
  type: string
  controller: string
  publicKeyMultibase?: string
  publicKeyJwk?: Record<string, unknown>
}

export interface ServiceEndpoint {
  id: string
  type: string
  serviceEndpoint: string
}

export interface DIDResolutionResult {
  "@context": string
  didResolutionMetadata: {
    contentType: string
    resolved?: boolean
  }
  didDocument: DIDDocument | null
  didDocumentMetadata: {
    created: string
    updated: string
    versionId?: string
  }
}

export type DIDMethod = "esim"

export interface CreateDIDRequest {
  method?: DIDMethod
  publicKey?: string
  service?: ServiceEndpoint[]
}

export interface UpdateDIDRequest {
  publicKey?: string
  service?: ServiceEndpoint[]
}

export interface eSIMProfile {
  iccid: string
  eid: string
  did: string
  iccidHash: string
  profileType: eSIMProfileType
  status: eSIMProfileStatus
  carrier: string
  plan: string
  activationCode?: string
  smdpAddress?: string
  metadata: eSIMProfileMetadata
  createdAt: string
  updatedAt: string
}

export type eSIMProfileType = "mno" | "mvno" | "iot" | "test"
export type eSIMProfileStatus =
  | "pending"
  | "activating"
  | "active"
  | "suspended"
  | "deactivating"
  | "deactivated"
  | "failed"

export interface eSIMProfileMetadata {
  imsi?: string
  msisdn?: string
  mcc?: string
  mnc?: string
  spn?: string
  pnn?: string
  apn?: string[]
  rat?: string[]
  preferredNetwork?: string[]
}

export interface CreateProfileRequest {
  did: string
  carrier: string
  plan: string
  profileType: eSIMProfileType
  metadata?: Partial<eSIMProfileMetadata>
}

export interface UpdateProfileRequest {
  carrier?: string
  plan?: string
  status?: eSIMProfileStatus
  metadata?: Partial<eSIMProfileMetadata>
}

export interface APIError {
  error: string
  message: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
