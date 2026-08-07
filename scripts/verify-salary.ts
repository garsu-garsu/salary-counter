/**
 * 급여 계산 검증 스크립트.
 *
 *   npm run verify
 *
 * 금액 계산은 틀리면 안 되니, 손으로 계산한 기대값과 맞는지 확인해요.
 * (실행: node --experimental-strip-types — 별도 의존성 없이 TypeScript 그대로 돌려요)
 */
import assert from "node:assert/strict";
import type { Profile } from "../src/lib/types.ts";
import {
  annualSalaryWon,
  dailyPayWon,
  formatDurationClock,
  formatDurationShort,
  formatWon,
  getDayStatus,
  monthEarnedWon,
  paydayDday,
  weekEarnedWon,
  weeklyBreakdown,
  wonPerHour,
  wonPerMinute,
  wonPerSecond,
} from "../src/lib/salary.ts";

const near = (actual: number, expected: number, label: string) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-6,
    `${label}: ${actual} !== ${expected} (차이 ${actual - expected})`,
  );

/** 연봉 4,000만원 · 09:00~18:00(9시간) · 월~금 · 25일 월급 */
const annual4000: Profile = {
  salaryType: "annual",
  amount: 4000,
  workStart: "09:00",
  workEnd: "18:00",
  workDays: [1, 2, 3, 4, 5],
  payday: 25,
};

// ── 기본 환산 ───────────────────────────────────────────────
// 연간 근무초 = 5일 × 52주 × 32,400초 = 8,424,000초
const ANNUAL_WORK_SEC = 5 * 52 * 32400;
assert.equal(ANNUAL_WORK_SEC, 8_424_000);

near(annualSalaryWon(annual4000), 40_000_000, "연봉 환산");
near(wonPerSecond(annual4000), 40_000_000 / 8_424_000, "초당 적립액");
near(wonPerHour(annual4000), (40_000_000 / 8_424_000) * 3600, "시급 환산");
near(wonPerMinute(annual4000), (40_000_000 / 8_424_000) * 60, "분당 환산");
near(dailyPayWon(annual4000), (40_000_000 / 8_424_000) * 32400, "하루 적립액");
// 시급은 대략 1만 7천원대여야 해요.
assert.ok(wonPerHour(annual4000) > 17_000 && wonPerHour(annual4000) < 17_200, "시급 범위");

// ── 급여 입력 방식 3종 ───────────────────────────────────────
// 월급 330만원과 연봉 3,960만원은 완전히 같아야 해요.
const monthly330: Profile = { ...annual4000, salaryType: "monthly", amount: 330 };
const annual3960: Profile = { ...annual4000, salaryType: "annual", amount: 3960 };
near(annualSalaryWon(monthly330), 39_600_000, "월급 → 연봉 환산");
near(wonPerSecond(monthly330), wonPerSecond(annual3960), "월급 = 같은 연봉");

// 새로 추가한 '월 실수령액'도 월급과 똑같은 방식(×12)으로 계산돼야 해요.
const net330: Profile = { ...annual4000, salaryType: "net", amount: 330 };
near(annualSalaryWon(net330), 39_600_000, "실수령액 → 연간 환산");
near(wonPerSecond(net330), wonPerSecond(monthly330), "실수령액 = 월급과 동일 계산");

const net290: Profile = { ...annual4000, salaryType: "net", amount: 290 };
near(annualSalaryWon(net290), 34_800_000, "실수령액 290만원 → 3,480만원");

// ── 하루 상태 판정 ───────────────────────────────────────────
const perSec = wonPerSecond(annual4000);
const daily = dailyPayWon(annual4000);

// 2026-08-05 는 수요일이어야 해요. (아래 기대값이 이 전제 위에 있어요)
assert.equal(new Date(2026, 7, 5).getDay(), 3, "2026-08-05 는 수요일");
assert.equal(new Date(2026, 7, 9).getDay(), 0, "2026-08-09 는 일요일");

