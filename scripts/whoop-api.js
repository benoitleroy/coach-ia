// scripts/whoop-api.js
// Whoop OAuth 2.0 client + API helper
// First-run browser auth, auto token refresh, JSON fetch helpers.
// Redirect URI = https://localhost:8080/callback (Whoop refuse http).
// Cert auto-signé généré via openssl à la 1re exécution — warning navigateur
// attendu (cliquer "Continuer" / "Accepter le risque").

import { config as dotenvConfig } from "dotenv";
import fs from "fs";
import https from "https";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.join(__dirname, ".env.local") });

const TOKENS_FILE = path.join(__dirname, ".whoop.tokens.local");
const CERT_DIR    = path.join(__dirname, ".cert");
const CERT_KEY    = path.join(CERT_DIR, "localhost.key");
const CERT_CRT    = path.join(CERT_DIR, "localhost.crt");

const CLIENT_ID     = process.env.WHOOP_CLIENT_ID;
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const REDIRECT_URI  = process.env.WHOOP_REDIRECT_URI || "https://localhost:8080/callback";
const PORT          = 8080;

const AUTH_URL  = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const API_BASE  = "https://api.prod.whoop.com/developer";

const SCOPES = [
  "read:recovery",
  "read:cycles",
  "read:sleep",
  "read:workout",
  "read:profile",
  "read:body_measurement",
  "offline",
].join(" ");

// ─── SELF-SIGNED CERT (one-shot) ─────────────────────────────────────────────
function ensureCert() {
  if (fs.existsSync(CERT_KEY) && fs.existsSync(CERT_CRT)) return;
  fs.mkdirSync(CERT_DIR, { recursive: true });
  console.log("🔐 Génération d'un certificat auto-signé pour localhost...");
  try {
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -sha256 ` +
      `-subj "/CN=localhost" ` +
      `-keyout "${CERT_KEY}" -out "${CERT_CRT}" -days 365`,
      { stdio: ["ignore", "ignore", "ignore"] }
    );
  } catch (e) {
    throw new Error("openssl introuvable — installe-le via Xcode Command Line Tools : xcode-select --install");
  }
}

// ─── TOKEN PERSISTENCE ───────────────────────────────────────────────────────
function loadTokens() {
  if (!fs.existsSync(TOKENS_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8")); }
  catch { return null; }
}

function saveTokens(tokens) {
  const withExpiry = {
    ...tokens,
    expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
  };
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(withExpiry, null, 2));
  return withExpiry;
}

// ─── OAUTH FIRST RUN ─────────────────────────────────────────────────────────
function authorize() {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID)     return reject(new Error("WHOOP_CLIENT_ID manquant dans .env.local"));
    if (!CLIENT_SECRET) return reject(new Error("WHOOP_CLIENT_SECRET manquant dans .env.local"));

    ensureCert();

    const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const authUrl =
      `${AUTH_URL}` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&state=${state}`;

    console.log("\n💜 Coach IA — Connexion Whoop");
    console.log("──────────────────────────────");
    console.log("Ouverture du navigateur pour autoriser l'accès Whoop...");
    console.log("⚠️  Le navigateur va afficher un warning certificat (localhost auto-signé).");
    console.log("   Clique sur 'Avancé' puis 'Continuer vers localhost' — c'est normal.\n");
    console.log("Si le navigateur ne s'ouvre pas, copie ce lien :\n");
    console.log(authUrl + "\n");

    const credentials = {
      key:  fs.readFileSync(CERT_KEY),
      cert: fs.readFileSync(CERT_CRT),
    };

    const server = https.createServer(credentials, async (req, res) => {
      const url = new URL(req.url, `https://localhost:${PORT}`);
      const code  = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const rState = url.searchParams.get("state");

      if (error) {
        res.end("<h2>❌ Autorisation refusée. Tu peux fermer cet onglet.</h2>");
        server.close();
        return reject(new Error("Whoop authorization denied: " + error));
      }

      if (!code) { res.end("En attente..."); return; }

      if (rState !== state) {
        res.end("<h2>❌ State mismatch — possible tentative CSRF. Abandon.</h2>");
        server.close();
        return reject(new Error("Whoop OAuth state mismatch"));
      }

      res.end(`
        <html><body style="font-family:sans-serif;background:#0F1117;color:#F0F0F5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <div style="font-size:3rem;margin-bottom:1rem;">💜</div>
            <h2>Connexion Whoop réussie !</h2>
            <p style="color:#8B8FA8;">Tu peux fermer cet onglet et revenir au terminal.</p>
          </div>
        </body></html>`);
      server.close();

      try {
        const tokens = await exchangeCode(code);
        const saved = saveTokens(tokens);
        console.log("✅ Connexion Whoop réussie — tokens sauvegardés.");
        resolve(saved);
      } catch (e) {
        reject(e);
      }
    });

    server.listen(PORT, () => {
      try { execSync(`open "${authUrl}"`); } catch {}
    });

    server.on("error", reject);
  });
}

