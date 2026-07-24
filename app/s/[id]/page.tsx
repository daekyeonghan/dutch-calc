import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSettlement } from "@/lib/publicSettlement";
import { won, formatDateTime } from "@/lib/format";

// Next 16: 동적 params는 Promise.
type Props = { params: Promise<{ id: string }> };

// 공유 링크 미리보기용 메타데이터. 콜로케이트된 opengraph-image.tsx가 og:image로 자동 연결된다.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const s = await getPublicSettlement(id);
  if (!s) return { title: "더치페이 정산 결과" };
  const headline =
    s.payload.transactions.length === 0
      ? "서로 주고받을 돈이 없어요!"
      : s.payload.transactions.map((t) => `${t.from} → ${t.to} ${won(t.amount)}`).join(", ");
  return {
    title: s.title ? `${s.title} · 정산 결과` : "더치페이 정산 결과",
    description: headline,
    openGraph: { title: "더치페이 계산 결과가 도착했어요.", description: headline },
  };
}

// 공개 결과 보기 — 링크를 아는 사람 누구나 볼 수 있음. 소유자 전용 기능(삭제 등) 없음.
export default async function PublicSettlementPage({ params }: Props) {
  const { id } = await params;
  const s = await getPublicSettlement(id);
  if (!s) notFound();

  const { payload } = s;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">🧮 더치페이 정산 결과</h1>
        <p className="mt-1 text-sm text-slate-400">
          {formatDateTime(payload.calculatedAt ?? s.createdAt)} 정산
        </p>
      </header>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        {s.title && (
          <p className="mb-4 text-center text-lg font-bold text-slate-800">{s.title}</p>
        )}

        <div className="mb-5 rounded-xl bg-indigo-50 p-5 text-center">
          <p className="text-sm font-semibold text-indigo-500">정산 결과</p>
          {payload.transactions.length === 0 ? (
            <p className="mt-2 text-lg font-bold text-slate-800">🎉 서로 주고받을 돈이 없어요!</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {payload.transactions.map((t, i) => (
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
            <span className="font-bold text-slate-800">{won(s.total)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 px-4 py-3 text-sm">
            <span className="text-slate-500">1인당</span>
            <span className="font-semibold text-slate-700">{won(Math.round(payload.perPerson))}</span>
          </div>
          {payload.people.map((p, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-semibold text-slate-700">{p.name}</span>
              <span className="text-slate-500">
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
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="inline-block rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700"
        >
          나도 정산하러 가기 →
        </Link>
      </div>
    </div>
  );
}
