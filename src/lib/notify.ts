import { requestNotificationAgreement } from "@apps-in-toss/web-framework";

/**
 * 알림 슬롯 — 콘솔에 등록한 정기 발송 그룹 코드와 1:1로 짝지어요.
 * 코드를 바꾸면 콘솔의 발송 코드도 같이 바꿔야 알림 동의 화면이 떠요.
 */
export const AM_NOTIFY_SLOTS = [
  { code: "salary-counter-am0700", label: "오전 7시", minutes: 7 * 60 },
  { code: "salary-counter-am0730", label: "오전 7시 30분", minutes: 7 * 60 + 30 },
  { code: "salary-counter-am0800", label: "오전 8시", minutes: 8 * 60 },
  { code: "salary-counter-am0830", label: "오전 8시 30분", minutes: 8 * 60 + 30 },
  { code: "salary-counter-am0900", label: "오전 9시", minutes: 9 * 60 },
] as const;

export const PM_NOTIFY_SLOTS = [
  { code: "salary-counter-pm1300", label: "오후 1시", minutes: 13 * 60 },
  { code: "salary-counter-pm1330", label: "오후 1시 30분", minutes: 13 * 60 + 30 },
  { code: "salary-counter-pm1400", label: "오후 2시", minutes: 14 * 60 },
] as const;

export type AmNotifySlotCode = (typeof AM_NOTIFY_SLOTS)[number]["code"];
export type PmNotifySlotCode = (typeof PM_NOTIFY_SLOTS)[number]["code"];
export type NotifySlotCode = AmNotifySlotCode | PmNotifySlotCode;
export type NotifyGroup = "am" | "pm";

const AGREED_KEY: Record<NotifyGroup, string> = {
  am: "salary-counter:notify:am",
  pm: "salary-counter:notify:pm",
};

/**
 * 이 프로젝트에 설치된 @apps-in-toss/web-framework(2.6.1)는 알림 쪽에
 * Notification.requestAgreement / isSupported()를 아직 제공하지 않아요
 * (구버전 requestNotificationAgreement만 있고, 그마저도 isSupported가 없어요).
 * 그 함수가 내부적으로 검사하는 것과 같은 조건(토스 웹뷰인지)을 직접 확인해요.
 */
export function isNotifySupported(): boolean {
  try {
    return typeof window !== "undefined" && "ReactNativeWebView" in window;
  } catch {
    return false;
  }
}

/** 그룹별 동의한 슬롯 — 화면 표시용이에요. 실제 발송 대상은 토스가 관리해요. */
export function agreedSlot(group: NotifyGroup): string | null {
  return localStorage.getItem(AGREED_KEY[group]);
}

/** workStart("HH:mm")와 가장 가까운 출근 알림 슬롯 코드 */
export function nearestAmSlot(workStart: string): AmNotifySlotCode {
  const [h, m] = workStart.split(":").map(Number);
  const target = h * 60 + m;
  return AM_NOTIFY_SLOTS.reduce((best, slot) =>
    Math.abs(slot.minutes - target) < Math.abs(best.minutes - target) ? slot : best,
  ).code;
}

/** 알림 동의 화면을 열고 결과를 돌려줘요. */
export function requestNotify(code: NotifySlotCode, group: NotifyGroup): Promise<string> {
  return new Promise((resolve, reject) => {
    let cleanup: unknown;
    // 반환값이 함수라는 보장이 없어요 — 토스 앱 버전에 따라 아무것도 안 돌려줍니다.
    const done = (fn: () => void) => {
      fn();
      if (typeof cleanup === "function") cleanup();
    };
    try {
      cleanup = requestNotificationAgreement({
        options: { templateCode: code },
        onEvent: (result) => {
          if (result.type !== "agreementRejected") {
            localStorage.setItem(AGREED_KEY[group], code);
          }
          done(() => resolve(result.type));
        },
        onError: (error) => done(() => reject(error)),
      });
    } catch (error) {
      reject(error);
    }
  });
}
