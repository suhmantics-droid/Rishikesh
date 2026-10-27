// Lets a GitHub Actions workflow call /api/cron without a stored secret: the workflow asks GitHub
// for a signed token (OIDC) and sends it; we check GitHub's signature and that it came from our repo.

import crypto from "node:crypto";

const ISSUER = "https://token.actions.githubusercontent.com";
export const CRON_AUDIENCE = "pinned-cron";

type Jwk = crypto.JsonWebKey & { kid: string };
let cache: { at: number; keys: Jwk[] } | null = null;

async function githubKeys(): Promise<Jwk[]> {
  if (cache && Date.now() - cache.at < 3_600_000) return cache.keys;
  const res = await fetch(`${ISSUER}/.well-known/jwks`);
  if (!res.ok) throw new Error(`GitHub JWKS ${res.status}`);
  cache = { at: Date.now(), keys: ((await res.json()) as { keys: Jwk[] }).keys };
  return cache.keys;
}

const json = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

/** True if `token` is a current GitHub Actions token for `repo` ("owner/name") and our audience. */
export async function isGithubActionsToken(token: string, repo: string): Promise<boolean> {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return false;
    const header = json(h) as { alg?: string; kid?: string };
    if (header.alg !== "RS256") return false;
    const jwk = (await githubKeys()).find((k) => k.kid === header.kid);
    if (!jwk) return false;
    const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
    if (!crypto.verify("RSA-SHA256", Buffer.from(`${h}.${p}`), key, Buffer.from(s, "base64url"))) return false;
    const c = json(p) as { iss?: string; aud?: string | string[]; exp?: number; nbf?: number; repository?: string };
    const now = Date.now() / 1000;
    const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
    return (
      c.iss === ISSUER &&
      aud.includes(CRON_AUDIENCE) &&
      typeof c.exp === "number" &&
      c.exp > now &&
      (c.nbf ?? 0) <= now + 60 &&
      String(c.repository).toLowerCase() === repo.toLowerCase()
    );
  } catch {
    return false;
  }
}
