export interface Profile {
  /** 급여 입력 방식 */
  salaryType: "annual" | "monthly";
  /** 입력 금액 (만원 단위) */
  amount: number;
  /** 출근 시각 "HH:mm" */
  workStart: string;
  /** 퇴근 시각 "HH:mm" */
  workEnd: string;
  /** 근무 요일 (0=일 ~ 6=토) */
  workDays: number[];
  /** 월급일 (1~31일, "last"=말일) */
  payday: number | "last";
}

export const DEFAULT_PROFILE: Profile = {
  salaryType: "annual",
  amount: 0,
  workStart: "09:00",
  workEnd: "18:00",
  workDays: [1, 2, 3, 4, 5],
  payday: 25,
};
