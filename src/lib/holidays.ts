export interface Holiday {
  /** "YYYY-MM-DD" */
  date: string;
  name: string;
}

// 대한민국 공휴일 (대체공휴일 포함)
const HOLIDAYS: Holiday[] = [
  { date: "2026-06-06", name: "현충일" },
  { date: "2026-08-15", name: "광복절" },
  { date: "2026-08-17", name: "광복절 대체공휴일" },
  { date: "2026-09-24", name: "추석 연휴" },
  { date: "2026-09-25", name: "추석" },
  { date: "2026-09-26", name: "추석 연휴" },
  { date: "2026-10-03", name: "개천절" },
  { date: "2026-10-05", name: "개천절 대체공휴일" },
  { date: "2026-10-09", name: "한글날" },
  { date: "2026-12-25", name: "크리스마스" },
  { date: "2027-01-01", name: "신정" },
  { date: "2027-02-06", name: "설 연휴" },
  { date: "2027-02-07", name: "설날" },
  { date: "2027-02-08", name: "설 연휴" },
  { date: "2027-02-09", name: "설날 대체공휴일" },
  { date: "2027-03-01", name: "삼일절" },
];

export interface UpcomingHoliday extends Holiday {
  dday: number;
}

/** 오늘 이후 가장 가까운 공휴일 (오늘 포함, dday=0이면 오늘) */
export function nextHoliday(now: Date): UpcomingHoliday | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const holiday of HOLIDAYS) {
    const [y, m, d] = holiday.date.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (date >= today) {
      return { ...holiday, dday: Math.round((date.getTime() - today.getTime()) / 86400000) };
    }
  }
  return null;
}
