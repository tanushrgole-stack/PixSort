#!/usr/bin/env python3
"""
test_enrollment.py — End-to-end enrollment + album test with 3 sample users.

Flow:
  1. Seed 3 guest users into the wedding event (if not already there).
  2. For each user, enroll with a sample selfie (we reuse picsum photos
     as standin selfies — in production this would be a real face photo).
  3. Verify the enrollment status returned.
  4. Fetch each user's album and print photo counts.
  5. Test moment filter — fetch album filtered to "Haldi" only.
  6. Test solo filter.
  7. Create a guest session for each user and verify resume token works.

Requirements:
  - Run 002_seed.sql and 003_enrollment_sessions.sql in Supabase first.
  - Run test_processing.py first to have photos in the event.
  - Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
"""

import sys
import httpx
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pixsort.test_enrollment")

env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

from app.config import settings
from app.services.db import get_db
from app.services.enrollment import enroll_selfie, _re_match_faces
from app.services.face_detector import face_detector
import numpy as np
import cv2

SEED_EVENT_ID = "10000000-0000-0000-0000-000000000001"
AI_BASE = f"http://{settings.host}:{settings.port}"

# 3 test users
TEST_USERS = [
    {"name": "Alice Test",   "selfie_picsum_seed": 101},
    {"name": "Bob Test",     "selfie_picsum_seed": 202},
    {"name": "Charlie Test", "selfie_picsum_seed": 303},
]


def download_image_bytes(seed: int, size: int = 400) -> bytes | None:
    url = f"https://picsum.photos/seed/{seed}/{size}/{size}"
    try:
        resp = httpx.get(url, timeout=20, follow_redirects=True)
        resp.raise_for_status()
        return resp.content
    except Exception as e:
        logger.error(f"Download failed for seed {seed}: {e}")
        return None


def create_test_user(db, name: str) -> str:
    """Insert a guest user and add them to the seed event."""
    res = db.table("users").insert({"name": name, "is_guest": True}).execute()
    user_id = res.data[0]["id"]
    db.table("event_members").insert({
        "event_id": SEED_EVENT_ID,
        "user_id":  user_id,
        "role":     "guest",
        "status":   "approved",
    }).execute()
    logger.info(f"  Created user: {name} ({user_id[:8]}…)")
    return user_id


def test_enrollment(db, user_id: str, name: str, selfie_seed: int) -> dict:
    """Enroll a user with a sample selfie and return the result."""
    logger.info(f"\n  Enrolling '{name}'…")
    img_bytes = download_image_bytes(selfie_seed)
    if not img_bytes:
        return {"status": "error", "error": "Could not download selfie"}

    nparr = np.frombuffer(img_bytes, np.uint8)
    img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {"status": "error", "error": "Could not decode image"}

    result = enroll_selfie(img, SEED_EVENT_ID, user_id)
    logger.info(f"  Enrollment status: {result.get('status')} | person_id: {result.get('person_id', 'N/A')[:8] if result.get('person_id') else 'N/A'}…")
    return result


def test_album(db, person_id: str, name: str, moment_id: str | None = None, filter_type: str = "all") -> int:
    """Fetch album for a person and return photo count."""
    res = db.table("faces").select("photo_id").eq("event_id", SEED_EVENT_ID).eq("person_id", person_id).not_.is_("photo_id", "null").execute()
    photo_ids = list(set(r["photo_id"] for r in (res.data or [])))
    if not photo_ids:
        return 0

    q = db.table("photos").select("id, moment_id").eq("event_id", SEED_EVENT_ID).in_("id", photo_ids).eq("status", "done")
    if moment_id:
        q = q.eq("moment_id", moment_id)
    result = q.execute()
    photos = result.data or []

    if filter_type == "solo":
        # count faces per photo
        face_res = db.table("faces").select("photo_id, person_id").in_("photo_id", photo_ids).not_.is_("person_id", "null").execute()
        per_photo: dict[str, set] = {}
        for f in (face_res.data or []):
            per_photo.setdefault(f["photo_id"], set()).add(f["person_id"])
        photos = [p for p in photos if len(per_photo.get(p["id"], set())) == 1]
    elif filter_type == "group":
        face_res = db.table("faces").select("photo_id, person_id").in_("photo_id", photo_ids).not_.is_("person_id", "null").execute()
        per_photo = {}
        for f in (face_res.data or []):
            per_photo.setdefault(f["photo_id"], set()).add(f["person_id"])
        photos = [p for p in photos if len(per_photo.get(p["id"], set())) > 1]

    return len(photos)


