import { useEffect, useState } from "react";
import { Button, ProgressBar, Top } from "@toss/tds-mobile";
import { adaptive, colors } from "@toss/tds-colors";
import type { Profile } from "../lib/types";
import {
  formatDurationClock,
  formatWon,
  parseTimeToSeconds,
  wonPerHour,
  wonPerSecond,
  workSecondsPerDay,
} from "../lib/salary";
import { track } from "../lib/analytics";

interface Props {
  onStart: () => void;
}

/** 미리보기용 예시 조건 — 연봉 4,000만원, 9 to 6, 주 5일 */
const DEMO: Profile = {
  salaryType: "annual",
  amount: 4000,
  workStart: "09:00",
  workEnd: "18:00",
  workDays: [1, 2, 3, 4, 5],
  payday: 25,
};

const POINTS = [
  "연봉·월급·실수령액 중 아는 걸로 하나만 넣으면 돼요",
  "내 시급이랑 오늘 번 돈이 1초 단위로 올라가요",
  "이번 주·이번 달 누적, 퇴근까지 남은 시간, 월급날 D-day까지",
];

/**
 * 첫 실행에 한 번만 보여주는 화면.
 * 연봉을 묻기 전에 '지금 이 순간 얼마 버는지'를 예시로 먼저 보여줘요.
 */
export function IntroPage({ onStart }: Props) {
  const [now, setNow] = useState(() => new Date());

  // 화면 진입 1회 로깅
  useEffect(() => {
    track.introView();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const perSecond = wonPerSecond(DEMO);
  const workSec = workSecondsPerDay(DEMO);
  const startSec = parseTimeToSeconds(DEMO.workStart);
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const working =
    DEMO.workDays.includes(now.getDay()) && nowSec > startSec && nowSec < startSec + workSec;
  // 밤이나 주말에 열어도 카운터가 멈춰 보이지 않게, 근무 중이 아니면 오후 시간대 기준으로 보여줘요.
  const elapsed = working ? nowSec - startSec : 6 * 3600 + (nowSec % 3600);

  return (
    <div style={{ padding: "0 0 32px" }}>
        {/* 앱 이름은 토스 상단 바가 이미 보여줘요 — 여기서 또 쓰면 헤더가 겹쳐 보여요. */}
      <Top
        title={<Top.TitleParagraph size={28}>오늘 번 돈 세어보기</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            출근하고 지금까지 번 돈, 실시간으로 세어드려요
          </Top.SubtitleParagraph>
        }
      />

      <div style={{ padding: "8px 20px 0" }}>
        {/* 입력 전에 먼저 보여주는 미리보기 — 실제 메인 화면과 같은 카드예요. */}
        <div
          style={{
            borderRadius: 24,
            padding: "24px 24px 22px",
            background: `linear-gradient(135deg, ${colors.blue500}, ${colors.blue700})`,
            color: "#fff",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, opacity: 0.85 }}>
            연봉 4,000만원이면 지금 이만큼
          </p>
          <p
            style={{
              margin: "8px 0 4px",
              fontSize: 44,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatWon(perSecond * elapsed)}
          </p>
          <p style={{ margin: "0 0 18px", fontSize: 14, opacity: 0.8 }}>
            시급 {formatWon(wonPerHour(DEMO))} · 1초마다 {perSecond.toFixed(1)}원씩 적립 중
          </p>

          <ProgressBar progress={elapsed / workSec} size="bold" color="#fff" animate />
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
            <span>퇴근 게이지 {Math.floor((elapsed / workSec) * 100)}%</span>
            <span>퇴근까지 {formatDurationClock(workSec - elapsed)}</span>
          </div>
        </div>

        <p
          style={{
            margin: "10px 2px 0",
            fontSize: 12,
            color: adaptive.grey500,
          }}
        >
          예시 · 9시 출근 6시 퇴근, 주 5일 기준
        </p>

        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {POINTS.map((text) => (
            <div key={text} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 15, color: adaptive.blue500, fontWeight: 800 }}>·</span>
              <span style={{ fontSize: 14, lineHeight: 1.6, color: adaptive.grey700 }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <Button size="xlarge" display="full" onClick={onStart}>
            내 연봉으로 바꾸기
          </Button>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 18,
            fontSize: 12,
            color: adaptive.grey500,
            lineHeight: 1.6,
          }}
        >
          실제 급여가 아닌 환산 수치예요. 입력한 정보는 내 기기에만 저장돼요.
        </div>
      </div>
    </div>
  );
}
