/**
 * Cloudflare Worker RSA-SHA256 entitlement signing.
 *
 * The PKCS#8 private key must be supplied through a Worker secret
 * (LICENSE_SIGNING_PRIVATE_KEY_PEM). Never store it in source control.
 * The corresponding public key is pinned by the client verifier.
 */
const PRIVATE_KEY_BEGIN = "-----BEGIN PRIVATE KEY-----";
const PRIVATE_KEY_END = "-----END PRIVATE KEY-----";

function decodePrivateKeyPem(pem) {
  if (typeof pem !== "string" || !pem.includes(PRIVATE_KEY_BEGIN) || !pem.includes(PRIVATE_KEY_END)) {
    throw new Error("A PKCS#8 signing private key is not configured.");
  }
  const encoded = pem
    .replace(PRIVATE_KEY_BEGIN, "")
    .replace(PRIVATE_KEY_END, "")
    .replace(/\s+/g, "");
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("The signing private key is malformed.");
  }
  const binary = atob(encoded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function importEntitlementSigningKey(pem) {
  const pkcs8 = decodePrivateKeyPem(pem);
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Signs exactly JSON.stringify(claims), matching the existing client verifier.
 * Returns a base64 RSA-SHA256 signature.
 */
export async function signEntitlementClaims(privateKeyPem, claims) {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new TypeError("Entitlement claims must be an object.");
  }
  const key = await importEntitlementSigningKey(privateKeyPem);
  const payload = new TextEncoder().encode(JSON.stringify(claims));
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    payload
  ));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary);
}
