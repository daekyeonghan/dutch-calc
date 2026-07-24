import { ImageResponse } from "next/og";
import { getPublicSettlement } from "@/lib/publicSettlement";
import { won, formatDateTime } from "@/lib/format";

export const alt = "더치페이 정산 결과";
export const size = { width: 800, height: 600 };
export const contentType = "image/png";
export const dynamic = "force-dynamic"; // id마다 실제 결과를 그리도록 캐시 없이 매번 렌더

// 카카오 미리보기(피드) 이미지. Satori 기본 폰트엔 한글 글리프가 없어 한글 폰트를 직접 넣는다.
// Google Fonts의 `text=` 동적 서브셋 woff는 글리프 재매핑이 비표준이라 satori가 일부를 못 읽고
// tofu(□)가 생긴다 → fontsource의 "정적 서브셋" woff(표준 포맷)를 쓴다. 서버 프로세스당 1회만 받도록 캐시.
const FONT_BASE = "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@latest";
type Font = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };
let fontCache: Font[] | null = null;

async function loadFonts(): Promise<Font[]> {
  if (fontCache) return fontCache;
  try {
    const [r400, r700] = await Promise.all([
      fetch(`${FONT_BASE}/korean-400-normal.woff`).then((r) => r.arrayBuffer()),
      fetch(`${FONT_BASE}/korean-700-normal.woff`).then((r) => r.arrayBuffer()),
    ]);
    fontCache = [
      { name: "Noto Sans KR", data: r400, weight: 400, style: "normal" },
      { name: "Noto Sans KR", data: r700, weight: 700, style: "normal" },
    ];
    return fontCache;
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ id: string }> };

export default async function Image({ params }: Props) {
  const { id } = await params;
  const s = await getPublicSettlement(id);

  // 결과가 없으면 일반 카드로 폴백(카카오가 이미지 못 받는 상황 방지).
  const transactions = s?.payload.transactions ?? [];
  const people = s?.payload.people ?? [];
  const total = s?.total ?? 0;
  const perPerson = s?.payload.perPerson ?? 0;
  const when = s ? formatDateTime(s.payload.calculatedAt ?? s.createdAt) : "";

  // 인원이 많아도 이미지가 과하게 길어지지 않도록 표시 개수를 제한하고 나머지는 "외 N건/명"으로.
  const TX_MAX = 4;
  const PPL_MAX = 6;
  const allTxLines =
    transactions.length === 0
      ? ["서로 주고받을 돈이 없어요!"]
      : transactions.map((t) => `${t.from} → ${t.to} ${won(t.amount)}`);
  const txLines = allTxLines.slice(0, TX_MAX);
  const txMore = allTxLines.length - txLines.length;

  const allPersonLines = people.map((p) => ({
    name: p.name,
    paid: `낸돈 ${won(p.paid)}`,
    balance:
      p.balance === 0
        ? "정산 완료"
        : p.balance > 0
          ? `받을 돈 ${won(p.balance)}`
          : `줄 돈 ${won(-p.balance)}`,
    positive: p.balance > 0,
    zero: p.balance === 0,
  }));
  const personLines = allPersonLines.slice(0, PPL_MAX);
  const pplMore = allPersonLines.length - personLines.length;

  // 행 수에 맞춰 이미지 높이를 계산해 내용이 잘리지 않게 한다(고정 높이는 인원 많을 때 잘림).
  // 행 높이는 실제 렌더보다 넉넉히 잡아, 하단이 잘리는 대신 약간의 여백이 남는(안전한) 쪽으로.
  const PAGE_V = 36 * 2;
  const HEADER_H = 56;
  const GAP_TO_PURPLE = 18;
  const GAP_TO_TABLE = 16;
  const purpleH = 20 * 2 + 40 + txLines.length * 56 + (txMore > 0 ? 40 : 0);
  const tableH = 2 + 56 * 2 + personLines.length * 52 + (pplMore > 0 ? 52 : 0);
  const height = PAGE_V + HEADER_H + GAP_TO_PURPLE + purpleH + GAP_TO_TABLE + tableH;

  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
          fontFamily: "Noto Sans KR",
          padding: "36px 48px",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>더치페이 정산 결과</div>
          <div style={{ fontSize: 20, color: "#94a3b8" }}>{when}</div>
        </div>

        {/* 송금 결과 (강조) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 18,
            padding: "20px 28px",
            backgroundColor: "#eef2ff",
            borderRadius: 20,
            gap: 6,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1" }}>정산 결과</div>
          {txLines.map((line, i) => (
            <div key={i} style={{ fontSize: 32, fontWeight: 700, color: "#0f172a" }}>
              {line}
            </div>
          ))}
          {txMore > 0 && (
            <div style={{ display: "flex", fontSize: 20, color: "#6366f1" }}>외 {txMore}건</div>
          )}
        </div>

        {/* 합계 + 사람별 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 16,
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            backgroundColor: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 20px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ fontSize: 22, color: "#64748b" }}>총 지출</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#1e293b" }}>{won(total)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 20px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ fontSize: 22, color: "#64748b" }}>1인당</span>
            <span style={{ fontSize: 22, color: "#334155" }}>{won(Math.round(perPerson))}</span>
          </div>
          {personLines.map((p, i) => (
            <div
              key={i}
              style={{ display: "flex", justifyContent: "space-between", padding: "9px 20px" }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: "#334155" }}>{p.name}</span>
              <span style={{ display: "flex", fontSize: 20, color: "#64748b" }}>
                {p.paid} ·{" "}
                <span
                  style={{
                    marginLeft: 6,
                    color: p.zero ? "#94a3b8" : p.positive ? "#4f46e5" : "#f43f5e",
                  }}
                >
                  {p.balance}
                </span>
              </span>
            </div>
          ))}
          {pplMore > 0 && (
            <div style={{ display: "flex", padding: "9px 20px", fontSize: 20, color: "#94a3b8" }}>
              외 {pplMore}명
            </div>
          )}
        </div>
      </div>
    ),
    { width: size.width, height, fonts }
  );
}
