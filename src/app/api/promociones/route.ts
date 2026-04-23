import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const codigoBusqueda = searchParams.get("codigo");

    // Validate and return single promo code (used by DocumentoForm)
    if (codigoBusqueda) {
      const now = new Date();
      const promo = await prisma.codigoPromocion.findFirst({
        where: {
          codigo: codigoBusqueda.trim().toUpperCase(),
          activo: true,
          OR: [{ fechaInicio: null }, { fechaInicio: { lte: now } }],
          AND: [{ OR: [{ fechaFin: null }, { fechaFin: { gte: now } }] }],
        },
      });
      if (!promo) return NextResponse.json(null, { status: 404 });
      if (promo.limiteUsos !== null && promo.usosActuales >= promo.limiteUsos) {
        return NextResponse.json(null, { status: 404 });
      }
      return NextResponse.json({ ...promo, valor: Number(promo.valor) });
    }

    const promociones = await prisma.codigoPromocion.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        tipo: true,
        valor: true,
        fechaInicio: true,
        fechaFin: true,
        limiteUsos: true,
        usosActuales: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(promociones);
  } catch (error) {
    console.error("GET /api/promociones error:", error);
    return NextResponse.json({ error: "Error al obtener promociones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.codigo || typeof body.codigo !== "string" || !body.codigo.trim()) {
      return NextResponse.json({ error: "El código es obligatorio" }, { status: 400 });
    }
    if (!body.tipo || !["PORCENTAJE", "FIJO"].includes(body.tipo)) {
      return NextResponse.json(
        { error: "El tipo debe ser PORCENTAJE o FIJO" },
        { status: 400 }
      );
    }
    if (body.valor === undefined || body.valor === null || isNaN(parseFloat(String(body.valor)))) {
      return NextResponse.json({ error: "El valor es obligatorio y debe ser numérico" }, { status: 400 });
    }

    const valor = parseFloat(String(body.valor));
    if (valor < 0) {
      return NextResponse.json({ error: "El valor no puede ser negativo" }, { status: 400 });
    }
    if (body.tipo === "PORCENTAJE" && valor > 100) {
      return NextResponse.json({ error: "El porcentaje no puede superar 100" }, { status: 400 });
    }

    // Check codigo uniqueness
    const existing = await prisma.codigoPromocion.findUnique({
      where: { codigo: body.codigo.trim().toUpperCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una promoción con ese código" }, { status: 400 });
    }

    const promo = await prisma.codigoPromocion.create({
      data: {
        codigo: body.codigo.trim().toUpperCase(),
        descripcion: body.descripcion ?? null,
        tipo: body.tipo,
        valor,
        fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : null,
        fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
        limiteUsos: body.limiteUsos ? parseInt(String(body.limiteUsos), 10) : null,
        usosActuales: 0,
        activo: body.activo !== undefined ? body.activo : true,
      },
    });

    return NextResponse.json(promo, { status: 201 });
  } catch (error) {
    console.error("POST /api/promociones error:", error);
    return NextResponse.json({ error: "Error al crear promoción" }, { status: 500 });
  }
}
