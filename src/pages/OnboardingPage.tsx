import { useEffect, useMemo, useState } from "react";
import {
  BottomSheet,
  FixedBottomCTA,
  SegmentedControl,
  TextField,
  Top,
} from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { Profile } from "../lib/types";
import { DEFAULT_PROFILE } from "../lib/types";
import { formatWon, parseTimeToSeconds, wonPerHour, workSecondsPerDay } from "../lib/salary";
import { amountBand, paydayType, track } from "../lib/analytics";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
// 월~일 순서로 표시
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const PAYDAY_OPTIONS: { name: string; value: string }[] = [
  ...Array.from({ length: 31 }, (_, i) => ({
    name: `${i + 1}일`,
    value: String(i + 1),
  })),
  { name: "말일", value: "last" },
];

const AMOUNT_LABEL: Record<Profile["salaryType"], string> = {
  annual: "연봉 (세전)",
  monthly: "월급 (세전)",
  net: "월 실수령액 (세후)",
};

const AMOUNT_PLACEHOLDER: Record<Profile["salaryType"], string> = {
  annual: "예: 4000",
  monthly: "예: 330",
  net: "예: 290",
};

const AMOUNT_HELP: Record<Profile["salaryType"], string> = {
  annual: "세전 연봉을 넣으면 세금을 떼기 전 금액으로 계산해요",
  monthly: "세전 월급을 넣으면 세금을 떼기 전 금액으로 계산해요",
  net: "통장에 실제로 들어오는 금액을 넣으면 가장 와닿아요",
};

type SheetTarget = "workStart" | "workEnd" | "payday" | null;

interface Props {
  initial?: Profile;
  onComplete: (profile: Profile) => void;
}

