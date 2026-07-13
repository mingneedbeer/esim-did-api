# did:esim Method Specification

**Version:** 1.0.0  
**Status:** Registered  
**Author:** mingderwang  
**Contact:** [your-email]  
**Specification:** https://github.com/mingderwang/esim-did-sdk/blob/main/spec/did-esim-method-spec.md

## Abstract

The `did:esim` DID method enables the creation and management of Decentralized Identifiers (DIDs) associated with eSIM profiles. This method links DIDs to mobile network identities, enabling decentralized identity management for mobile devices and IoT connectivity.

## DID Method Name

The method name is `esim` (i.e., DIDs that start with `did:esim`).

## DID Syntax

```
did:esim:{unique-identifier}
```

### Unique Identifier

The unique identifier is a 32-character hexadecimal string generated using a UUID v4 (with hyphens removed). This ensures uniqueness and sufficient entropy.

**Format:** `[0-9a-f]{32}`

**Example:** `did:esim:f3ba074d9d0f486da203ba52f7818a78`

## DID Document

The DID Document conforms to the [W3C DID Core 1.0](https://www.w3.org/TR/did-core/) specification.

### Context

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://ns.did.ai/esim/"
  ]
}
```

### DID Document Structure

```json
{
  "@context": ["https://www.w3.org/ns/did/v1", "https://ns.did.ai/esim/"],
  "id": "did:esim:f3ba074d9d0f486da203ba52f7818a78",
  "controller": "did:esim:f3ba074d9d0f486da203ba52f7818a78",
  "verificationMethod": [
    {
      "id": "did:esim:f3ba074d9d0f486da203ba52f7818a78#key-1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:esim:f3ba074d9d0f486da203ba52f7818a78",
      "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
    }
  ],
  "authentication": ["did:esim:f3ba074d9d0f486da203ba52f7818a78#key-1"],
  "assertionMethod": ["did:esim:f3ba074d9d0f486da203ba52f7818a78#key-1"],
  "capabilityDelegation": ["did:esim:f3ba074d9d0f486da203ba52f7818a78#key-1"],
  "service": [
    {
      "id": "#messaging",
      "type": "MessagingService",
      "serviceEndpoint": "https://example.com"
    }
  ],
  "created": "2026-07-12T08:08:56.233Z",
  "updated": "2026-07-12T08:08:56.233Z"
}
```

### Verification Methods

The `did:esim` method supports:

- `Ed25519VerificationKey2020` (default)
- `JsonWebKey2020` (optional)

### Service Endpoints

Service endpoints can be added to the DID Document to advertise connectivity services, messaging, or other capabilities.

## CRUD Operations

### Create

**Endpoint:** `POST /api/dids`

**Request:**

```json
{
  "method": "esim",
  "publicKey": "optional-custom-key",
  "service": [
    {
      "id": "#messaging",
      "type": "MessagingService",
      "serviceEndpoint": "https://example.com"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "did": "did:esim:f3ba074d9d0f486da203ba52f7818a78",
  "document": {
    "@context": ["https://www.w3.org/ns/did/v1", "https://ns.did.ai/esim/"],
    "id": "did:esim:f3ba074d9d0f486da203ba52f7818a78",
    "controller": "did:esim:f3ba074d9d0f486da203ba52f7818a78",
    "verificationMethod": [...],
    "authentication": [...],
    "assertionMethod": [...],
    "capabilityDelegation": [...],
    "service": [...],
    "created": "2026-07-12T08:08:56.233Z",
    "updated": "2026-07-12T08:08:56.233Z"
  }
}
```

### Read / Resolve

**Endpoint:** `GET /api/resolve/{did}`

**Response (200 OK):**

```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "didResolutionMetadata": {
    "contentType": "application/did+json",
    "resolved": true
  },
  "didDocument": { ... },
  "didDocumentMetadata": {
    "created": "2026-07-12T08:08:56.233Z",
    "updated": "2026-07-12T08:08:56.233Z",
    "versionId": "1"
  }
}
```

### Update

**Endpoint:** `PUT /api/dids/{did}`

**Request:**

```json
{
  "publicKey": "new-public-key",
  "service": [
    {
      "id": "#messaging",
      "type": "MessagingService",
      "serviceEndpoint": "https://new-endpoint.com"
    }
  ]
}
```

**Response (200 OK):** Updated DID Document

### Delete

**Endpoint:** `DELETE /api/dids/{did}`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "DID did:esim:f3ba074d9d0f486da203ba52f7818a78 deleted"
}
```

## eSIM Profile Integration

The `did:esim` method uniquely integrates DID management with eSIM profile lifecycle:

### Profile Lifecycle

```
pending → activating → active → suspending → suspended
                    ↓                    ↓
               deactivating → deactivated
```

### Profile Status Transitions

| From State | To State | Action |
|------------|----------|--------|
| pending, suspended, deactivated, failed | active | `/activate` |
| active, pending, suspended | deactivated | `/deactivate` |
| active | suspended | `/suspend` |

### Profile Structure

```json
{
  "iccid": "89860123456789012345",
  "eid": "890490123456789012345",
  "did": "did:esim:f3ba074d9d0f486da203ba52f7818a78",
  "iccidHash": "sha256:0x1234567890abcdef",
  "profileType": "mno",
  "status": "active",
  "carrier": "T-Mobile",
  "plan": "Premium",
  "activationCode": "1$ABCD.EFGH.IJKL:0",
  "smdpAddress": "smdp.example.com",
  "metadata": {
    "msisdn": "+15551234567",
    "mcc": "310",
    "mnc": "260"
  },
  "createdAt": "2026-07-12T08:08:56.233Z",
  "updatedAt": "2026-07-12T08:08:56.233Z"
}
```

### Profile Types

- `mno` - Mobile Network Operator
- `mvno` - Mobile Virtual Network Operator
- `iot` - Internet of Things
- `test` - Testing profile

## Universal Resolver

### Driver

A [Universal Resolver](https://dev.uniresolver.io/) driver is available:

- **Docker Image:** `mingderwang/uni-resolver-driver-did-esim:0.1`
- **Source:** [uniresolver-did-esim/](./uniresolver-did-esim/)

### Usage

```bash
# Local driver
docker run -p 8080:8080 mingderwang/uni-resolver-driver-did-esim:0.1

# Resolve a DID
curl http://localhost:8080/1.0/identifiers/did:esim:f3ba074d9d0f486da203ba52f7818a78
```

## Security Considerations

1. **Key Management:** Private keys must be stored securely. The reference implementation uses an in-memory store for demonstration only.

2. **Authentication:** API endpoints should implement proper authentication (OAuth 2.0, API keys, etc.) before production use.

3. **Transport Security:** All API communication MUST use HTTPS.

4. **Profile Binding:** The DID-to-eSIM profile binding establishes trust between decentralized identity and mobile network identity.

5. **Revocation:** DIDs can be deleted, but eSIM profiles may persist independently at the carrier level.

## Privacy Considerations

1. **Personal Data:** eSIM metadata (MSISDN, IMSI) constitutes personal data and must be handled in compliance with GDPR, CCPA, and local regulations.

2. **Correlation:** Multiple eSIM profiles linked to the same DID may enable correlation. Users should be aware of this risk.

3. **Data Minimization:** Only necessary metadata should be stored and associated with DIDs.

## Reference Implementation

- **API:** https://esim-did-api.vercel.app/api/
- **Source Code:** https://github.com/mingderwang/esim-did-sdk

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-12 | Initial specification |
