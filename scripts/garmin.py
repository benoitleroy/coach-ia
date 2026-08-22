#!/usr/bin/env python3
"""
scripts/garmin.py — Sommeil / HRV / FC repos / Body Battery depuis Garmin Connect.

Bibliothèque non officielle `garminconnect` (garth). Premier login interactif (email + mot de passe
demandés à l'écran, ou GARMIN_EMAIL / GARMIN_PASSWORD dans scripts/.env.local si présents).
Les tokens de session sont gardés dans scripts/.garmin.tokens/ (gitignoré) → après le
premier login, le mot de passe n'est plus utilisé (tokens valables ~1 an).

Usage :
    scripts/.venv/bin/python scripts/garmin.py            # 14 derniers jours (+ cache)
    scripts/.venv/bin/python scripts/garmin.py --days 90  # backfill
    scripts/.venv/bin/python scripts/garmin.py --login    # force un nouveau login (MFA interactif)

Sortie : scripts/.garmin.cache.json (historique fusionné) et js/sommeil-data.js (window.SOMMEIL).
"""
import argparse, json, os, sys, datetime as dt
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENV = HERE / ".env.local"
TOKENS = HERE / ".garmin.tokens"
CACHE = HERE / ".garmin.cache.json"
OUT = HERE.parent / "js" / "sommeil-data.js"


def load_env():
    if not ENV.exists():
        return
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def connect(force_login=False):
    from garminconnect import Garmin
    email, pwd = os.environ.get("GARMIN_EMAIL"), os.environ.get("GARMIN_PASSWORD")
    if not force_login and TOKENS.exists():
        try:
            g = Garmin()
            g.login(str(TOKENS))
            return g
        except Exception as e:  # tokens périmés → relogin
            print(f"   tokens Garmin invalides ({e.__class__.__name__}), nouveau login…")
    if not email or not pwd:
        if not sys.stdin.isatty():
            sys.exit("❌ Pas de tokens Garmin et pas de terminal pour se connecter : lance `scripts/.venv/bin/python scripts/garmin.py --login` à la main.")
        import getpass
        print("🔐 Connexion Garmin Connect (une seule fois — les jetons seront gardés dans scripts/.garmin.tokens/)")
        email = email or input("   Email Garmin : ").strip()
        pwd = pwd or getpass.getpass("   Mot de passe Garmin (masqué) : ")
    g = Garmin(email, pwd)
    g.login()  # peut demander le code MFA sur stdin
    TOKENS.mkdir(exist_ok=True)
    g.garth.dump(str(TOKENS))
    return g


def safe(fn, *a):
    try:
        return fn(*a)
    except Exception as e:
        return {"_error": f"{e.__class__.__name__}: {e}"[:120]}


