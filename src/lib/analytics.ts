import { Analytics } from "@apps-in-toss/web-framework";
import type { DayPhase } from "./salary";
import type { Profile } from "./types";
import type { NotifyGroup } from "./notify";

/**
 * 앱인토스 콘솔 "분석 > 이벤트"용 로깅 래퍼.
 *
 * - Web 환경 SDK는 `Analytics.screen / impression / click` 3종만 제공해요.
 *   화면 진입은 screen, 노출은 impression, 그 외 사용자 행동/결과는 click으로 보내요.
 * - 토스 앱 밖(웹 브라우저·개발)에서는 미지원이라 호출이 실패할 수 있어, 안전하게 감싸요.
 * - 연봉·금액처럼 값이 무한정 많은 항목은 그대로 보내지 않고 band(구간)로 묶어 집계를 쉽게 해요.
 *   (연봉 원본은 개인정보라 노출하지 않아요.)
 */

function safe(fn: () => Promise<void> | undefined) {
  try {
    fn()?.catch(() => {});
  } catch {
    // 로깅 실패는 앱 동작에 영향을 주지 않아요.
  }
}

/** 연봉(만원) → 집계용 구간 */
export function amountBand(amount: number, type: Profile["salaryType"]): string {
  const annual = type === "annual" ? amount : amount * 12;
  if (annual < 3000) return "~3000";
  if (annual < 5000) return "3000-5000";
  if (annual < 7000) return "5000-7000";
  return "7000+";
}

/** 오늘 번 돈(원) → 집계용 구간 */
export function earnedBand(won: number): string {
  if (won < 10000) return "~1만";
  if (won < 30000) return "1-3만";
  if (won < 50000) return "3-5만";
  if (won < 100000) return "5-10만";
  return "10만+";
}

/** 월급일 → 집계용 타입 */
export function paydayType(payday: number | "last"): string {
  if (payday === "last") return "last";
  if (payday === 25) return "25";
  return "etc";
}

export const track = {
  /** 앱 진입 */
  appOpen(isFirstOpen: boolean) {
    safe(() =>
      Analytics.screen({
        log_name: "app_open",
        is_first_open: isFirstOpen,
        hour: new Date().getHours(),
      }),
    );
  },

  /** 첫 실행 소개 화면 노출 */
  introView() {
    safe(() => Analytics.screen({ log_name: "intro_view" }));
  },

  /** 메인 카운터 화면 노출 */
  mainView(phase: DayPhase, percent: number) {
    safe(() => Analytics.screen({ log_name: "main_view", day_phase: phase, percent }));
  },

  /** 온보딩·정보수정 화면 진입 */
  onboardingView(mode: "new" | "edit") {
    safe(() => Analytics.screen({ log_name: "onboarding_view", mode }));
  },

  /** 연봉/월급 토글 변경 */
  onboardingSalaryType(salaryType: Profile["salaryType"]) {
    safe(() =>
      Analytics.click({ log_name: "onboarding_salary_type", salary_type: salaryType }),
    );
  },

  /** 시작하기·저장하기 완료 (입력 전환의 끝점) */
  onboardingComplete(params: {
    mode: "new" | "edit";
    salaryType: Profile["salaryType"];
    amountBand: string;
    workHours: number;
    workDaysCount: number;
    paydayType: string;
  }) {
    safe(() =>
      Analytics.click({
        log_name: "onboarding_complete",
        mode: params.mode,
        salary_type: params.salaryType,
        amount_band: params.amountBand,
        work_hours: params.workHours,
        work_days_count: params.workDaysCount,
        payday_type: params.paydayType,
      }),
    );
  },

  /** 설정 버튼 클릭 */
  settingsClick(phase: DayPhase) {
    safe(() => Analytics.click({ log_name: "settings_click", day_phase: phase }));
  },

  /** '오늘 번 돈 자랑하기' 클릭 — 공유 퍼널 시작 */
  shareClick(phase: DayPhase, earnedBandValue: string, percent: number) {
    safe(() =>
      Analytics.click({
        log_name: "share_click",
        day_phase: phase,
        earned_band: earnedBandValue,
        percent,
      }),
    );
  },

  /** 공유 완료 — 공유 퍼널 끝점 */
  shareComplete(phase: DayPhase, channel: "toss" | "web") {
    safe(() =>
      Analytics.click({ log_name: "share_complete", day_phase: phase, channel }),
    );
  },

  /** 공유 취소·미지원 환경 */
  shareCancel(phase: DayPhase) {
    safe(() => Analytics.click({ log_name: "share_cancel", day_phase: phase }));
  },

  /** 메인 배너 노출 */
  bannerImpression(phase: DayPhase) {
    safe(() => Analytics.impression({ log_name: "banner_impression", day_phase: phase }));
  },

  /** 전면 광고 노출(정보수정 저장 후) */
  interstitialShow() {
    safe(() => Analytics.click({ log_name: "interstitial_show", trigger: "edit_save" }));
  },

  /** '광고 보고 자세한 통계 보기' 클릭 */
  rewardedClick(unlocked: boolean) {
    safe(() => Analytics.click({ log_name: "rewarded_click", unlocked }));
  },

  /** 보상형 광고 끝까지 시청 */
  rewardedComplete() {
    safe(() => Analytics.click({ log_name: "rewarded_complete" }));
  },

  /** 자세한 통계 시트 열림 */
  detailStatsView(viaAd: boolean) {
    safe(() => Analytics.screen({ log_name: "detail_stats_view", via_ad: viaAd }));
  },

  /** 알림 동의 결과 */
  notifyConsent(result: string, group: NotifyGroup) {
    safe(() => Analytics.click({ log_name: "notify_consent", result, group }));
  },
};
