import { useEffect, useMemo, useState } from "react";
import { Button, ProgressBar, TextButton } from "@toss/tds-mobile";
import { adaptive, colors } from "@toss/tds-colors";
import { generateHapticFeedback, share } from "@apps-in-toss/web-framework";
import type { Profile } from "../lib/types";
import {
  dailyPayWon,
  formatDurationClock,
  formatDurationShort,
  formatWon,
  getDayStatus,
  paydayDday,
  weekEarnedWon,
  wonPerSecond,
} from "../lib/salary";
import { nextHoliday } from "../lib/holidays";
import { BannerAdSlot } from "../components/BannerAdSlot";
import { DetailStatsUnlock } from "../components/DetailStatsUnlock";
import { earnedBand, track } from "../lib/analytics";

const PHASE_TITLE: Record<string, string> = {
  off: "오늘은 쉬는 날 🏖️",
  before: "출근 전이에요 ☕",
  working: "오늘 번 돈",
  done: "오늘 적립 완료 🎉",
};

interface Props {
  profile: Profile;
  onEdit: () => void;
}

export function MainPage({ profile, onEdit }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const status = useMemo(() => getDayStatus(now, profile), [now, profile]);
  const weekTotal = useMemo(() => weekEarnedWon(now, profile), [now, profile]);
  const payday = useMemo(() => paydayDday(now, profile.payday), [now, profile.payday]);
  const holiday = useMemo(() => nextHoliday(now), [now]);
  const daily = dailyPayWon(profile);
  const perSecond = wonPerSecond(profile);
  const percent = Math.floor(status.progress * 100);

  // 메인 진입 1회 로깅 (진입 시점의 단계·게이지 기준)
  useEffect(() => {
    track.mainView(status.phase, percent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateLabel = now.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const handleShare = async () => {
    track.shareClick(status.phase, earnedBand(status.earned), percent);
    try {
      await generateHapticFeedback({ type: "confetti" });
    } catch {
      // 토스 앱 밖에서는 햅틱 미지원
    }
    const lines =
      status.phase === "working"
        ? [
            `💰 오늘 번 돈 ${formatWon(status.earned)}`,
            `📊 퇴근 게이지 ${percent}% 충전 중`,
            `⏳ 퇴근까지 ${formatDurationShort(status.remainingSeconds)}`,
          ]
        : status.phase === "done"
          ? [`💰 오늘 번 돈 ${formatWon(status.earned)}`, `📊 퇴근 게이지 100% 충전 완료 🎉`]
          : [`🏖️ 오늘은 적립 쉬는 날`, `💸 다음 월급일까지 D-${payday}`];
    const message = [...lines, "", "월급카운터에서 나도 확인해보기 👀"].join("\n");
    try {
      await share({ message });
      track.shareComplete(status.phase, "toss");
    } catch {
      try {
        await navigator.share({ text: message });
        track.shareComplete(status.phase, "web");
      } catch {
        // 공유 취소 또는 미지원 환경
        track.shareCancel(status.phase);
      }
    }
  };

  return (
    <div style={{ padding: "16px 20px 40px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: adaptive.grey600 }}>
          {dateLabel}
        </span>
        <TextButton
          size="small"
          variant="arrow"
          color={adaptive.grey600}
          onClick={() => {
            track.settingsClick(status.phase);
            onEdit();
          }}
        >
          설정
        </TextButton>
      </div>

      {/* 메인 카운터 카드 (공유 카드와 동일 — 연봉 숫자는 노출하지 않음) */}
      <div
        style={{
          borderRadius: 24,
          padding: "28px 24px",
          background: `linear-gradient(135deg, ${colors.blue500}, ${colors.blue700})`,
          color: "#fff",
        }}
      >
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, opacity: 0.85 }}>
          {PHASE_TITLE[status.phase]}
        </p>

        {status.phase === "before" ? (
          <>
            <p
              style={{
                margin: "10px 0 4px",
                fontSize: 40,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatDurationClock(status.remainingSeconds)}
            </p>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>
              출근까지 남은 시간 · 오늘 예상 적립 {formatWon(daily)}
            </p>
          </>
        ) : status.phase === "off" ? (
          <>
            <p style={{ margin: "10px 0 4px", fontSize: 40, fontWeight: 800 }}>푹 쉬기</p>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>
              쉬는 것도 일이에요. 다음 근무일에 다시 적립을 시작해요.
            </p>
          </>
        ) : (
          <>
            <p
              style={{
                margin: "10px 0 4px",
                fontSize: 44,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatWon(status.earned)}
            </p>
            <p style={{ margin: "0 0 20px", fontSize: 14, opacity: 0.8 }}>
              {status.phase === "working"
                ? `1초마다 약 ${perSecond.toFixed(1)}원씩 적립 중`
                : "오늘치를 전부 벌었어요. 수고했어요!"}
            </p>

            <ProgressBar progress={status.progress} size="bold" color="#fff" animate />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
                fontSize: 14,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span>달성률 {percent}%</span>
              {status.phase === "working" && (
                <span>퇴근까지 {formatDurationClock(status.remainingSeconds)}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* 통계 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 16,
        }}
      >
        <StatCard label="이번 주 누적" value={formatWon(weekTotal)} />
        <StatCard label="하루 적립액" value={formatWon(daily)} />
        <StatCard
          label="월급일까지"
          value={payday === 0 ? "오늘! 🤑" : `D-${payday}`}
          caption={profile.payday === "last" ? "매월 말일" : `매월 ${profile.payday}일`}
        />
        <StatCard
          label="다음 공휴일"
          value={holiday ? (holiday.dday === 0 ? "오늘! 🎉" : `D-${holiday.dday}`) : "-"}
          caption={holiday?.name}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <Button display="block" size="xlarge" onClick={handleShare}>
          오늘 번 돈 자랑하기
        </Button>
      </div>

      <DetailStatsUnlock profile={profile} />

      <BannerAdSlot phase={status.phase} />

      <p
        style={{
          marginTop: 20,
          fontSize: 12,
          color: adaptive.grey500,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        표시되는 금액은 실제 급여가 아닌 재미용 단순 환산 수치예요.
        <br />
        세전·세후 등 실제 지급액과는 달라요.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: "16px 18px",
        backgroundColor: adaptive.greyOpacity100,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: adaptive.grey600 }}>{label}</p>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 18,
          fontWeight: 700,
          color: adaptive.grey800,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
      {caption && (
        <p style={{ margin: "2px 0 0", fontSize: 12, color: adaptive.grey500 }}>{caption}</p>
      )}
    </div>
  );
}
