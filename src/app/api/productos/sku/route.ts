import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/productos/sku?nombre=xxx  → { sku: "MAR-001" }
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const nombre = req.nextUrl.searchParams.get("nombre") ?? "";

  const prefix = nombre
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");

  const existing = await prisma.producto.findMany({
    where: { sku: { startsWith: `${prefix}-` } },
    select: { sku: true },
  });

  const numbers = existing
    .map((p) => parseInt(p.sku.split("-")[1] ?? "0", 10))
    .filter((n) => !isNaN(n));

  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  const sku = `${prefix}-${String(next).padStart(3, "0")}`;

  return NextResponse.json({ sku });
}
