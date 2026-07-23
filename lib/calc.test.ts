import { describe, it, expect } from "vitest";
import {
  parseLine,
  parseItems,
  calculateSettlement,
  settleUp,
  type PersonResult,
} from "./calc";

describe("parseLine", () => {
  it("항목명과 쉼표 금액을 분리한다", () => {
    expect(parseLine("마트 53,200")).toEqual({
      label: "마트",
      amount: 53200,
      raw: "마트 53,200",
      valid: true,
    });
  });

  it("항목명이 없어도 금액만 있으면 파싱된다", () => {
    const r = parseLine("10000")!;
    expect(r.valid).toBe(true);
    expect(r.amount).toBe(10000);
    expect(r.label).toBe("");
  });

  it("줄의 마지막 숫자 토큰을 금액으로 본다", () => {
    const r = parseLine("메가커피2 5,600")!;
    expect(r.amount).toBe(5600);
    expect(r.label).toBe("메가커피2");
  });

  it("숫자가 없으면 valid=false", () => {
    const r = parseLine("대충 커피값")!;
    expect(r.valid).toBe(false);
    expect(r.amount).toBe(0);
  });

  it("빈 줄은 null", () => {
    expect(parseLine("   ")).toBeNull();
  });
});

describe("parseItems — 실제 예시", () => {
  const aText = `운전자보험 10,960
배달 14,400
마트 53,200
고가네 35,590
쿠팡 31,900
메가커피 5,600
메가커피 7,160`;
  const bText = `페스룸 9,450
배민 13,500
쿠팡 12,400
맥날 15,493
이삭 16,900
쿠팡 34,260`;

  it("A/B 합계가 정확하다", () => {
    const a = parseItems(aText);
    const b = parseItems(bText);
    expect(a.every((i) => i.valid)).toBe(true);
    expect(b.every((i) => i.valid)).toBe(true);
    expect(a.reduce((s, i) => s + i.amount, 0)).toBe(158810);
    expect(b.reduce((s, i) => s + i.amount, 0)).toBe(102003);
  });
});

describe("calculateSettlement — 2인 실제 예시", () => {
  const people = [
    { name: "A", paid: 158810 },
    { name: "B", paid: 102003 },
  ];

  it("자투리를 A가 흡수하면 B가 A에게 28,404원", () => {
    const r = calculateSettlement(people, { unit: 1, mode: "round" }, 0);
    expect(r.total).toBe(260813);
    expect(r.transactions).toEqual([{ from: "B", to: "A", amount: 28404 }]);
  });

  it("자투리를 B가 흡수하면 B가 A에게 28,403원", () => {
    const r = calculateSettlement(people, { unit: 1, mode: "round" }, 1);
    expect(r.transactions).toEqual([{ from: "B", to: "A", amount: 28403 }]);
  });

  it("잔액 합은 항상 0 (정확 정산)", () => {
    for (let idx = 0; idx < 2; idx++) {
      const r = calculateSettlement(people, { unit: 1, mode: "round" }, idx);
      expect(r.people.reduce((s, p) => s + p.balance, 0)).toBe(0);
    }
  });
});

describe("calculateSettlement — 일반 속성", () => {
  it("송금 총액 = 받을 돈 총액, 각자 net이 balance와 일치", () => {
    const people = [
      { name: "가", paid: 30000 },
      { name: "나", paid: 15000 },
      { name: "다", paid: 0 },
      { name: "라", paid: 7777 },
    ];
    const r = calculateSettlement(people, { unit: 1, mode: "round" }, 0);

    // 잔액 합 0
    expect(r.people.reduce((s, p) => s + p.balance, 0)).toBe(0);

    // 각 사람의 (받은 − 보낸) == balance
    const net: Record<string, number> = {};
    for (const p of r.people) net[p.name] = 0;
    for (const t of r.transactions) {
      net[t.to] += t.amount;
      net[t.from] -= t.amount;
    }
    for (const p of r.people) expect(net[p.name]).toBe(p.balance);
  });

  it("모두 똑같이 냈으면 송금이 없다", () => {
    const r = calculateSettlement(
      [
        { name: "가", paid: 10000 },
        { name: "나", paid: 10000 },
      ],
      { unit: 1, mode: "round" },
      0
    );
    expect(r.transactions).toEqual([]);
  });

  it("십원 단위 반올림이어도 총합은 정확히 맞는다", () => {
    const people = [
      { name: "가", paid: 33333 },
      { name: "나", paid: 11111 },
      { name: "다", paid: 22222 },
    ];
    const r = calculateSettlement(people, { unit: 10, mode: "round" }, 0);
    expect(r.people.reduce((s, p) => s + p.share, 0)).toBe(r.total);
    expect(r.people.reduce((s, p) => s + p.balance, 0)).toBe(0);
  });
});

describe("settleUp", () => {
  it("2인은 송금 1건", () => {
    const people: PersonResult[] = [
      { name: "A", paid: 0, share: 0, balance: 100 },
      { name: "B", paid: 0, share: 0, balance: -100 },
    ];
    expect(settleUp(people)).toEqual([{ from: "B", to: "A", amount: 100 }]);
  });

  it("여러 채무자→채권자를 매칭한다", () => {
    const people: PersonResult[] = [
      { name: "가", paid: 0, share: 0, balance: 150 },
      { name: "나", paid: 0, share: 0, balance: -100 },
      { name: "다", paid: 0, share: 0, balance: -50 },
    ];
    const tx = settleUp(people);
    const received = tx.filter((t) => t.to === "가").reduce((s, t) => s + t.amount, 0);
    expect(received).toBe(150);
    expect(tx.reduce((s, t) => s + t.amount, 0)).toBe(150);
  });
});
