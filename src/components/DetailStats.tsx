import { useMemo } from "react";
import { BarChart } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { Profile } from "../lib/types";
import {
  formatWon,
  monthEarnedWon,
  weeklyBreakdown,
  wonPerHour,
  wonPerMinute,
  yearEarnedWon,
} from "../lib/salary";

export function DetailStats({ profile }: { profile: Profile }) {
  // 열린 시점 기준 스냅샷 (초 단위로 다시 계산하지 않아요)
  const now = useMemo(() => new Date(), []);

  const month = useMemo(() => monthEarnedWon(now, profile), [now, profile]);
  const year = useMemo(() => yearEarnedWon(now, profile), [now, profile]);
  const perHour = wonPerHour(profile);
  const perMinute = wonPerMinute(profile);
  const week = useMemo(() => weeklyBreakdown(now, profile), [now, profile]);

  const weekMax = Math.max(...week.map((w) => w.won), 1);

  return (
    <div style={{ padding: "4px 24px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <DetailCard label="이번 달 누적" value={formatWon(month)} />
        <DetailCard label="올해 누적" value={formatWon(year)} />
        <DetailCard label="시급 환산" value={formatWon(perHour)} />
        <DetailCard label="분당 환산" value={formatWon(perMinute)} />
      </div>

      <p
        style={{
          margin: "24px 0 8px",
          fontSize: 14,
          fontWeight: 600,
          color: adaptive.grey600,
        }}
      >
        이번 주 요일별 적립
      </p>
      <BarChart
        data={week.map((w) => ({
          value: w.won,
          maxValue: weekMax,
          label: w.label,
        }))}
        fill={{ type: "all-bar", theme: "blue" }}
      />

      <p
        style={{
          marginTop: 16,
          fontSize: 12,
          color: adaptive.grey500,
          lineHeight: 1.5,
        }}
      >
        모든 금액은 실제 급여가 아닌 재미용 단순 환산 수치예요.
      </p>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
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
    </div>
  );
}
