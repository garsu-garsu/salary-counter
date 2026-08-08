import { useCallback, useEffect, useRef, useState } from "react";
import { BottomSheet, Button, useToast } from "@toss/tds-mobile";
import { GoogleAdMob } from "@apps-in-toss/web-framework";
import type { Profile } from "../lib/types";
import { DetailStats } from "./DetailStats";
import { track } from "../lib/analytics";

/**
 * 콘솔에서 발급받은 "리워드(보상형)" 광고 단위 ID로 교체하세요.
 */
const REWARDED_AD_GROUP_ID = "ait.v2.live.68c03bab7b874b8e";

/**
 * "광고 보고 자세한 통계 보기" 버튼.
 * - 광고를 끝까지 본 사용자(userEarnedReward)에게만 상세 통계를 열어줘요.
 * - 한 번 해제하면 이번 세션 동안은 광고 없이 다시 볼 수 있어요.
 * - 토스 밖(웹/개발)처럼 광고를 지원하지 않는 환경에서는 광고 없이 바로 열어요.
 */
export function DetailStatsUnlock({ profile }: { profile: Profile }) {
  const toast = useToast();
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  // isSupported 는 토스 밖에서 예외를 던져요. 감싸지 않으면 이 컴포넌트가 속한
  // 메인 화면이 통째로 하얗게 죽어요 (에러 경계가 없어요).
  const adSupported = (() => {
    try {
      return (
        GoogleAdMob.loadAppsInTossAdMob.isSupported() &&
        GoogleAdMob.showAppsInTossAdMob.isSupported()
      );
    } catch {
      return false;
    }
  })();

  const loadCleanup = useRef<(() => void) | null>(null);

  const preload = useCallback(() => {
    if (!adSupported) return;
    loadCleanup.current?.();
    loadCleanup.current = GoogleAdMob.loadAppsInTossAdMob({
      options: { adGroupId: REWARDED_AD_GROUP_ID },
      onEvent: () => { },
      onError: () => { },
    });
  }, [adSupported]);

  useEffect(() => {
    preload();
    return () => loadCleanup.current?.();
  }, [preload]);

  const handleClick = () => {
    track.rewardedClick(unlocked);
    // 이미 해제했거나 광고 미지원 환경이면 바로 열어요.
    if (unlocked || !adSupported) {
      setUnlocked(true);
      setOpen(true);
      track.detailStatsView(false);
      return;
    }

    setPending(true);
    let earned = false;
    GoogleAdMob.showAppsInTossAdMob({
      options: { adGroupId: REWARDED_AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === "userEarnedReward") {
          earned = true;
          track.rewardedComplete();
        } else if (event.type === "dismissed") {
          setPending(false);
          if (earned) {
            setUnlocked(true);
            setOpen(true);
            track.detailStatsView(true);
          } else {
            // 아무 반응이 없으면 버튼이 고장 난 것처럼 보여요.
            toast.openToast("광고를 끝까지 봐야 열려요.");
          }
          preload(); // 다음 시청을 위해 다시 불러와요.
        } else if (event.type === "failedToShow") {
          setPending(false);
          toast.openToast("광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
          preload();
        }
      },
      onError: () => {
        setPending(false);
        toast.openToast("광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        preload();
      },
    });
  };

  return (
    <>
      <div style={{ marginTop: 12 }}>
        <Button
          display="block"
          size="xlarge"
          variant="weak"
          loading={pending}
          onClick={handleClick}
        >
          {unlocked ? "자세한 통계 보기" : "광고 보고 자세한 통계 보기"}
        </Button>
      </div>

      <BottomSheet
        open={open}
        header={<BottomSheet.Header>자세한 통계</BottomSheet.Header>}
        onClose={() => setOpen(false)}
        maxHeight={560}
      >
        {unlocked && <DetailStats profile={profile} />}
      </BottomSheet>
    </>
  );
}