// ─── TOKEN EXCHANGE ──────────────────────────────────────────────────────────
async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type:    "authorization_code",
    code,
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri:  REDIRECT_URI,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Whoop token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── TOKEN REFRESH ───────────────────────────────────────────────────────────
// ⚠️ Gotcha Whoop : un refresh invalide l'access_token précédent — ne jamais
// refresher en parallèle. Appelé uniquement depuis getAccessToken() (séquentiel).
async function refreshTokens(tokens) {
  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope:         SCOPES,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Whoop token refresh failed: ${res.status} ${await res.text()}`);
  const fresh = await res.json();
  return saveTokens(fresh);
}

// ─── GET VALID ACCESS TOKEN ──────────────────────────────────────────────────
export async function getAccessToken() {
  let tokens = loadTokens();

  if (!tokens) {
    console.log("Première connexion Whoop — ouverture du navigateur...");
    tokens = await authorize();
  }

  // Refresh 5 min avant expiration
  if (Date.now() / 1000 > (tokens.expires_at || 0) - 300) {
    console.log("🔄 Rafraîchissement du token Whoop...");
    tokens = await refreshTokens(tokens);
  }

  return tokens.access_token;
}

// ─── API HELPERS ─────────────────────────────────────────────────────────────
async function whoopGet(endpoint, params = {}) {
  const token = await getAccessToken();
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) throw new Error("Rate limit Whoop atteint — attends quelques minutes.");
  if (!res.ok) throw new Error(`Whoop API error ${res.status} on ${endpoint}: ${await res.text()}`);
  return res.json();
}

// Fetch paginé avec nextToken
async function fetchAllPages(endpoint, params = {}) {
  const all = [];
  let nextToken = null;
  let page = 0;
  do {
    const body = await whoopGet(endpoint, { ...params, limit: 25, nextToken });
    const records = body.records || [];
    all.push(...records);
    nextToken = body.next_token || null;
    page++;
    if (page > 40) break; // safety cap (25 × 40 = 1000 records)
  } while (nextToken);
  return all;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

export async function fetchProfile() {
  return whoopGet("/v2/user/profile/basic");
}

export async function fetchBodyMeasurement() {
  return whoopGet("/v2/user/measurement/body");
}

export async function fetchCycles(days = 60) {
  const start = new Date(Date.now() - days * 86400000).toISOString();
  return fetchAllPages("/v2/cycle", { start });
}

export async function fetchRecoveries(days = 60) {
  const start = new Date(Date.now() - days * 86400000).toISOString();
  return fetchAllPages("/v2/recovery", { start });
}

export async function fetchSleeps(days = 60) {
  const start = new Date(Date.now() - days * 86400000).toISOString();
  return fetchAllPages("/v2/activity/sleep", { start });
}

export async function fetchWorkouts(days = 60) {
  const start = new Date(Date.now() - days * 86400000).toISOString();
  return fetchAllPages("/v2/activity/workout", { start });
}

// Run standalone = auth only (test la connexion)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    const token = await getAccessToken();
    console.log(`\n✅ Token obtenu (${token.slice(0, 10)}…)`);
    const profile = await fetchProfile();
    console.log(`👤 Connecté en tant que : ${profile.first_name} ${profile.last_name} (user_id ${profile.user_id})`);
  })().catch(e => { console.error("\n❌", e.message); process.exit(1); });
}
