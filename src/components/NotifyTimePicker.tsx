import { useState } from "react";
import { Button, useToast } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { Profile } from "../lib/types";
import {
  AM_NOTIFY_SLOTS,
  PM_NOTIFY_SLOTS,
  agreedSlot,
  isNotifySupported,
  nearestAmSlot,
  requestNotify,
  type AmNotifySlotCode,
  type NotifyGroup,
  type NotifySlotCode,
} from "../lib/notify";

/** 홈 화면 알림 시간 선택 카드 — 출근/점심 후 두 그룹을 독립적으로 동의해요. */
export function NotifyTimePicker({ profile }: { profile: Profile }) {
  const toast = useToast();
  const [amAgreed, setAmAgreed] = useState(() => agreedSlot("am"));
  const [pmAgreed, setPmAgreed] = useState(() => agreedSlot("pm"));
  const [pending, setPending] = useState<NotifySlotCode | null>(null);

  // isSupported 는 토스 밖에서 예외를 던져요. 감싸지 않으면 이 카드가 속한
  // 메인 화면이 통째로 하얗게 죽어요 (에러 경계가 없어요).
  const supported = (() => {
    try {
      return isNotifySupported();
    } catch {
      return false;
    }
  })();

  if (!supported) return null;

  const recommended: AmNotifySlotCode = nearestAmSlot(profile.workStart);

  const onPick = async (code: NotifySlotCode, group: NotifyGroup) => {
    setPending(code);
    try {
      const result = await requestNotify(code, group);
      if (result !== "agreementRejected") {
        if (group === "am") setAmAgreed(code);
        else setPmAgreed(code);
      }
      toast.openToast(
        result === "agreementRejected"
          ? "알림을 받으려면 동의가 필요해요."
          : result === "alreadyAgreed"
            ? "이미 알림을 받고 있어요."
            : "이제 그 시간에 알려드릴게요.",
      );
    } catch {
      toast.openToast("알림을 설정하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 16,
        padding: "16px 18px",
        backgroundColor: adaptive.greyOpacity100,
      }}
    >
      <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: adaptive.grey800 }}>
        알림 받을 시간 고르기
      </p>

      <SlotGroup
        title="출근 알림"
        slots={AM_NOTIFY_SLOTS}
        agreed={amAgreed}
        recommended={recommended}
        pending={pending}
        onPick={(code) => void onPick(code, "am")}
      />

      <div style={{ marginTop: 14 }}>
        <SlotGroup
          title="점심 후 알림"
          slots={PM_NOTIFY_SLOTS}
          agreed={pmAgreed}
          pending={pending}
          onPick={(code) => void onPick(code, "pm")}
        />
      </div>
    </div>
  );
}

function SlotGroup({
  title,
  slots,
  agreed,
  recommended,
  pending,
  onPick,
}: {
  title: string;
  slots: readonly { code: NotifySlotCode; label: string }[];
  agreed: string | null;
  recommended?: NotifySlotCode;
  pending: NotifySlotCode | null;
  onPick: (code: NotifySlotCode) => void;
}) {
  return (
    <div>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: adaptive.grey600 }}>
        {title}
        {agreed == null && recommended != null ? " · 출근 시각에 맞춰 추천드려요" : ""}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {slots.map((slot) => (
          <Button
            key={slot.code}
            size="small"
            variant={agreed === slot.code ? "fill" : "weak"}
            color={agreed === slot.code ? "primary" : "dark"}
            loading={pending === slot.code}
            onClick={() => onPick(slot.code)}
          >
            {slot.label}
            {agreed == null && recommended === slot.code ? " 👍" : ""}
          </Button>
        ))}
      </div>
    </div>
  );
}
