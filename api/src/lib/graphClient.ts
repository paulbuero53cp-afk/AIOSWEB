// ─────────────────────────────────────────────────────────────
//  AIOS — Graph API Client
//
//  Produktion: Managed Identity (System-Assigned) — kein Secret
//  Lokal:      ClientSecretCredential via local.settings.json
//
//  Voraussetzung Produktion:
//    Azure Portal → Function App → Identity → System Assigned: ON
//    Entra → Enterprise Apps → [Function App Name]
//      → API Permissions → Graph → Sites.ReadWrite.All (Application)
// ─────────────────────────────────────────────────────────────

import { Client } from '@microsoft/microsoft-graph-client';
import {
  DefaultAzureCredential,
  ClientSecretCredential,
} from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from
  '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

let _client: Client | null = null;

export function getGraphClient(): Client {
  if (_client) return _client;

  const tenantId     = process.env.AZURE_TENANT_ID;
  const clientId     = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  // Lokal: ClientSecretCredential wenn Secret vorhanden
  // Produktion: DefaultAzureCredential → greift Managed Identity
  const credential =
    tenantId && clientId && clientSecret
      ? new ClientSecretCredential(tenantId, clientId, clientSecret)
      : new DefaultAzureCredential();

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  _client = Client.initWithMiddleware({
    authProvider,
    defaultVersion: 'v1.0',
  });

  return _client;
}
