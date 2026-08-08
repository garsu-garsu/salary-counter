import { GoogleAdMob } from "@apps-in-toss/web-framework";
import { track } from "./analytics";

/**
 * 콘솔에서 발급받은 "전면형(인터스티셜)" 광고 단위 ID로 교체하세요.
 */
const INTERSTITIAL_AD_GROUP_ID = "ait.v2.live.cdf86e36ded348e9";

const CAP_KEY = "salary-counter:interstitial-last";

function supported(): boolean {
  // isSupported 는 토스 밖에서 예외를 던져요. 감싸지 않으면 이 함수를 부른
  // 화면이 통째로 하얗게 죽어요 (에러 경계가 없어요).
  try {
    return (
      GoogleAdMob.loadAppsInTossAdMob.isSupported() &&
      GoogleAdMob.showAppsInTossAdMob.isSupported()
    );
  } catch {
    return false;
  }
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function canShowToday(): boolean {
  try {
    return localStorage.getItem(CAP_KEY) !== todayKey();
  } catch {
    return true;
  }
}

function markShownToday(): void {
  try {
    localStorage.setItem(CAP_KEY, todayKey());
  } catch {
    // localStorage 사용 불가 환경에서는 캡을 적용하지 않아요.
  }
}

let loadCleanup: (() => void) | null = null;

/**
 * 온보딩 화면 진입 시 미리 호출해 광고를 불러와 둬요.
 * (오늘 이미 노출했다면 불러오지 않아요)
 */
export function preloadInterstitial(): void {
  if (!supported() || !canShowToday()) return;
  loadCleanup?.();
  loadCleanup = GoogleAdMob.loadAppsInTossAdMob({
    options: { adGroupId: INTERSTITIAL_AD_GROUP_ID },
    onEvent: () => { },
    onError: () => { },
  });
}

/**
 * 하루 1회 한도로 전면 광고를 노출해요.
 * 지원하지 않는 환경(웹/개발)이거나 오늘 이미 노출했다면 아무 동작도 하지 않아요.
 * 실제로 노출돼 닫힌(dismissed) 경우에만 오늘 노출한 것으로 기록해요.
 */
export function showInterstitialOncePerDay(): void {
  if (!supported() || !canShowToday()) return;
  GoogleAdMob.showAppsInTossAdMob({
    options: { adGroupId: INTERSTITIAL_AD_GROUP_ID },
    onEvent: (event) => {
      if (event.type === "dismissed") {
        markShownToday();
        track.interstitialShow();
      }
    },
    onError: () => { },
  });
}
