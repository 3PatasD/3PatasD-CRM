import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
      include: {
        _count: {
          select: { productos: true },
        },
      },
    });

    return NextResponse.json(categorias);
  } catch (error) {
    console.error("GET /api/categorias error:", error);
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.nombre || typeof body.nombre !== "string" || !body.nombre.trim()) {
      return NextResponse.json({ error: "El campo nombre es obligatorio" }, { status: 400 });
    }

    const categoria = await prisma.categoria.create({
      data: {
        nombre: body.nombre.trim(),
      },
    });

    return NextResponse.json(categoria, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/categorias error:", error);
    // Unique constraint on nombre
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 });
  }
}
