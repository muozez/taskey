/**
 * HTTP API client for Taskey Remote Server.
 * Uses Node.js http/https modules for maximum Electron compatibility.
 */

import * as http from "http";
import * as https from "https";
import type {
  ApiResponse,
  JoinRequest,
  JoinResponse,
  ValidateKeyRequest,
  ValidateKeyResponse,
  PushRequest,
  PushResponse,
  PullResponse,
  FullSyncRequest,
  FullSyncResponse,
  HeartbeatRequest,
  HeartbeatResponse,
} from "./types";

/**
 * Low-level HTTP request helper using Node.js modules.
 */
function httpRequest<T>(
  method: string,
  urlStr: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const isHttps = parsed.protocol === "https:";
    const mod = isHttps ? https : http;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    };

    const bodyStr = body ? JSON.stringify(body) : undefined;
    if (bodyStr) {
      requestHeaders["Content-Length"] = Buffer.byteLength(bodyStr).toString();
    }

    const options: http.RequestOptions = {
      method,
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers: requestHeaders,
      timeout: 30_000,
    };

    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        let data: T;
        try {
          data = JSON.parse(raw) as T;
        } catch {
          data = raw as unknown as T;
        }
        resolve({ status: res.statusCode ?? 0, data });
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

/**
 * Normalize server URL (strip trailing slash).
 */
function normalizeUrl(serverUrl: string): string {
  return serverUrl.replace(/\/+$/, "");
}

// ── Public API ──────────────────────────────────────────

/**
 * Validate a join key without actually joining.
 */
export async function validateKey(
  serverUrl: string,
  joinKey: string
): Promise<ApiResponse<ValidateKeyResponse>> {
  const url = `${normalizeUrl(serverUrl)}/api/validate-key`;
  const body: ValidateKeyRequest = { joinKey };
  return httpRequest<ValidateKeyResponse>("POST", url, body);
}

/**
 * Join a workspace using a join key. Returns clientId and workspace info.
 */
export async function join(
  serverUrl: string,
  joinKey: string,
  clientName: string,
  hostname: string
): Promise<ApiResponse<JoinResponse>> {
  const url = `${normalizeUrl(serverUrl)}/api/join`;
  const body: JoinRequest = { joinKey, clientName, hostname };
  return httpRequest<JoinResponse>("POST", url, body);
}

/**
 * Push local diffs to the remote server.
 */
export async function pushDiffs(
  serverUrl: string,
  request: PushRequest
): Promise<ApiResponse<PushResponse>> {
  const url = `${normalizeUrl(serverUrl)}/api/sync/push`;
  return httpRequest<PushResponse>("POST", url, request);
}

/**
 * Pull remote changes since a specific version.
 */
export async function pullDiffs(
  serverUrl: string,
  clientId: string,
  sinceVersion?: number
): Promise<ApiResponse<PullResponse>> {
  let url = `${normalizeUrl(serverUrl)}/api/sync/pull?clientId=${encodeURIComponent(clientId)}`;
  if (sinceVersion !== undefined) {
    url += `&sinceVersion=${sinceVersion}`;
  }
  return httpRequest<PullResponse>("GET", url);
}

/**
 * Get a full snapshot from the remote server.
 */
export async function fullSync(
  serverUrl: string,
  clientId: string
): Promise<ApiResponse<FullSyncResponse>> {
  const url = `${normalizeUrl(serverUrl)}/api/sync/full`;
  const body: FullSyncRequest = { clientId };
  return httpRequest<FullSyncResponse>("POST", url, body);
}

/**
 * Send heartbeat to the remote server.
 */
export async function heartbeat(
  serverUrl: string,
  clientId: string
): Promise<ApiResponse<HeartbeatResponse>> {
  const url = `${normalizeUrl(serverUrl)}/api/sync/heartbeat`;
  const body: HeartbeatRequest = { clientId };
  return httpRequest<HeartbeatResponse>("POST", url, body);
}

/**
 * Test connectivity to a remote server.
 */
export async function testConnection(serverUrl: string): Promise<boolean> {
  try {
    const url = `${normalizeUrl(serverUrl)}/api/validate-key`;
    const response = await httpRequest<unknown>("POST", url, { joinKey: "TEST-TEST" });
    // Even a 400/404 response means the server is reachable
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  }
}
