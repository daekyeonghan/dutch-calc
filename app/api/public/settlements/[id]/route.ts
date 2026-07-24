import { getPublicSettlement } from "@/lib/publicSettlement";

// Next 16: 동적 params는 Promise로 전달되므로 await 해서 꺼낸다.
type Ctx = { params: Promise<{ id: string }> };

// GET /api/public/settlements/[id] — 공개 조회 (clientId 불필요, 안전 필드만).
// 공유 링크를 받은 다른 사람도 결과를 볼 수 있게 하는 용도.
export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const settlement = await getPublicSettlement(id);
  if (!settlement) {
    return Response.json({ error: "정산 기록을 찾을 수 없습니다." }, { status: 404 });
  }
  return Response.json(settlement);
}
