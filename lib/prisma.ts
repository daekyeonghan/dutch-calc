import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7은 내장 엔진이 없어서 드라이버 어댑터가 필수. Postgres/Neon은 @prisma/adapter-pg 사용.
// 개발 중 HMR로 PrismaClient가 여러 개 생기는 걸 막기 위한 싱글턴.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