const before = getDayStatus(new Date(2026, 7, 5, 8, 0, 0), annual4000);
assert.equal(before.phase, "before");
assert.equal(before.remainingSeconds, 3600);
assert.equal(before.earned, 0);

const working = getDayStatus(new Date(2026, 7, 5, 12, 0, 0), annual4000);
assert.equal(working.phase, "working");
near(working.earned, perSec * 10800, "정오까지 3시간치");
near(working.progress, 10800 / 32400, "달성률 1/3");
assert.equal(working.remainingSeconds, 21600);

const done = getDayStatus(new Date(2026, 7, 5, 19, 0, 0), annual4000);
assert.equal(done.phase, "done");
near(done.earned, daily, "퇴근 후에는 하루치 전부");
assert.equal(done.progress, 1);

const off = getDayStatus(new Date(2026, 7, 9, 12, 0, 0), annual4000);
assert.equal(off.phase, "off");
assert.equal(off.earned, 0);

// 퇴근 시각 정각은 '완료'로 봐요.
assert.equal(getDayStatus(new Date(2026, 7, 5, 18, 0, 0), annual4000).phase, "done");
// 출근 시각 정각은 '근무 중'이고 아직 0원이에요.
const justIn = getDayStatus(new Date(2026, 7, 5, 9, 0, 0), annual4000);
assert.equal(justIn.phase, "working");
near(justIn.earned, 0, "출근 정각 적립액");

// ── 누적 ────────────────────────────────────────────────────
// 수요일 정오 → 월·화 하루치 + 오늘 3시간치
near(
  weekEarnedWon(new Date(2026, 7, 5, 12, 0, 0), annual4000),
  daily * 2 + perSec * 10800,
  "이번 주 누적",
);
// 8/1(토)·8/2(일)은 근무일이 아니고, 8/3(월)·8/4(화)만 하루치 + 오늘 3시간치
assert.equal(new Date(2026, 7, 1).getDay(), 6, "2026-08-01 은 토요일");
near(
  monthEarnedWon(new Date(2026, 7, 5, 12, 0, 0), annual4000),
  daily * 2 + perSec * 10800,
  "이번 달 누적",
);
// 월요일 출근 전이면 이번 주 누적은 0원이어야 해요.
near(weekEarnedWon(new Date(2026, 7, 3, 8, 0, 0), annual4000), 0, "월요일 출근 전 주간 누적");

const week = weeklyBreakdown(new Date(2026, 7, 5, 12, 0, 0), annual4000);
assert.deepEqual(
  week.map((w) => w.label),
  ["월", "화", "수", "목", "금", "토", "일"],
);
near(week[0].won, daily, "월요일 적립액");
near(week[2].won, perSec * 10800, "오늘(수) 적립액");
near(week[3].won, 0, "아직 오지 않은 목요일");
near(week[5].won, 0, "토요일은 휴무");

// ── 월급날 D-day ────────────────────────────────────────────
assert.equal(paydayDday(new Date(2026, 7, 5), 25), 20, "8/5 → 8/25");
assert.equal(paydayDday(new Date(2026, 7, 25), 25), 0, "월급날 당일");
assert.equal(paydayDday(new Date(2026, 7, 26), 25), 30, "8/26 → 9/25");
assert.equal(paydayDday(new Date(2026, 7, 5), "last"), 26, "8/5 → 8/31(말일)");
// 2026년 2월은 28일까지라 31일 지정도 말일로 당겨져요.
assert.equal(paydayDday(new Date(2026, 1, 10), 31), 18, "2/10 → 2/28");

// ── 표기 ────────────────────────────────────────────────────
assert.equal(formatWon(1234.9), "1,234원");
assert.equal(formatWon(0), "0원");
assert.equal(formatDurationClock(3661), "01:01:01");
assert.equal(formatDurationClock(0), "00:00:00");
assert.equal(formatDurationShort(3661), "1시간 1분");
assert.equal(formatDurationShort(59), "0분");

console.log("급여 계산 검증 통과 ✅");
