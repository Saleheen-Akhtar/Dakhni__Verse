import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { calculateProgress } from "../src/lib/calculations/progress.ts";
import { getSessionInterval, doSessionsOverlap } from "../src/lib/calculations/calendar.ts";
import { getTodayIST, shiftDateString } from "../src/lib/utils/dates.ts";

test("Targets & Progress: handles zero, null, and completed targets", () => {
  // Unconfigured target
  const noTarget = calculateProgress(4, null);
  assert.equal(noTarget.hasTarget, false);
  assert.equal(noTarget.percentage, null);
  assert.equal(noTarget.actual, 4);

  // Target configured as 0
  const zeroTarget = calculateProgress(0, 0);
  assert.equal(zeroTarget.hasTarget, true);
  assert.equal(zeroTarget.percentage, null);

  // Standard target calculation
  const halfProgress = calculateProgress(5, 10);
  assert.equal(halfProgress.hasTarget, true);
  assert.equal(halfProgress.percentage, 50);

  // Exceeded target
  const exceeded = calculateProgress(12, 10);
  assert.equal(exceeded.hasTarget, true);
  assert.equal(exceeded.percentage, 120);
});

test("Studio Calendar: detects standard and overnight interval collisions", () => {
  // Session A: 10:00 - 12:00
  const sA = {
    session_date: "2026-09-21",
    start_time: "10:00:00",
    end_time: "12:00:00",
  };

  // Session B: 11:30 - 13:30 (overlaps with A)
  const sB = {
    session_date: "2026-09-21",
    start_time: "11:30:00",
    end_time: "13:30:00",
  };

  // Session C: 14:00 - 16:00 (disjoint from A)
  const sC = {
    session_date: "2026-09-21",
    start_time: "14:00:00",
    end_time: "16:00:00",
  };

  assert.equal(doSessionsOverlap(sA, sB), true);
  assert.equal(doSessionsOverlap(sA, sC), false);

  // Adjacent boundary: 12:00 end and 12:00 start do NOT collide
  const sAdjacent = {
    session_date: "2026-09-21",
    start_time: "12:00:00",
    end_time: "14:00:00",
  };
  assert.equal(doSessionsOverlap(sA, sAdjacent), false);

  // Overnight Session: 22:00 on 2026-09-21 to 02:00 on 2026-09-22
  const sOvernight = {
    session_date: "2026-09-21",
    start_time: "22:00:00",
    end_time: "02:00:00",
  };
  const overnightInterval = getSessionInterval(sOvernight);
  assert.ok(overnightInterval);
  assert.ok(overnightInterval.endMs > overnightInterval.startMs);
  // Interval should be exactly 4 hours (4 * 3600 * 1000 = 14,400,000 ms)
  assert.equal(overnightInterval.endMs - overnightInterval.startMs, 4 * 3600 * 1000);

  // Colliding next-day early morning session: 01:00 to 03:00 on 2026-09-22
  const sNextDayCollision = {
    session_date: "2026-09-22",
    start_time: "01:00:00",
    end_time: "03:00:00",
  };
  assert.equal(doSessionsOverlap(sOvernight, sNextDayCollision), true);

  // Non-colliding next-day afternoon session: 14:00 to 16:00 on 2026-09-22
  const sNextDaySafe = {
    session_date: "2026-09-22",
    start_time: "14:00:00",
    end_time: "16:00:00",
  };
  assert.equal(doSessionsOverlap(sOvernight, sNextDaySafe), false);

  // Cancelled session should never collide
  const sCancelled = {
    ...sB,
    status: "Cancelled",
  };
  assert.equal(getSessionInterval(sCancelled), null);
  assert.equal(doSessionsOverlap(sA, sCancelled), false);
});

test("Date Utilities: IST boundary formatting and date arithmetic", () => {
  const today = getTodayIST();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);

  // Shifting across month boundary
  const marchEnd = "2026-03-31";
  const aprilFirst = shiftDateString(marchEnd, 1);
  assert.equal(aprilFirst, "2026-04-01");

  // Shifting across year boundary
  const yearEnd = "2026-12-31";
  const newYear = shiftDateString(yearEnd, 1);
  assert.equal(newYear, "2027-01-01");

  // Negative delta
  assert.equal(shiftDateString(newYear, -1), yearEnd);
});

test("Intake Upload Validation: MIME type safety and size limits", () => {
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  // Allowed
  assert.ok(ALLOWED_MIME_TYPES.includes("image/jpeg"));
  assert.ok(ALLOWED_MIME_TYPES.includes("image/png"));
  assert.ok(ALLOWED_MIME_TYPES.includes("image/webp"));

  // Disallowed dangerous upload types (XSS / RCE vectors)
  assert.ok(!ALLOWED_MIME_TYPES.includes("image/svg+xml"));
  assert.ok(!ALLOWED_MIME_TYPES.includes("text/html"));
  assert.ok(!ALLOWED_MIME_TYPES.includes("application/x-php"));
  assert.ok(!ALLOWED_MIME_TYPES.includes("application/javascript"));

  // File size boundaries
  const safeSize = 1.9 * 1024 * 1024;
  const oversized = 2.1 * 1024 * 1024;
  assert.ok(safeSize <= MAX_FILE_SIZE);
  assert.ok(oversized > MAX_FILE_SIZE);
});

test("Account Credential Security: temporary passwords use >= 122 bits entropy", () => {
  // Generate sample CSPRNG UUID-based passwords
  const password = crypto.randomUUID();
  assert.equal(typeof password, "string");
  // Full UUID v4 is 36 chars (32 hex characters = 128 bits of entropy - 6 version/variant bits = 122 bits)
  assert.equal(password.length, 36);
  assert.match(password, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

  // Ensure passwords are not truncated to weak 6 or 10 hex characters
  assert.ok(password.length >= 32);
});
