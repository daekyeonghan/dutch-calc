// 공개 조회용 헬퍼. 링크(id)를 아는 사람은 누구나 볼 수 있는 안전 필드만 반환한다.
// ⚠️ clientId(소유자 식별자)는 절대 포함하지 않는다 — 공유 링크로 소유자 정보가 새지 않게.
// 나중에 로그인이 붙어도(소유권 clientId→userId) 이 공개 경로는 그대로 유지된다.
import { prisma } from "@/lib/prisma";
import type { SettlementDetail, SettlementPayload } from "@/lib/settlement";

export async function getPublicSettlement(id: string): Promise<SettlementDetail | null> {
  const row = await prisma.settlement.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      total: true,
      peopleCount: true,
      createdAt: true,
      payload: true,
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    total: row.total,
    peopleCount: row.peopleCount,
    createdAt: row.createdAt.toISOString(),
    payload: row.payload as unknown as SettlementPayload,
  };
}
