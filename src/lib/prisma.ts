import { PrismaClient } from "@prisma/client";
import { createMemoryPrismaClient } from "@/lib/memory-db";

const globalForPrisma = globalThis as unknown as {
  prismaClient: PrismaClient | undefined;
};

const dbUrl = process.env.DATABASE_URL ?? "";
const isVercelWithoutRemoteDb =
  process.env.VERCEL === "1" &&
  (!dbUrl || dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1"));

function getRealPrisma(): PrismaClient | null {
  if (isVercelWithoutRemoteDb || !dbUrl) {
    return null;
  }
  if (!globalForPrisma.prismaClient) {
    globalForPrisma.prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prismaClient;
}

const memClient = createMemoryPrismaClient();

function wrapModelWithFallback<T extends Record<string, any>>(
  modelName: keyof typeof memClient
): T {
  const fallbackModel = memClient[modelName] as Record<string, any>;
  return new Proxy({} as T, {
    get(_target, prop: string) {
      return async (...args: any[]) => {
        const real = getRealPrisma() as any;
        if (!real || !real[modelName] || typeof real[modelName][prop] !== "function") {
          return fallbackModel[prop](...args);
        }
        try {
          return await real[modelName][prop](...args);
        } catch (err: any) {
          const msg = String(err?.message ?? "");
          if (
            err?.name === "PrismaClientInitializationError" ||
            err?.code === "P1001" ||
            msg.includes("Can't reach database server") ||
            msg.includes("Environment variable not found: DATABASE_URL")
          ) {
            return fallbackModel[prop](...args);
          }
          throw err;
        }
      };
    },
  });
}

export const prisma = {
  user: wrapModelWithFallback<PrismaClient["user"]>("user"),
  student: wrapModelWithFallback<PrismaClient["student"]>("student"),
  attendanceRecord:
    wrapModelWithFallback<PrismaClient["attendanceRecord"]>("attendanceRecord"),
  remedialRecord:
    wrapModelWithFallback<PrismaClient["remedialRecord"]>("remedialRecord"),
  $transaction: async <T>(promises: Promise<T>[]): Promise<T[]> => {
    return Promise.all(promises);
  },
} as unknown as PrismaClient;
