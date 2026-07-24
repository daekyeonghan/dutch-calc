import { ImageResponse } from "next/og";
import { getPublicSettlement } from "@/lib/publicSettlement";
import { won, formatDateTime } from "@/lib/format";

export const alt = "더치페이 정산 결과";
// 카카오톡 피드 이미지는 가로 2:1 프레임에 맞춰 표시된다(세로로 길면 위·좌우가 잘림).
// 그래서 2:1 고정 + 좌우 2단 레이아웃으로 잘림 없이 전체가 보이게 한다.
export const size = { width: 1200, height: 600 };
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

  // 2:1 고정 프레임(오른쪽 카드 높이)에 "외 N명"까지 안 잘리고 담기도록 제한.
  const TX_MAX = 5;
  const PPL_MAX = 5;
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
          padding: "44px 52px",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 28,
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 700, color: "#1e293b" }}>더치페이 정산 결과</div>
          <div style={{ fontSize: 22, color: "#94a3b8" }}>{when}</div>
        </div>

        {/* 본문 2단: 왼쪽=송금 결과, 오른쪽=합계+사람별 */}
        <div style={{ display: "flex", flex: 1, gap: 28 }}>
          {/* 왼쪽: 송금 결과 (강조) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexBasis: 0,
              flexGrow: 47,
              padding: "28px 30px",
              backgroundColor: "#eef2ff",
              borderRadius: 24,
              gap: 14,
            }}
          >
            <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "#6366f1" }}>
              정산 결과
            </div>
            {txLines.map((line, i) => (
              <div key={i} style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
                {line}
              </div>
            ))}
            {txMore > 0 && (
              <div style={{ display: "flex", fontSize: 20, color: "#6366f1" }}>외 {txMore}건</div>
            )}
          </div>

          {/* 오른쪽: 합계 + 사람별 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexBasis: 0,
              flexGrow: 53,
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              backgroundColor: "#ffffff",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "14px 22px",
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
                padding: "14px 22px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <span style={{ fontSize: 22, color: "#64748b" }}>1인당</span>
              <span style={{ fontSize: 22, color: "#334155" }}>{won(Math.round(perPerson))}</span>
            </div>
            {personLines.map((p, i) => (
              <div
                key={i}
                style={{ display: "flex", justifyContent: "space-between", padding: "10px 22px" }}
              >
                <span style={{ fontSize: 21, fontWeight: 700, color: "#334155" }}>{p.name}</span>
                <span style={{ display: "flex", fontSize: 19, color: "#64748b" }}>
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
              <div style={{ display: "flex", padding: "10px 22px", fontSize: 19, color: "#94a3b8" }}>
                외 {pplMore}명
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
