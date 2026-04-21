// scripts/strava.js
// Strava OAuth helper + API client
// Handles first-run browser auth and token refresh automatically.

import { config as dotenvConfig } from "dotenv";
import fs from "fs";
import http from "http";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.join(__dirname, ".env.local") });
const TOKENS_FILE = path.join(__dirname, ".tokens.local");

const CLIENT_ID     = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI  = process.env.STRAVA_REDIRECT_URI || "http://localhost:8080/callback";
const PORT          = 8080;

// ─── TOKEN PERSISTENCE ───────────────────────────────────────────────────────

function loadTokens() {
  if (!fs.existsSync(TOKENS_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8")); }
  catch { return null; }
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

// ─── OAUTH FIRST RUN (opens browser, waits for callback) ────────────────────

function authorize() {
  return new Promise((resolve, reject) => {
    const authUrl =
      `https://www.strava.com/oauth/authorize` +
      `?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&approval_prompt=auto` +
      `&scope=read,activity:read_all`;

    console.log("\n🚴 Coach IA — Connexion Strava");
    console.log("─────────────────────────────");
    console.log("Ouverture de ton navigateur pour autoriser l'accès...");
    console.log("Si le navigateur ne s'ouvre pas, copie ce lien :\n");
    console.log(authUrl + "\n");

    // Local HTTP server to catch the callback
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.end("<h2>❌ Autorisation refusée. Tu peux fermer cet onglet.</h2>");
        server.close();
        reject(new Error("Strava authorization denied: " + error));
        return;
      }

      if (!code) { res.end("En attente..."); return; }

      res.end(`
        <html><body style="font-family:sans-serif;background:#0F1117;color:#F0F0F5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <div style="font-size:3rem;margin-bottom:1rem;">✅</div>
            <h2>Connexion réussie !</h2>
            <p style="color:#8B8FA8;">Tu peux fermer cet onglet et revenir au terminal.</p>
          </div>
        </body></html>`);
      server.close();

      // Exchange code for tokens
      const tokens = await exchangeCode(code);
      saveTokens(tokens);
      console.log("✅ Connexion Strava réussie — tokens sauvegardés.");
      resolve(tokens);
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
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type:    "authorization_code",
  });

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── TOKEN REFRESH ───────────────────────────────────────────────────────────

async function refreshTokens(tokens) {
  const body = new URLSearchParams({
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type:    "refresh_token",
    refresh_token: tokens.refresh_token,
  });

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  const fresh = await res.json();
  saveTokens(fresh);
  return fresh;
}

// ─── GET VALID ACCESS TOKEN (auto-refresh if expired) ────────────────────────

export async function getAccessToken() {
  let tokens = loadTokens();

  if (!tokens) {
    console.log("Première connexion — ouverture du navigateur...");
    tokens = await authorize();
  }

  // Refresh if expired (with 5-min buffer)
  if (Date.now() / 1000 > tokens.expires_at - 300) {
    console.log("🔄 Rafraîchissement du token Strava...");
    tokens = await refreshTokens(tokens);
  }

  return tokens.access_token;
}

// ─── API HELPERS ─────────────────────────────────────────────────────────────

async function stravaGet(path, params = {}) {
  const token = await getAccessToken();
  const url = new URL(`https://www.strava.com/api/v3${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) throw new Error("Rate limit Strava atteint — attends 15 minutes.");
  if (!res.ok) throw new Error(`Strava API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

// Fetch activities since a given Unix timestamp (or last N days as fallback)
export async function fetchRecentActivities(days = 30, sinceTimestamp = null) {
  const after = sinceTimestamp || Math.floor(Date.now() / 1000) - days * 86400;
  const activities = [];
  let page = 1;

  while (true) {
    const batch = await stravaGet("/athlete/activities", {
      after,
      per_page: 50,
      page,
    });
    if (!batch.length) break;
    activities.push(...batch);
    if (batch.length < 50) break;
    page++;
  }

  console.log(`📦 ${activities.length} activités récupérées (${days} derniers jours)`);
  return activities;
}

// Fetch athlete profile (for baseline data)
export async function fetchAthlete() {
  return stravaGet("/athlete");
}

// Fetch full detail of a single activity (includes laps + splits)
export async function fetchActivityDetail(id) {
  return stravaGet(`/activities/${id}`);
}

// Fetch per-second streams for a single activity (heartrate, time, velocity_smooth, watts, ...)
// `keys` = comma-separated list of stream types
export async function fetchActivityStreams(id, keys = "time,heartrate,velocity_smooth,watts,distance") {
  return stravaGet(`/activities/${id}/streams`, { keys, key_by_type: true });
}
