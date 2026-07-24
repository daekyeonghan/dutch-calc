"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getClientId } from "@/lib/clientId";
import type { SettlementDetail } from "@/lib/settlement";
import { won, formatDate } from "@/lib/format";

export default function DetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<SettlementDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/settlements/${params.id}`, { headers: { "X-Client-Id": getClientId() } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [params.id]);

  async function remove() {
    if (!confirm("이 기록을 삭제할까요?")) return;
    const res = await fetch(`/api/settlements/${params.id}`, {
      method: "DELETE",
      headers: { "X-Client-Id": getClientId() },
    });
    if (res.ok) router.push("/history");
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/history"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
          aria-label="기록 목록으로"
        >
          ←
        </Link>
        <h1 className="text-xl font-extrabold text-slate-800">정산 상세</h1>
      </header>

      {error && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">
          기록을 불러오지 못했어요.
        </p>
      )}
      {!error && !data && <p className="p-6 text-center text-sm text-slate-400">불러오는 중…</p>}

      {data && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-lg font-bold text-slate-800">{data.title || "제목 없음"}</span>
            <span className="text-xs text-slate-400">{formatDate(data.createdAt)}</span>
          </div>

          <div className="mb-5 rounded-xl bg-indigo-50 p-5 text-center">
            <p className="text-sm font-semibold text-indigo-500">정산 결과</p>
            {data.payload.transactions.length === 0 ? (
              <p className="mt-2 text-lg font-bold text-slate-800">🎉 서로 주고받을 돈이 없어요!</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {data.payload.transactions.map((t, i) => (
                  <p key={i} className="text-lg font-bold text-slate-800">
                    <span className="text-rose-500">{t.from}</span> →{" "}
                    <span className="text-indigo-600">{t.to}</span>{" "}
                    <span className="text-slate-900">{won(t.amount)}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200">
            <div className="flex justify-between border-b border-slate-100 px-4 py-3 text-sm">
              <span className="text-slate-500">총 지출</span>
              <span className="font-bold text-slate-800">{won(data.total)}</span>
            </div>
            {data.payload.people.map((p, i) => (
              <div key={i} className="border-b border-slate-100 px-4 py-3 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{p.name}</span>
                  <span className="text-sm text-slate-500">
                    낸돈 {won(p.paid)} ·{" "}
                    {p.balance === 0 ? (
                      <span className="text-slate-400">정산 완료</span>
                    ) : p.balance > 0 ? (
                      <span className="text-indigo-600">받을 돈 {won(p.balance)}</span>
                    ) : (
                      <span className="text-rose-500">줄 돈 {won(-p.balance)}</span>
                    )}
                  </span>
                </div>
                {p.items.length > 0 && (
                  <div className="mt-1 text-xs text-slate-400">
                    {p.items.map((it) => `${it.label || "(항목)"} ${won(it.amount)}`).join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={remove}
            className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold text-rose-500 ring-1 ring-rose-200 transition hover:bg-rose-50"
          >
            기록 삭제
          </button>
        </div>
      )}
    </div>
  );
}
