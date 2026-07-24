import { ImageResponse } from "next/og";
import { getPublicSettlement } from "@/lib/publicSettlement";
import { won, formatDateTime } from "@/lib/format";

export const alt = "더치페이 정산 결과";
// 카카오톡 피드 권장 사양(2:1, 최대 800px)에 맞춘 800x400.
// 송금 내역·사람별 상세는 넣지 않아 인원수와 무관 → 잘림/넘침이 없다.
// (송금 내역은 공유 메시지 텍스트에, 사람별 상세는 링크 페이지에서 본다.)
export const size = { width: 800, height: 400 };
export const contentType = "image/png";
export const dynamic = "force-dynamic"; // id마다 실제 결과를 그리도록 캐시 없이 매번 렌더

// Satori 기본 폰트엔 한글 글리프가 없어 한글 폰트를 직접 넣는다.
// Google `text=` 동적 서브셋 woff는 비표준이라 satori가 못 읽는다 → fontsource 정적 woff 사용. 프로세스당 1회 캐시.
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

  const total = s?.total ?? 0;
  const perPerson = s?.payload.perPerson ?? 0;
  const peopleCount = s?.peopleCount ?? 0;
  const when = s ? formatDateTime(s.payload.calculatedAt ?? s.createdAt) : "";

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
          padding: "36px 44px",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#1e293b" }}>더치페이 정산 결과</div>
          <div style={{ fontSize: 18, color: "#94a3b8" }}>{when}</div>
        </div>

        {/* 총 지출 · 1인당 (크게) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 18,
            marginTop: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px 32px",
              backgroundColor: "#ffffff",
              borderRadius: 18,
              border: "1px solid #e2e8f0",
            }}
          >
            <span style={{ fontSize: 26, color: "#64748b" }}>총 지출</span>
            <span style={{ fontSize: 40, fontWeight: 700, color: "#1e293b" }}>{won(total)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px 32px",
              backgroundColor: "#eef2ff",
              borderRadius: 18,
            }}
          >
            <span style={{ fontSize: 26, color: "#6366f1" }}>1인당</span>
            <span style={{ fontSize: 40, fontWeight: 700, color: "#4f46e5" }}>
              {won(Math.round(perPerson))}
            </span>
          </div>
        </div>

        {/* 인원 */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
          <span style={{ fontSize: 20, color: "#94a3b8" }}>{peopleCount}명 정산</span>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
