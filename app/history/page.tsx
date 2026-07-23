"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClientId } from "@/lib/clientId";
import type { SettlementListItem } from "@/lib/settlement";
import { won, formatDate } from "@/lib/format";

export default function HistoryPage() {
  const [items, setItems] = useState<SettlementListItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/settlements", { headers: { "X-Client-Id": getClientId() } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setItems)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
          aria-label="계산기로"
        >
          ←
        </Link>
        <h1 className="text-xl font-extrabold text-slate-800">📋 정산 기록</h1>
      </header>

      {error && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">
          기록을 불러오지 못했어요.
        </p>
      )}
      {!error && items === null && (
        <p className="p-6 text-center text-sm text-slate-400">불러오는 중…</p>
      )}
      {items && items.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-slate-100">
          <p className="text-slate-500">아직 저장한 정산이 없어요.</p>
          <Link href="/" className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:underline">
            정산 계산하러 가기 →
          </Link>
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/history/${it.id}`}
                className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:ring-indigo-200"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{it.title || "제목 없음"}</span>
                  <span className="text-xs text-slate-400">{formatDate(it.createdAt)}</span>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {it.peopleCount}명 · 총 {won(it.total)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