export function OnboardingPage({ initial, onComplete }: Props) {
  const [salaryType, setSalaryType] = useState<Profile["salaryType"]>(
    initial?.salaryType ?? DEFAULT_PROFILE.salaryType,
  );
  const [amountText, setAmountText] = useState(
    initial && initial.amount > 0 ? String(initial.amount) : "",
  );
  const [workStart, setWorkStart] = useState(initial?.workStart ?? DEFAULT_PROFILE.workStart);
  const [workEnd, setWorkEnd] = useState(initial?.workEnd ?? DEFAULT_PROFILE.workEnd);
  const [workDays, setWorkDays] = useState<number[]>(
    initial?.workDays ?? DEFAULT_PROFILE.workDays,
  );
  const [payday, setPayday] = useState<Profile["payday"]>(
    initial?.payday ?? DEFAULT_PROFILE.payday,
  );
  const [sheet, setSheet] = useState<SheetTarget>(null);

  // 화면 진입 로깅 — initial이 있으면 정보수정, 없으면 첫 설정이에요.
  useEffect(() => {
    track.onboardingView(initial ? "edit" : "new");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amount = Number(amountText) || 0;
  const timeInvalid = parseTimeToSeconds(workEnd) <= parseTimeToSeconds(workStart);
  const valid = amount > 0 && workDays.length > 0 && !timeInvalid;

  const monthlyWon = useMemo(() => {
    if (amount <= 0) return 0;
    return salaryType === "annual" ? (amount * 10000) / 12 : amount * 10000;
  }, [amount, salaryType]);

  // 금액을 넣는 즉시 내 시급이 얼마인지 바로 보여줘요.
  const perHour = useMemo(() => {
    if (!valid) return 0;
    return wonPerHour({ salaryType, amount, workStart, workEnd, workDays, payday });
  }, [valid, salaryType, amount, workStart, workEnd, workDays, payday]);

  const toggleDay = (day: number) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleSubmit = () => {
    if (!valid) return;
    const next: Profile = { salaryType, amount, workStart, workEnd, workDays, payday };
    track.onboardingComplete({
      mode: initial ? "edit" : "new",
      salaryType,
      amountBand: amountBand(amount, salaryType),
      workHours: Math.round((workSecondsPerDay(next) / 3600) * 10) / 10,
      workDaysCount: workDays.length,
      paydayType: paydayType(payday),
    });
    onComplete(next);
  };

  return (
    <>
      <Top
        title={
          <Top.TitleParagraph size={22}>
            {initial ? "정보 수정하기" : "월급카운터 시작하기"}
          </Top.TitleParagraph>
        }
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            연봉·월급·실수령액 중 아는 걸로 하나만 넣어주세요
          </Top.SubtitleParagraph>
        }
      />

      <div style={{ padding: "0 24px 140px" }}>
        <SegmentedControl
          value={salaryType}
          onChange={(v) => {
            const next = v as Profile["salaryType"];
            setSalaryType(next);
            track.onboardingSalaryType(next);
          }}
        >
          <SegmentedControl.Item value="annual">연봉</SegmentedControl.Item>
          <SegmentedControl.Item value="monthly">월급</SegmentedControl.Item>
          <SegmentedControl.Item value="net">실수령액</SegmentedControl.Item>
        </SegmentedControl>

        <TextField
          variant="line"
          label={AMOUNT_LABEL[salaryType]}
          labelOption="sustain"
          placeholder={AMOUNT_PLACEHOLDER[salaryType]}
          suffix="만원"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
          help={
            perHour > 0
              ? `월 ${Math.floor(monthlyWon).toLocaleString("ko-KR")}원 · 내 시급은 약 ${formatWon(perHour)}이에요`
              : AMOUNT_HELP[salaryType]
          }
          paddingTop={24}
        />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <TextField.Button
              variant="line"
              label="출근 시각"
              labelOption="sustain"
              value={workStart}
              onClick={() => setSheet("workStart")}
            />
          </div>
          <div style={{ flex: 1 }}>
            <TextField.Button
              variant="line"
              label="퇴근 시각"
              labelOption="sustain"
              value={workEnd}
              hasError={timeInvalid}
              onClick={() => setSheet("workEnd")}
            />
          </div>
        </div>
        {timeInvalid && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: adaptive.red500 }}>
            퇴근 시각은 출근 시각보다 늦어야 해요
          </p>
        )}

        <p
          style={{
            margin: "28px 0 10px",
            fontSize: 14,
            fontWeight: 600,
            color: adaptive.grey600,
          }}
        >
          근무 요일
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {WEEKDAY_ORDER.map((day) => {
            const selected = workDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={selected}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: "none",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: selected ? adaptive.blue500 : adaptive.greyOpacity100,
                  color: selected ? "#fff" : adaptive.grey600,
                }}
              >
                {WEEKDAY_LABELS[day]}
              </button>
            );
          })}
        </div>

        <TextField.Button
          variant="line"
          label="월급일"
          labelOption="sustain"
          value={payday === "last" ? "말일" : `${payday}일`}
          onClick={() => setSheet("payday")}
        />

        <p style={{ marginTop: 32, fontSize: 12, color: adaptive.grey500, lineHeight: 1.5 }}>
          월급카운터는 넣어주신 금액을 근무 시간으로 나눠 보여주는 환산기예요. 실제 급여나
          세금을 대신 계산해 주지는 않아요. 세전 연봉·월급을 넣으면 세금을 떼기 전 금액으로,
          실수령액을 넣으면 통장에 들어오는 금액 기준으로 보여줘요. 야근·수당은 반영되지 않고,
          입력한 정보는 내 기기에만 저장돼요.
        </p>
      </div>

      <FixedBottomCTA disabled={!valid} onClick={handleSubmit}>
        {initial ? "저장하기" : "시작하기"}
      </FixedBottomCTA>

      <BottomSheet
        open={sheet === "workStart" || sheet === "workEnd"}
        header={
          <BottomSheet.Header>
            {sheet === "workStart" ? "출근 시각" : "퇴근 시각"}
          </BottomSheet.Header>
        }
        onClose={() => setSheet(null)}
        maxHeight={480}
      >
        <BottomSheet.Select
          options={TIME_OPTIONS.map((t) => ({ name: t, value: t }))}
          value={sheet === "workStart" ? workStart : workEnd}
          onChange={(e) => {
            if (sheet === "workStart") setWorkStart(e.target.value);
            else setWorkEnd(e.target.value);
            setSheet(null);
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "payday"}
        header={<BottomSheet.Header>월급일</BottomSheet.Header>}
        onClose={() => setSheet(null)}
        maxHeight={480}
      >
        <BottomSheet.Select
          options={PAYDAY_OPTIONS}
          value={payday === "last" ? "last" : String(payday)}
          onChange={(e) => {
            setPayday(e.target.value === "last" ? "last" : Number(e.target.value));
            setSheet(null);
          }}
        />
      </BottomSheet>
    </>
  );
}
