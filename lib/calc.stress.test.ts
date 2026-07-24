import { describe, it, expect } from "vitest";
import { parseLine, calculateSettlement, type RoundingOption } from "./calc";

// 돈 계산의 핵심 신뢰성 속성을 무작위·극단 입력으로 검증한다.
// 절대 지켜야 할 불변식:
//  (1) 몫 합계 == 총액           → 돈이 생기거나 사라지지 않음
//  (2) 잔액 합계 == 0            → 받을 돈 총합 == 줄 돈 총합
//  (3) 각자 (받은−보낸) == 잔액   → 송금 내역이 각 사람을 정확히 정산
//  (4) 송금액 총합 == 받을 돈 총합, 모든 송금액 > 0
function checkInvariants(
  people: { name: string; paid: number }[],
  rounding: RoundingOption,
  residualIndex: number
) {
  const r = calculateSettlement(people, rounding, residualIndex);

  // (1) 몫 합계 == 총액
  const shareSum = r.people.reduce((s, p) => s + p.share, 0);
  expect(shareSum).toBe(r.total);

  // (2) 잔액 합계 == 0
  const balanceSum = r.people.reduce((s, p) => s + p.balance, 0);
  expect(balanceSum).toBe(0);

  // (3) 각자 net(받은−보낸) == 잔액
  const net: Record<string, number> = {};
  for (const p of r.people) net[p.name] = 0;
  for (const t of r.transactions) {
    net[t.to] += t.amount;
    net[t.from] -= t.amount;
    // (4a) 모든 송금액은 양수
    expect(t.amount).toBeGreaterThan(0);
  }
  for (const p of r.people) expect(net[p.name]).toBe(p.balance);

  // (4b) 송금액 총합 == 받을 돈 총합
  const txTotal = r.transactions.reduce((s, t) => s + t.amount, 0);
  const creditTotal = r.people.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  expect(txTotal).toBe(creditTotal);

  return r;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("스트레스: 무작위 입력 5천 케이스 (2~10명, ~100억원)", () => {
  it("모든 불변식을 항상 만족한다", () => {
    const rand = mulberry32(12345); // 시드 고정 → 재현 가능
    const options: RoundingOption[] = [
      { unit: 1, mode: "round" },
      { unit: 1, mode: "floor" },
      { unit: 10, mode: "round" },
      { unit: 10, mode: "floor" },
    ];
    for (let iter = 0; iter < 5000; iter++) {
      const n = 2 + Math.floor(rand() * 9); // 2..10명
      const people = Array.from({ length: n }, (_, i) => ({
        name: `P${i}`,
        paid: Math.floor(rand() * 10_000_000_000), // 0 ~ 100억원
      }));
      const rounding = options[Math.floor(rand() * options.length)];
      const residualIndex = Math.floor(rand() * n);
      checkInvariants(people, rounding, residualIndex);
    }
  });
});

describe("스트레스: 극단 케이스", () => {
  it("10명 전원 최대급 금액(각 100억)", () => {
    const people = Array.from({ length: 10 }, (_, i) => ({ name: `P${i}`, paid: 9_999_999_999 }));
    for (let idx = 0; idx < 10; idx++) {
      const r = checkInvariants(people, { unit: 1, mode: "round" }, idx);
      expect(r.total).toBe(99_999_999_990);
    }
  });

  it("금액 편차 극단(한 명만 100억, 나머지 0)", () => {
    const people = [
      { name: "big", paid: 10_000_000_000 },
      ...Array.from({ length: 9 }, (_, i) => ({ name: `z${i}`, paid: 0 })),
    ];
    checkInvariants(people, { unit: 10, mode: "floor" }, 3);
  });

  it("나눠떨어지지 않는 큰 금액 + 십원 내림", () => {
    const people = [
      { name: "a", paid: 7_777_777_777 },
      { name: "b", paid: 3_333_333_333 },
      { name: "c", paid: 1_111_111_111 },
    ];
    checkInvariants(people, { unit: 10, mode: "floor" }, 0);
  });

  it("전원 0원이면 송금 없음", () => {
    const people = Array.from({ length: 10 }, (_, i) => ({ name: `P${i}`, paid: 0 }));
    const r = checkInvariants(people, { unit: 1, mode: "round" }, 0);
    expect(r.transactions).toEqual([]);
    expect(r.total).toBe(0);
  });
});

describe("파싱: 초대형 쉼표 금액", () => {
  it("십억 단위 쉼표 금액을 정확히 읽는다", () => {
    expect(parseLine("호텔 1,234,567,890")!.amount).toBe(1234567890);
    expect(parseLine("전세보증금 9,999,999,999")!.amount).toBe(9999999999);
  });
});
