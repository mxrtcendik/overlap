export const SLOT_MS = 30 * 60 * 1000;
export const MAX_TITLE = 80;
export const MAX_NAME = 40;
export const MAX_DAYS = 14;
export const MAX_SLOTS_PER_DAY = 24;
export const MAX_SLOTS = MAX_DAYS * MAX_SLOTS_PER_DAY;
export const MAX_VOTERS = 40;
export const RETAIN_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_RANGE_MS = 12 * 60 * 60 * 1000;

export const RATE_LIMITS = {
  create: { max: 30, windowSec: 60 * 60 },
  vote: { max: 120, windowSec: 10 * 60 },
  owner: { max: 60, windowSec: 10 * 60 },
} as const;
