import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { toDecimal } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const estado = searchParams.get("estado") ?? "";

    const facturas = await prisma.factura.findMany({
      where: {
        ...(estado ? { estado: estado as never } : {}),
        ...(search
          ? {
              OR: [
                { numero: { contains: search, mode: "insensitive" } },
                { cliente: { nombre: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        cliente: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = facturas.map((f) => ({
      ...f,
      subtotal: toDecimal(f.subtotal),
      totalIva: toDecimal(f.totalIva),
      total: toDecimal(f.total),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/facturas error:", error);
    return NextResponse.json({ error: "Error al obtener facturas" }, { status: 500 });
  }
}
