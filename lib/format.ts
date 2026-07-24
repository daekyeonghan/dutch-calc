export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

// 날짜 + 시각 (예: 2026.07.24 15:30) — 공유 텍스트/이미지에 "계산된 시점" 표기용.
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
