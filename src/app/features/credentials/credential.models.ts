export type CredentialVaultMetadata =
  | { initialized: false }
  | {
      initialized: true;
      cryptoVersion: 1;
      kdf: 'PBKDF2-SHA-256';
      kdfIterations: number;
      salt: string;
      keyCheckIv: string;
      keyCheckCiphertext: string;
      createdAt: string;
      updatedAt: string;
    };

export interface EncryptedCredential {
  id: string;
  cryptoVersion: 1;
  iv: string;
  ciphertext: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type CredentialType =
  | 'database'
  | 'application-login'
  | 'api-token'
  | 'service-account'
  | 'ssh'
  | 'ontology'
  | 'harness'
  | 'split'
  | 'other';

export interface CredentialPlaintext {
  payloadVersion: 1;
  clientRecordId: string;
  name: string;
  type: CredentialType;
  username: string;
  secret: string;
  url: string;
  host: string;
  port: string;
  environment: string;
  notes: string;
  tags: string[];
}

export interface DecryptedCredential {
  encrypted: EncryptedCredential;
  payload: CredentialPlaintext;
}

export interface CredentialEnvelope {
  cryptoVersion: 1;
  iv: string;
  ciphertext: string;
}

export interface CredentialListResponse {
  data: EncryptedCredential[];
  count: number;
}

export interface CredentialMutationResponse {
  data: EncryptedCredential;
}

export interface CredentialBulkDeleteResponse {
  requested: number;
  deleted: number;
  failed: Array<{ id: string; deleted: false; error?: string; code?: string }>;
  allSucceeded: boolean;
}

export const credentialTypes: ReadonlyArray<{ value: CredentialType; label: string }> = [
  { value: 'database', label: 'Database' },
  { value: 'application-login', label: 'Application Login' },
  { value: 'api-token', label: 'API Token' },
  { value: 'service-account', label: 'Service Account' },
  { value: 'ssh', label: 'SSH' },
  { value: 'ontology', label: 'Ontology' },
  { value: 'harness', label: 'Harness' },
  { value: 'split', label: 'Split' },
  { value: 'other', label: 'Other' },
];
