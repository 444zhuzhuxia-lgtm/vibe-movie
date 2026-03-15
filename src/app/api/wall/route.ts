import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidDateParam(value: string | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildDateRange(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const queryDate = req.nextUrl.searchParams.get("date");
    const selectedDate = isValidDateParam(queryDate) ? queryDate : formatDateKey(new Date());
    const { start, end } = buildDateRange(selectedDate);

    const publicRecords = await prisma.record.findMany({
      where: {
        isPublic: true,
        AND: [{ userMemo: { not: null } }, { userMemo: { not: "" } }],
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        id: true,
        createdAt: true,
        initialMood: true,
        moodCategory: true,
        movieTitle: true,
        healingMessage: true,
        userMemo: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ date: selectedDate, records: publicRecords });
  } catch (error) {
    console.error("Failed to fetch wall records:", error);
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}