def test_guest_session(db, user_id: str, event_id: str) -> str | None:
    """Create a guest session and verify token resolution."""
    res = db.table("guest_sessions").insert({
        "user_id":      user_id,
        "event_id":     event_id,
        "device_label": "Test Script · Python",
    }).execute()
    rows = res.data or []
    if not rows:
        return None
    token = rows[0]["token"]

    # Verify resolution
    verify = db.table("guest_sessions").select("user_id, event_id").eq("token", token).single().execute()
    if verify.data:
        logger.info(f"  Session token={token[:12]}… resolves to user={verify.data['user_id'][:8]}…")
    return token


def main():
    logger.info("═══════════════════════════════════════════")
    logger.info("   PixSort — Enrollment & Album Test       ")
    logger.info("   3 sample users                         ")
    logger.info("═══════════════════════════════════════════")

    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.error("Missing Supabase env vars.")
        sys.exit(1)

    db = get_db()
    face_detector.load_model()

    # Fetch the first moment in the wedding event for filter test
    moments_res = db.table("moments").select("id, name").eq("event_id", SEED_EVENT_ID).order("order").limit(1).execute()
    test_moment_id = moments_res.data[0]["id"] if moments_res.data else None
    test_moment_name = moments_res.data[0]["name"] if moments_res.data else "N/A"

    summary = []

    for user_spec in TEST_USERS:
        name = user_spec["name"]
        seed = user_spec["selfie_picsum_seed"]

        logger.info(f"\n── User: {name} ──")

        # Create user
        user_id = create_test_user(db, name)

        # Enroll
        result = test_enrollment(db, user_id, name, seed)
        person_id = result.get("person_id")

        if result["status"] == "candidates":
            # Auto-pick the top candidate for the test
            top = result["candidates"][0] if result["candidates"] else None
            if top:
                person_id = top["person_id"]
                from app.services.enrollment import _link_user_to_person
                _link_user_to_person(
                    db, SEED_EVENT_ID, user_id, person_id,
                    np.array(result["selfie_embedding"], dtype=np.float32)
                )
                logger.info(f"  Auto-picked top candidate: {person_id[:8]}… (sim={top['similarity']:.3f})")

        if not person_id:
            logger.warning(f"  Could not enroll {name} — skipping album test.")
            summary.append({"name": name, "enrolled": False})
            continue

        # Album test
        all_count   = test_album(db, person_id, name)
        solo_count  = test_album(db, person_id, name, filter_type="solo")
        group_count = test_album(db, person_id, name, filter_type="group")
        moment_count = test_album(db, person_id, name, moment_id=test_moment_id)

        logger.info(f"  Album: total={all_count} solo={solo_count} group={group_count}")
        logger.info(f"  Moment filter ({test_moment_name}): {moment_count} photos")

        # Guest session
        token = test_guest_session(db, user_id, SEED_EVENT_ID)

        summary.append({
            "name":          name,
            "user_id":       user_id,
            "person_id":     person_id,
            "enrolled":      True,
            "enroll_status": result["status"],
            "album_total":   all_count,
            "solo":          solo_count,
            "group":         group_count,
            "moment_filter": moment_count,
            "session_token": token,
        })

    # Print summary
    logger.info("\n═══════════════════════════════════════════")
    logger.info("   Summary")
    logger.info("═══════════════════════════════════════════")
    for s in summary:
        if s["enrolled"]:
            logger.info(
                f"  {s['name']:<20} | status={s['enroll_status']:<12} "
                f"| album={s['album_total']:>3} photos "
                f"(solo={s['solo']}, group={s['group']}, "
                f"moment[{test_moment_name}]={s['moment_filter']}) "
                f"| session={s['session_token'][:12] if s['session_token'] else 'N/A'}…"
            )
        else:
            logger.info(f"  {s['name']:<20} | ENROLLMENT FAILED")
    logger.info("═══════════════════════════════════════════")


if __name__ == "__main__":
    main()
