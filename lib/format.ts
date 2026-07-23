export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}
