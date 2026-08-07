import { Button, Top } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";

interface Props {
  onStart: () => void;
}

const STEPS = [
  {
    emoji: "💰",
    title: "연봉과 근무 시간을 넣어요",
    body: "연봉(또는 월급)·출퇴근 시각·근무 요일·월급일만 넣으면 끝이에요. 이 기기에만 저장돼요.",
  },
  {
    emoji: "⏱️",
    title: "지금 이 순간 번 돈이 쌓여요",
    body: "출근한 순간부터 1초 단위로 올라가요. 퇴근 게이지가 얼마나 찼는지, 퇴근까지 얼마 남았는지도 보여드려요.",
  },
  {
    emoji: "📊",
    title: "주간·시급·월급일까지 한눈에",
    body: "광고를 보면 요일별 적립과 시급·분당 환산 같은 자세한 통계를 볼 수 있어요. 다음 월급일과 다가오는 공휴일도 알려드려요.",
  },
];

/** 첫 실행에 한 번만 보여주는 소개 화면. 연봉 입력 전에 무엇을 하는 앱인지 알려줘요. */
export function IntroPage({ onStart }: Props) {
  return (
    <div style={{ padding: "0 0 32px" }}>
      <Top
        title={<Top.TitleParagraph size={26}>월급 카운터</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            오늘 지금까지 번 돈, 실시간으로 봐요
          </Top.SubtitleParagraph>
        }
      />

      <div style={{ padding: "8px 20px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {STEPS.map((s) => (
            <div
              key={s.title}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                background: adaptive.grey50,
                borderRadius: 16,
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 28, lineHeight: 1.2 }}>{s.emoji}</div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 15, fontWeight: 800, color: adaptive.grey800 }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: adaptive.grey600,
                    marginTop: 4,
                  }}
                >
                  {s.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <Button size="xlarge" display="full" onClick={onStart}>
            시작하기
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
          세전 기준 단순 환산이에요. 실제 실수령액과는 달라요.
        </div>
      </div>
    </div>
  );
}
