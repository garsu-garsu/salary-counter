import { useEffect, useRef, useState } from "react";
import { TossAds } from "@apps-in-toss/web-framework";
import type { DayPhase } from "../lib/salary";
import { track } from "../lib/analytics";

/**
 * 콘솔에서 발급받은 "문구 강조(리스트형)" 배너 광고 단위 ID로 교체하세요.
 * 아래는 토스에서 제공하는 테스트 ID예요. (리스트형: ait-ad-test-banner-id)
 */
const BANNER_AD_GROUP_ID = "ait.v2.live.85e2b94e77ce480f";

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
 * 토스 앱 안에서만 배너를 노출해요.
 * - 토스 밖(웹 브라우저)에서는 isSupported가 false라 아무것도 렌더하지 않아요.
 * - 채울 광고가 없거나(noFill) 렌더 실패 시에도 영역을 접어서 빈 공간이 남지 않게 해요.
 */
export function BannerAdSlot({ phase }: { phase: DayPhase }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!TossAds.attachBanner.isSupported()) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    let attached: { destroy: () => void } | undefined;

    initOnce().then((ok) => {
      if (cancelled) return;
      if (!ok || ref.current == null) {
        setVisible(false);
        return;
      }
      attached = TossAds.attachBanner(BANNER_AD_GROUP_ID, ref.current, {
        theme: "auto",
        tone: "blackAndWhite",
        variant: "card",
        callbacks: {
          onAdFailedToRender: () => setVisible(false),
          onNoFill: () => setVisible(false),
        },
      });
      track.bannerImpression(phase);
    });

    return () => {
      cancelled = true;
      attached?.destroy();
    };
    // 배너는 마운트 시 1회만 붙여요. (phase는 노출 로깅에만 사용)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return <div ref={ref} style={{ width: "100%", marginTop: 16 }} />;
}
