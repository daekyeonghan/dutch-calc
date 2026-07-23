import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

// GET /api/settlements — 내 정산 기록 목록 (X-Client-Id 헤더 기준)
export async function GET(request: Request) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) {
    return Response.json({ error: "X-Client-Id 헤더가 필요합니다." }, { status: 400 });
  }
  const rows = await prisma.settlement.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, total: true, peopleCount: true, createdAt: true },
  });
  return Response.json(rows);
}

// POST /api/settlements — 정산 결과 저장
export async function POST(request: Request) {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) {
    return Response.json({ error: "X-Client-Id 헤더가 필요합니다." }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.peopleCount !== "number" || typeof body.total !== "number" || body.payload == null) {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const created = await prisma.settlement.create({
    data: {
      clientId,
      title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : null,
      peopleCount: body.peopleCount,
      total: body.total,
      payload: body.payload as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return Response.json(created, { status: 201 });
}
