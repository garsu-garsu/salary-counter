import type { Profile } from "./types";

const WEEKS_PER_YEAR = 52;

/** "HH:mm" → 자정 기준 초 */
export function parseTimeToSeconds(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 3600 + m * 60;
}

/** 하루 근무 초 */
export function workSecondsPerDay(profile: Profile): number {
  return parseTimeToSeconds(profile.workEnd) - parseTimeToSeconds(profile.workStart);
}

/** 연봉 환산 (원) */
export function annualSalaryWon(profile: Profile): number {
  const won = profile.amount * 10000;
  return profile.salaryType === "annual" ? won : won * 12;
}

/** 1초당 적립액 (원) — 연봉 ÷ 연간 근무초 */
export function wonPerSecond(profile: Profile): number {
  const annualWorkSeconds =
    profile.workDays.length * WEEKS_PER_YEAR * workSecondsPerDay(profile);
  return annualSalaryWon(profile) / annualWorkSeconds;
}

/** 하루 적립액 (원) */
export function dailyPayWon(profile: Profile): number {
  return wonPerSecond(profile) * workSecondsPerDay(profile);
}

export type DayPhase = "off" | "before" | "working" | "done";

export interface DayStatus {
  phase: DayPhase;
  /** 오늘 번 돈 (원) */
  earned: number;
  /** 하루 근무 달성률 0~1 */
  progress: number;
  /** 출근(before) 또는 퇴근(working)까지 남은 초 */
  remainingSeconds: number;
}

export function getDayStatus(now: Date, profile: Profile): DayStatus {
  const daily = dailyPayWon(profile);
  if (!profile.workDays.includes(now.getDay())) {
    return { phase: "off", earned: 0, progress: 0, remainingSeconds: 0 };
  }
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const startSec = parseTimeToSeconds(profile.workStart);
  const endSec = parseTimeToSeconds(profile.workEnd);

  if (nowSec < startSec) {
    return { phase: "before", earned: 0, progress: 0, remainingSeconds: startSec - nowSec };
  }
  if (nowSec >= endSec) {
    return { phase: "done", earned: daily, progress: 1, remainingSeconds: 0 };
  }
  const workedSec = nowSec - startSec;
  return {
    phase: "working",
    earned: wonPerSecond(profile) * workedSec,
    progress: workedSec / (endSec - startSec),
    remainingSeconds: endSec - nowSec,
  };
}

/** 이번 주(월요일 시작) 누적 적립액 (원) */
export function weekEarnedWon(now: Date, profile: Profile): number {
  const daily = dailyPayWon(profile);
  const today = getDayStatus(now, profile);
  // 월요일부터 어제까지 지난 근무일 수
  const daysSinceMonday = (now.getDay() + 6) % 7;
  let total = 0;
  for (let i = 1; i <= daysSinceMonday; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    if (profile.workDays.includes(d.getDay())) total += daily;
  }
  return total + today.earned;
}

/** 이번 달 1일부터 누적 적립액 (원) */
export function monthEarnedWon(now: Date, profile: Profile): number {
  const daily = dailyPayWon(profile);
  let total = 0;
  for (let d = 1; d < now.getDate(); d++) {
    const date = new Date(now.getFullYear(), now.getMonth(), d);
    if (profile.workDays.includes(date.getDay())) total += daily;
  }
  return total + getDayStatus(now, profile).earned;
}

/** 올해 1월 1일부터 누적 적립액 (원) */
export function yearEarnedWon(now: Date, profile: Profile): number {
  const daily = dailyPayWon(profile);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let total = 0;
  for (
    let d = new Date(now.getFullYear(), 0, 1);
    d < today;
    d.setDate(d.getDate() + 1)
  ) {
    if (profile.workDays.includes(d.getDay())) total += daily;
  }
  return total + getDayStatus(now, profile).earned;
}

/** 시급 환산 (원) */
export function wonPerHour(profile: Profile): number {
  return wonPerSecond(profile) * 3600;
}

/** 분당 환산 (원) */
export function wonPerMinute(profile: Profile): number {
  return wonPerSecond(profile) * 60;
}

export interface WeekdayEarning {
  /** 요일 라벨 (월~일) */
  label: string;
  /** 해당 요일 적립액 (원) */
  won: number;
}

/** 이번 주(월요일 시작) 요일별 적립액 — 지난 근무일은 하루치, 오늘은 현재까지, 예정일은 0 */
export function weeklyBreakdown(now: Date, profile: Profile): WeekdayEarning[] {
  const daily = dailyPayWon(profile);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);

  const labels = ["월", "화", "수", "목", "금", "토", "일"];
  return labels.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    let won = 0;
    if (date.getTime() === today.getTime()) {
      won = getDayStatus(now, profile).earned;
    } else if (date < today && profile.workDays.includes(date.getDay())) {
      won = daily;
    }
    return { label, won };
  });
}

/** 다음 월급일까지 남은 일수 (0이면 오늘) */
export function paydayDday(now: Date, payday: number | "last"): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const paydayOf = (year: number, month: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = payday === "last" ? lastDay : Math.min(payday, lastDay);
    return new Date(year, month, day);
  };

  let target = paydayOf(now.getFullYear(), now.getMonth());
  if (target < today) {
    target = paydayOf(now.getFullYear(), now.getMonth() + 1);
  }
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatWon(amount: number): string {
  return `${Math.floor(amount).toLocaleString("ko-KR")}원`;
}

/** 초 → "H시간 M분" (1시간 미만이면 "M분") */
export function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h <= 0) return `${m}분`;
  return `${h}시간 ${m}분`;
}

/** 초 → "HH:MM:SS" */
export function formatDurationClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
