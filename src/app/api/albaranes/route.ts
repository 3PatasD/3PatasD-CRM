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

    const albaranes = await prisma.albaran.findMany({
      where: {
        ...(estado ? { estado: estado as never } : {}),
        ...(search
          ? {
              OR: [
                { numero: { contains: search, mode: "insensitive" } },
                { pedido: { numero: { contains: search, mode: "insensitive" } } },
                { pedido: { cliente: { nombre: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        pedido: {
          select: {
            id: true,
            numero: true,
            cliente: { select: { id: true, nombre: true } },
          },
        },
        factura: { select: { id: true, numero: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = albaranes.map((a) => ({
      ...a,
      lineas: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/albaranes error:", error);
    return NextResponse.json({ error: "Error al obtener albaranes" }, { status: 500 });
  }
}
