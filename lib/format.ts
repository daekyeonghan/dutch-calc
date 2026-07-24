export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

// 저장값은 UTC ISO. 서버(Vercel=UTC)에서 렌더돼도 항상 한국 시간으로 보이도록 Asia/Seoul로 포맷한다.
function seoulParts(iso: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23", // 자정을 24가 아니라 00으로
  }).formatToParts(new Date(iso));
  const out: Record<string, string> = {};
  for (const p of parts) out[p.type] = p.value;
  return out;
}

export function formatDate(iso: string): string {
  const p = seoulParts(iso);
  return `${p.year}.${p.month}.${p.day}`;
}

// 날짜 + 시각 (예: 2026.07.24 15:30) — 공유 텍스트/이미지에 "계산된 시점" 표기용.
export function formatDateTime(iso: string): string {
  const p = seoulParts(iso);
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}
