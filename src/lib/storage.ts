import type { Profile } from "./types";

const PROFILE_KEY = "salary-counter:profile";

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    if (
      typeof parsed.amount !== "number" ||
      parsed.amount <= 0 ||
      typeof parsed.workStart !== "string" ||
      typeof parsed.workEnd !== "string" ||
      !Array.isArray(parsed.workDays) ||
      parsed.workDays.length === 0
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage 사용 불가 환경에서는 세션 동안만 동작
  }
}
