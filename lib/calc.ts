// dutch-calc 핵심 로직: 파싱 + 정산 계산 (전부 결정적, LLM 없음).
// 돈 계산이므로 여기 함수들은 순수 함수로 유지하고 단위 테스트로 검증한다.

export type RoundingUnit = 1 | 10;
export type RoundingMode = "round" | "floor";

export interface RoundingOption {
  unit: RoundingUnit;
  mode: RoundingMode;
}

export const DEFAULT_ROUNDING: RoundingOption = { unit: 1, mode: "round" };

/** 파싱된 한 줄(항목). valid=false면 금액을 못 읽은 줄 → 사용자가 확인 화면에서 고침. */
export interface ParsedItem {
  label: string;
  amount: number;
  raw: string;
  valid: boolean;
}

/** 한 사람의 확정된 항목들 (확인·수정 후). */
export interface PersonItems {
  name: string;
  items: { label: string; amount: number }[];
}

export interface PersonResult {
  name: string;
  paid: number; // 낸 돈(항목 합계)
  share: number; // 부담해야 할 몫
  balance: number; // paid - share (양수=받을 돈, 음수=줄 돈)
}

export interface Transaction {
  from: string; // 보내는 사람
  to: string; // 받는 사람
  amount: number;
}

export interface SettlementResult {
  people: PersonResult[];
  total: number;
  perPerson: number; // 반올림 전 이상적 1인당(참고용, 소수 가능)
  transactions: Transaction[];
  residual: number; // 자투리(반올림 때문에 한 명이 흡수한 차액; 음수면 그만큼 덜 냄)
  residualName: string | null; // 자투리를 흡수한 사람
  rounding: RoundingOption;
}

/** 한 줄에서 금액(마지막 숫자 토큰)을 뽑아 항목으로 파싱. */
export function parseLine(raw: string): ParsedItem | null {
  const line = raw.trim();
  if (line === "") return null; // 빈 줄은 무시

  // 쉼표 포함 숫자 토큰들을 모두 찾고 마지막 것을 금액으로 본다.
  const matches = line.match(/\d[\d,]*/g);
  if (!matches || matches.length === 0) {
    return { label: line, amount: 0, raw, valid: false };
  }
  const amountToken = matches[matches.length - 1];
  const amount = parseInt(amountToken.replace(/,/g, ""), 10);
  if (!Number.isFinite(amount)) {
    return { label: line, amount: 0, raw, valid: false };
  }
  // 라벨 = 마지막 숫자 토큰을 제거한 나머지.
  const idx = line.lastIndexOf(amountToken);
  const label = (line.slice(0, idx) + line.slice(idx + amountToken.length))
    .replace(/\s+/g, " ")
    .trim();
  return { label, amount, raw, valid: true };
}

/** 여러 줄 텍스트를 항목 목록으로 파싱. */
export function parseItems(text: string): ParsedItem[] {
  return text
    .split(/\r?\n/)
    .map(parseLine)
    .filter((x): x is ParsedItem => x !== null);
}

function quantize(value: number, unit: RoundingUnit, mode: RoundingMode): number {
  if (mode === "floor") return Math.floor(value / unit) * unit;
  return Math.round(value / unit) * unit;
}

/**
 * 정산 계산.
 * - 모든 사람이 전부를 똑같이 N등분한다는 전제.
 * - 반올림 때문에 생기는 자투리는 residualIndex 사람에게 몰아주어 총합을 정확히 맞춘다.
 * - residualIndex를 주지 않으면 랜덤으로 한 명을 뽑는다(호출부에서 고정값을 주면 결정적으로 테스트 가능).
 */
export function calculateSettlement(
  people: { name: string; paid: number }[],
  rounding: RoundingOption = DEFAULT_ROUNDING,
  residualIndex?: number
): SettlementResult {
  const n = people.length;
  const total = people.reduce((s, p) => s + p.paid, 0);
  const perPerson = n > 0 ? total / n : 0;

  const q = n > 0 ? quantize(perPerson, rounding.unit, rounding.mode) : 0;
  const shares = new Array<number>(n).fill(q);

  // 자투리 = 총액 - (균등몫 합). 한 명이 흡수해서 shares 합 = total 이 되도록.
  const residual = total - q * n;
  const idx =
    residualIndex !== undefined
      ? residualIndex
      : n > 0
        ? Math.floor(Math.random() * n)
        : 0;
  if (n > 0) shares[idx] += residual;

  const results: PersonResult[] = people.map((p, i) => ({
    name: p.name,
    paid: p.paid,
    share: shares[i],
    balance: p.paid - shares[i],
  }));

  return {
    people: results,
    total,
    perPerson,
    transactions: settleUp(results),
    residual,
    residualName: n > 0 ? people[idx].name : null,
    rounding,
  };
}

/**
 * 채무자→채권자 송금 내역을 최소 건수에 가깝게 계산.
 * balance 합은 0(shares 합 = total)이라 항상 정확히 정산된다.
 */
export function settleUp(people: PersonResult[]): Transaction[] {
  const creditors = people
    .filter((p) => p.balance > 0)
    .map((p) => ({ name: p.name, amount: p.balance }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = people
    .filter((p) => p.balance < 0)
    .map((p) => ({ name: p.name, amount: -p.balance }))
    .sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const give = Math.min(creditors[ci].amount, debtors[di].amount);
    if (give > 0) {
      transactions.push({ from: debtors[di].name, to: creditors[ci].name, amount: give });
    }
    creditors[ci].amount -= give;
    debtors[di].amount -= give;
    if (creditors[ci].amount === 0) ci++;
    if (debtors[di].amount === 0) di++;
  }
  return transactions;
}
