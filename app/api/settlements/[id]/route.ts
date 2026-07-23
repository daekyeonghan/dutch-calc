import { prisma } from "@/lib/prisma";

// Next 16: 동적 params는 Promise로 전달되므로 await 해서 꺼낸다.
type Ctx = { params: Promise<{ id: string }> };

// GET /api/settlements/[id] — 내 기록 상세 (소유자만)
export async function GET(request: Request, ctx: Ctx) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) {
    return Response.json({ error: "X-Client-Id 헤더가 필요합니다." }, { status: 400 });
  }
  const { id } = await ctx.params;
  const row = await prisma.settlement.findFirst({ where: { id, clientId } });
  if (!row) {
    return Response.json({ error: "정산 기록을 찾을 수 없습니다." }, { status: 404 });
  }
  return Response.json(row);
}

// DELETE /api/settlements/[id] — 내 기록 삭제 (소유자만; deleteMany로 clientId까지 일치해야 지워짐)
export async function DELETE(request: Request, ctx: Ctx) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) {
    return Response.json({ error: "X-Client-Id 헤더가 필요합니다." }, { status: 400 });
  }
  const { id } = await ctx.params;
  const result = await prisma.settlement.deleteMany({ where: { id, clientId } });
  if (result.count === 0) {
    return Response.json({ error: "정산 기록을 찾을 수 없습니다." }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
