import { useEffect, useRef, useState } from "react";
import { TossAds } from "@apps-in-toss/web-framework";
import type { DayPhase } from "../lib/salary";
import { track } from "../lib/analytics";

/**
 * 콘솔에서 발급받은 "문구 강조(리스트형)" 배너 광고 단위 ID로 교체하세요.
 * 아래는 토스에서 제공하는 테스트 ID예요. (리스트형: ait-ad-test-banner-id)
 */
const BANNER_AD_GROUP_ID = "ait.v2.live.85e2b94e77ce480f";

/** 이미지 강조(피드형) 배너 광고그룹 ID — 본문 맨 아래용 */
const IMAGE_BANNER_AD_GROUP_ID = "ait.v2.live.4bc353ceebd441e2";

type InitState = "idle" | "pending" | "ready" | "failed";

// SDK 초기화는 앱 전체에서 한 번만 수행해요. (여러 배너가 생겨도 안전하게 공유)
let initState: InitState = "idle";
const waiters: Array<(ok: boolean) => void> = [];

function initOnce(): Promise<boolean> {
  if (initState === "ready") return Promise.resolve(true);
  if (initState === "failed") return Promise.resolve(false);

  return new Promise((resolve) => {
    waiters.push(resolve);
    if (initState === "pending") return;

    initState = "pending";
    TossAds.initialize({
      callbacks: {
        onInitialized: () => {
          initState = "ready";
          waiters.splice(0).forEach((w) => w(true));
        },
        onInitializationFailed: () => {
          initState = "failed";
          waiters.splice(0).forEach((w) => w(false));
        },
      },
    });
  });
}

/**
 * 한 번 붙은 배너는 같은 광고를 계속 물고 있어요. 주기마다 떼었다 다시 붙여
 * 새 광고를 받아옵니다.
 *
 * 30초인 이유: 토스 배너는 AdMob 기반인데 AdMob 은 30초보다 잦은 갱신을
 * 무효 트래픽으로 봐요. 더 짧게 잡으면 수익보다 제재 위험이 커져요.
 */
const REFRESH_MS = 30_000;

/**
 * 토스 앱 안에서만 배너를 노출해요.
 * - 토스 밖(웹 브라우저)에서는 isSupported가 false라 아무것도 렌더하지 않아요.
 * - 채울 광고가 없거나(noFill) 렌더 실패 시에도 영역을 접어서 빈 공간이 남지 않게 해요.
 */
export function BannerAdSlot({
  phase,
  adGroupId = BANNER_AD_GROUP_ID,
  height,
  grow,
}: {
  phase: DayPhase;
  /** 비우면 문구 강조형(하단 고정) 지면을 써요. */
  adGroupId?: string;
  /** 자리 높이(px). 이미지형은 200. 높이 0 이면 광고가 안 붙어요. */
  height?: number;
  /**
   * 소재가 height 보다 크면 그만큼 늘어나게 해요.
   * 하단 고정 배너에는 쓰면 안 돼요 — 위로 자라서 본문을 덮어요.
   */
  grow?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  // 이 값이 바뀔 때마다 아래 effect 가 다시 돌면서 배너를 새로 붙여요.
  const [round, setRound] = useState(0);

  useEffect(() => {
    // isSupported 는 토스 밖에서 예외를 던져요. 감싸지 않으면 이 화면이 통째로
    // 하얗게 죽어요 (에러 경계가 없어서 광고 하나가 페이지를 내려요).
    let supported = false;
    try {
      supported = TossAds.attachBanner.isSupported();
    } catch {
      supported = false;
    }
    if (!supported) {
      setVisible(false);
      return;
    }

    // 지난 회차가 no-fill 이었어도 이번 회차는 다시 보여줄 수 있게 접힘을 풀어요.
    setVisible(true);

    let cancelled = false;
    let attached: { destroy: () => void } | undefined;

    initOnce().then((ok) => {
      if (cancelled) return;
      if (!ok || ref.current == null) {
        setVisible(false);
        return;
      }
      try {
        attached = TossAds.attachBanner(adGroupId, ref.current, {
          theme: "auto",
          tone: "blackAndWhite",
          variant: "card",
          callbacks: {
            onAdFailedToRender: () => setVisible(false),
            onNoFill: () => setVisible(false),
          },
        });
        track.bannerImpression(phase);
      } catch (err) {
        console.error(err);
        setVisible(false);
      }
    });

    return () => {
      cancelled = true;
      try {
        attached?.destroy();
      } catch {
        /* 정리 중 예외가 화면을 죽이지 않게 삼켜요 */
      }
    };
    // round 가 바뀔 때만 새로 붙여요. (phase는 노출 로깅에만 사용)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // 화면을 보고 있을 때만 갱신해요. 안 보이는 동안 돌리면 노출로 잡히지 않고
  // 호출만 쌓여요.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer != null) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      timer = setInterval(() => setRound((n) => n + 1), REFRESH_MS);
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // no-fill 이어도 컨테이너는 남겨둬요. 아예 지워버리면 다음 갱신 때 붙일 자리가
  // 없어져서 배너가 영영 돌아오지 않아요.
  // SDK 가 소재 크기를 알려주지 않아서, 늘어나도 되는 자리는 minHeight 로 둬요.
  // height 로 고정하면 소재가 그보다 클 때 아래가 잘려요.
  return (
    <div
      ref={ref}
      style={
        grow
          ? { width: "100%", minHeight: visible ? height : 0, overflow: "hidden" }
          : { width: "100%", height: visible ? height : 0, overflow: "hidden" }
      }
    />
  );
}

/**
 * 이미지 강조형 배너 — 본문 스크롤 맨 아래에 붙여요.
 * 하단 고정 배너는 창에 붙어 있고, 이건 끝까지 내려야 보여요.
 */
export function ImageBannerAdSlot({ phase }: { phase: DayPhase }) {
  return (
    <BannerAdSlot phase={phase} adGroupId={IMAGE_BANNER_AD_GROUP_ID} height={200} grow />
  );
}
