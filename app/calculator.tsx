"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  parseItems,
  calculateSettlement,
  DEFAULT_ROUNDING,
  type RoundingOption,
  type RoundingUnit,
  type RoundingMode,
  type SettlementResult,
} from "@/lib/calc";
import { getClientId } from "@/lib/clientId";
import type { SettlementPayload } from "@/lib/settlement";

type Step = "setup" | "input" | "review" | "result";

interface EditItem {
  label: string;
  amount: number;
  needsCheck: boolean; // 파싱 때 금액을 못 읽은 줄 → 사용자 확인 필요
}
interface PersonEdit {
  name: string;
  items: EditItem[];
}

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default function Calculator() {
  const [step, setStep] = useState<Step>("setup");
  const [names, setNames] = useState<string[]>(["", ""]);
  const [texts, setTexts] = useState<string[]>(["", ""]);
  const [people, setPeople] = useState<PersonEdit[]>([]);
  const [rounding, setRounding] = useState<RoundingOption>(DEFAULT_ROUNDING);
  const [result, setResult] = useState<SettlementResult | null>(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [savedId, setSavedId] = useState<string | null>(null);

  const displayName = (raw: string, i: number) => raw.trim() || `사람${i + 1}`;

  // ---- setup ----
  function setCount(n: number) {
    const next = Math.max(2, Math.min(10, n));
    setNames((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push("");
      arr.length = next;
      return arr;
    });
    setTexts((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push("");
      arr.length = next;
      return arr;
    });
  }

  // ---- input → parse ----
  function goReview() {
    const parsed: PersonEdit[] = names.map((raw, i) => ({
      name: displayName(raw, i),
      items: parseItems(texts[i]).map((it) => ({
        label: it.label,
        amount: it.amount,
        needsCheck: !it.valid,
      })),
    }));
    setPeople(parsed);
    setStep("review");
  }

  // ---- review helpers ----
  function updateItem(pi: number, ii: number, patch: Partial<EditItem>) {
    setPeople((prev) => {
      const next = prev.map((p) => ({ ...p, items: [...p.items] }));
      next[pi].items[ii] = { ...next[pi].items[ii], ...patch };
      return next;
    });
  }
  function deleteItem(pi: number, ii: number) {
    setPeople((prev) => {
      const next = prev.map((p) => ({ ...p, items: [...p.items] }));
      next[pi].items.splice(ii, 1);
      return next;
    });
  }
  function addItem(pi: number) {
    setPeople((prev) => {
      const next = prev.map((p) => ({ ...p, items: [...p.items] }));
      next[pi].items.push({ label: "", amount: 0, needsCheck: false });
      return next;
    });
  }
  const personTotal = (p: PersonEdit) => p.items.reduce((s, it) => s + (it.amount || 0), 0);

  // ---- calculate ----
  function calculate() {
    const paid = people.map((p) => ({ name: p.name, paid: personTotal(p) }));
    setResult(calculateSettlement(paid, rounding));
    setSaveState("idle");
    setSavedId(null);
    setStep("result");
  }

  function reset() {
    setStep("setup");
    setResult(null);
    setPeople([]);
    setTitle("");
    setSaveState("idle");
    setSavedId(null);
  }

  // ---- save (기록) ----
  async function save() {
    if (!result) return;
    const payload: SettlementPayload = {
      people: result.people.map((pr, i) => ({
        ...pr,
        items: people[i].items.map((it) => ({ label: it.label, amount: it.amount })),
      })),
      transactions: result.transactions,
      total: result.total,
      perPerson: result.perPerson,
      residual: result.residual,
      residualName: result.residualName,
      rounding: result.rounding,
    };
    setSaveState("saving");
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Client-Id": getClientId() },
        body: JSON.stringify({
          title,
          peopleCount: result.people.length,
          total: result.total,
          payload,
        }),
      });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      setSavedId(id);
      setSaveState("saved");
    } catch {
      setSaveState("idle");
      alert("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-xl px-4 py-8">
      <Link
        href="/history"
        className="absolute right-4 top-4 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
      >
        📋 기록
      </Link>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
          🧮 더치페이 계산기
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          지출 내역을 붙여넣으면 누가 누구에게 얼마 보낼지 계산해드려요
        </p>
      </header>

      <Stepper step={step} />

      {step === "setup" && (
        <Section>
          <div className="mb-4 flex items-center justify-between">
            <span className="font-semibold text-slate-700">인원</span>
            <div className="flex items-center gap-3">
              <RoundBtn onClick={() => setCount(names.length - 1)} disabled={names.length <= 2}>
                −
              </RoundBtn>
              <span className="w-8 text-center text-lg font-bold">{names.length}</span>
              <RoundBtn onClick={() => setCount(names.length + 1)} disabled={names.length >= 10}>
                +
              </RoundBtn>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {names.map((name, i) => (
              <input
                key={i}
                value={name}
                onChange={(e) =>
                  setNames((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                }
                placeholder={`사람${i + 1} 이름`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-indigo-400"
              />
            ))}
          </div>
          <PrimaryBtn className="mt-6" onClick={() => setStep("input")}>
            다음
          </PrimaryBtn>
        </Section>
      )}

      {step === "input" && (
        <Section>
          <p className="mb-3 text-sm text-slate-500">
            각자 지출 내역을 한 줄에 하나씩 붙여넣으세요.{" "}
            <span className="text-slate-400">예: 마트 53,200</span>
          </p>
          <div className="flex flex-col gap-4">
            {names.map((name, i) => (
              <div key={i}>
                <label className="mb-1 block font-semibold text-slate-700">
                  {displayName(name, i)}
                </label>
                <textarea
                  value={texts[i]}
                  onChange={(e) =>
                    setTexts((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  rows={6}
                  placeholder={"마트 53,200\n배달 14,400\n메가커피 5,600"}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none focus:border-indigo-400"
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <GhostBtn onClick={() => setStep("setup")}>이전</GhostBtn>
            <PrimaryBtn onClick={goReview}>내역 확인</PrimaryBtn>
          </div>
        </Section>
      )}

      {step === "review" && (
        <Section>
          <p className="mb-4 text-sm text-slate-500">
            파싱 결과를 확인하고 필요하면 고치세요. <b className="text-slate-700">계산 전에 꼭 확인!</b>
          </p>
          <div className="flex flex-col gap-5">
            {people.map((p, pi) => (
              <div key={pi} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold text-slate-800">{p.name}</span>
                  <span className="text-sm font-semibold text-indigo-600">
                    합계 {won(personTotal(p))}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {p.items.map((it, ii) => (
                    <div key={ii} className="flex items-center gap-2">
                      <input
                        value={it.label}
                        onChange={(e) => updateItem(pi, ii, { label: e.target.value })}
                        placeholder="항목"
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                      />
                      <input
                        inputMode="numeric"
                        value={it.amount ? it.amount.toLocaleString("ko-KR") : ""}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^\d]/g, "");
                          updateItem(pi, ii, { amount: digits ? parseInt(digits, 10) : 0, needsCheck: false });
                        }}
                        placeholder="금액"
                        className={`w-28 rounded-lg border px-3 py-2 text-right text-sm outline-none focus:border-indigo-400 ${
                          it.needsCheck ? "border-rose-300 bg-rose-50" : "border-slate-200"
                        }`}
                      />
                      <button
                        onClick={() => deleteItem(pi, ii)}
                        className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:text-rose-500"
                        aria-label="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {p.items.some((it) => it.needsCheck) && (
                    <p className="text-xs text-rose-500">금액을 못 읽은 줄이 있어요(빨간 칸). 금액을 채워주세요.</p>
                  )}
                  <button
                    onClick={() => addItem(pi)}
                    className="mt-1 self-start rounded-lg px-2 py-1 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
                  >
                    + 항목 추가
                  </button>
                </div>
              </div>
            ))}
          </div>

          <RoundingPicker rounding={rounding} onChange={setRounding} />

          <div className="mt-6 flex gap-3">
            <GhostBtn onClick={() => setStep("input")}>이전</GhostBtn>
            <PrimaryBtn onClick={calculate}>계산하기</PrimaryBtn>
          </div>
        </Section>
      )}

      {step === "result" && result && (
        <Section>
          <div className="mb-5 rounded-xl bg-indigo-50 p-5 text-center">
            <p className="text-sm font-semibold text-indigo-500">정산 결과</p>
            {result.transactions.length === 0 ? (
              <p className="mt-2 text-lg font-bold text-slate-800">
                🎉 서로 주고받을 돈이 없어요!
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {result.transactions.map((t, i) => (
                  <p key={i} className="text-lg font-bold text-slate-800">
                    <span className="text-rose-500">{t.from}</span> →{" "}
                    <span className="text-indigo-600">{t.to}</span>{" "}
                    <span className="text-slate-900">{won(t.amount)}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {result.residual !== 0 && result.residualName && (
            <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-center text-sm text-amber-700">
              🎲 자투리 {won(Math.abs(result.residual))}은{" "}
              <b>{result.residualName}</b>님이{" "}
              {result.residual < 0 ? "할인받았어요" : "더 부담했어요"}
            </p>
          )}

          <div className="rounded-xl border border-slate-200">
            <div className="flex justify-between border-b border-slate-100 px-4 py-3 text-sm">
              <span className="text-slate-500">총 지출</span>
              <span className="font-bold text-slate-800">{won(result.total)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 px-4 py-3 text-sm">
              <span className="text-slate-500">1인당</span>
              <span className="font-semibold text-slate-700">{won(Math.round(result.perPerson))}</span>
            </div>
            {result.people.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-semibold text-slate-700">{p.name}</span>
                <span className="text-slate-500">
                  냄 {won(p.paid)} ·{" "}
                  {p.balance === 0 ? (
                    <span className="text-slate-400">정산 완료</span>
                  ) : p.balance > 0 ? (
                    <span className="text-indigo-600">받을 {won(p.balance)}</span>
                  ) : (
                    <span className="text-rose-500">줄 {won(-p.balance)}</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* 저장 */}
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            {saveState === "saved" ? (
              <div className="text-center">
                <p className="font-semibold text-emerald-600">✅ 기록에 저장했어요</p>
                <Link
                  href={savedId ? `/history/${savedId}` : "/history"}
                  className="mt-1 inline-block text-sm font-semibold text-indigo-600 hover:underline"
                >
                  저장된 기록 보기 →
                </Link>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목 (선택) 예: 7월 제주 여행"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <button
                  onClick={save}
                  disabled={saveState === "saving"}
                  className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-900 disabled:opacity-50"
                >
                  {saveState === "saving" ? "저장 중…" : "기록 저장"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <GhostBtn onClick={() => setStep("review")}>내역 수정</GhostBtn>
            <PrimaryBtn onClick={reset}>처음부터</PrimaryBtn>
          </div>
        </Section>
      )}
    </div>
  );
}

// ---------- 작은 UI 조각들 ----------

function Section({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">{children}</div>;
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "setup", label: "인원" },
    { key: "input", label: "입력" },
    { key: "review", label: "확인" },
    { key: "result", label: "결과" },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="mb-4 flex items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <span
            className={`flex h-7 items-center gap-1 rounded-full px-3 text-xs font-bold ${
              i <= idx ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-slate-300">·</span>}
        </div>
      ))}
    </div>
  );
}

function RoundingPicker({
  rounding,
  onChange,
}: {
  rounding: RoundingOption;
  onChange: (r: RoundingOption) => void;
}) {
  return (
    <div className="mt-5 rounded-xl bg-slate-50 p-4">
      <p className="mb-2 text-sm font-semibold text-slate-600">반올림</p>
      <div className="flex flex-wrap gap-2 text-sm">
        {([1, 10] as RoundingUnit[]).map((u) => (
          <Chip key={u} active={rounding.unit === u} onClick={() => onChange({ ...rounding, unit: u })}>
            {u === 1 ? "원 단위" : "십원 단위"}
          </Chip>
        ))}
        <span className="mx-1 w-px self-stretch bg-slate-200" />
        {(["round", "floor"] as RoundingMode[]).map((m) => (
          <Chip key={m} active={rounding.mode === m} onClick={() => onChange({ ...rounding, mode: m })}>
            {m === "round" ? "반올림" : "내림"}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 font-semibold transition ${
        active ? "bg-indigo-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99] ${className}`}
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-4 py-3 font-semibold text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function RoundBtn({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