def fetch_day(g, day):
    d = day.isoformat()
    out = {"date": d}

    s = safe(g.get_sleep_data, d)
    dto = (s or {}).get("dailySleepDTO") or {}
    if dto.get("sleepTimeSeconds"):
        out["sommeil"] = {
            "total_min": round(dto["sleepTimeSeconds"] / 60),
            "profond_min": round((dto.get("deepSleepSeconds") or 0) / 60),
            "leger_min": round((dto.get("lightSleepSeconds") or 0) / 60),
            "paradoxal_min": round((dto.get("remSleepSeconds") or 0) / 60),
            "eveil_min": round((dto.get("awakeSleepSeconds") or 0) / 60),
            "score": (dto.get("sleepScores") or {}).get("overall", {}).get("value"),
            "debut": dto.get("sleepStartTimestampLocal"),
            "fin": dto.get("sleepEndTimestampLocal"),
            "fc_repos_nuit": s.get("restingHeartRate"),
            "spo2_moy": dto.get("averageSpO2Value"),
            "respiration_moy": dto.get("averageRespirationValue"),
        }
        # HRV nocturne (si la montre le fournit)
        if s.get("avgOvernightHrv"):
            out["hrv_nuit"] = s["avgOvernightHrv"]
            out["hrv_statut"] = s.get("hrvStatus")

    h = safe(g.get_hrv_data, d)
    summ = (h or {}).get("hrvSummary") or {}
    if summ.get("lastNightAvg"):
        out["hrv_nuit"] = summ["lastNightAvg"]
        out["hrv_statut"] = summ.get("status")
        base = summ.get("baseline") or {}
        if base:
            out["hrv_base"] = {"bas": base.get("lowUpper"), "haut": base.get("balancedUpper")}

    r = safe(g.get_rhr_day, d)
    try:
        v = r["allMetrics"]["metricsMap"]["WELLNESS_RESTING_HEART_RATE"][0]["value"]
        if v:
            out["fc_repos"] = round(v)
    except Exception:
        pass

    u = safe(g.get_user_summary, d)
    if isinstance(u, dict) and not u.get("_error"):
        bb_hi, bb_lo = u.get("bodyBatteryHighestValue"), u.get("bodyBatteryLowestValue")
        if bb_hi is not None:
            out["body_battery"] = {"max": bb_hi, "min": bb_lo, "reveil": u.get("bodyBatteryAtWakeTime")}
        if u.get("averageStressLevel") is not None and u.get("averageStressLevel") >= 0:
            out["stress_moy"] = u["averageStressLevel"]
        if u.get("totalSteps") is not None:
            out["pas"] = u["totalSteps"]
        if out.get("fc_repos") is None and u.get("restingHeartRate"):
            out["fc_repos"] = u["restingHeartRate"]

    tr = safe(g.get_training_readiness, d)
    if isinstance(tr, list) and tr:
        tr = tr[0]
    if isinstance(tr, dict) and tr.get("score") is not None:
        out["readiness"] = {"score": tr.get("score"), "niveau": tr.get("level")}

    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=14)
    ap.add_argument("--login", action="store_true")
    args = ap.parse_args()
    load_env()

    g = connect(force_login=args.login)
    print(f"✅ Garmin Connect connecté ({g.display_name if hasattr(g, 'display_name') else 'ok'})")

    cache = {}
    if CACHE.exists():
        try:
            cache = {d["date"]: d for d in json.loads(CACHE.read_text()).get("jours", [])}
        except Exception:
            cache = {}

    today = dt.date.today()
    n_new = 0
    for i in range(args.days):
        day = today - dt.timedelta(days=i)
        key = day.isoformat()
        # Les 2 derniers jours sont toujours rafraîchis (données pouvant arriver tard) ; le reste vient du cache
        if key in cache and i >= 2 and cache[key].get("sommeil"):
            continue
        rec = fetch_day(g, day)
        cache[key] = rec
        n_new += 1
        s = rec.get("sommeil")
        print(f"   {key}: " + (f"sommeil {s['total_min']//60}h{s['total_min']%60:02d} score {s.get('score')} · HRV {rec.get('hrv_nuit','—')} · FC repos {rec.get('fc_repos','—')} · BB {rec.get('body_battery',{}).get('max','—')}" if s else "pas de sommeil"))

    jours = sorted(cache.values(), key=lambda r: r["date"])
    payload = {"generatedAt": dt.datetime.now().isoformat(timespec="seconds"), "jours": jours}
    CACHE.write_text(json.dumps(payload, ensure_ascii=False, indent=1))

    # Fichier navigateur : 90 derniers jours suffisent
    recent = [j for j in jours if (today - dt.date.fromisoformat(j["date"])).days <= 90]
    OUT.write_text("// AUTO-GENERATED by scripts/garmin.py — " + payload["generatedAt"] + "\n// Ne pas éditer : relancer sync.command.\nwindow.SOMMEIL = " + json.dumps({"generatedAt": payload["generatedAt"], "jours": recent}, ensure_ascii=False, indent=1) + ";\n")
    print(f"📝 js/sommeil-data.js écrit ({len(recent)} jours, {n_new} rafraîchis)")


if __name__ == "__main__":
    main()
