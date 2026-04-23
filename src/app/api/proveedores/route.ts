import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";

    const proveedores = await prisma.proveedor.findMany({
      where: {
        activo: true,
        ...(search
          ? {
              OR: [
                { nombre: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { cifNif: { contains: search, mode: "insensitive" } },
                { contacto: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: { compras: true },
        },
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(proveedores);
  } catch (error) {
    console.error("GET /api/proveedores error:", error);
    return NextResponse.json({ error: "Error al obtener proveedores" }, { status: 500 });
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

    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: body.nombre.trim(),
        cifNif: body.cifNif ?? null,
        email: body.email ?? null,
        telefono: body.telefono ?? null,
        contacto: body.contacto ?? null,
        direccion: body.direccion ?? null,
        ciudad: body.ciudad ?? null,
        codigoPostal: body.codigoPostal ?? null,
        pais: body.pais ?? "España",
        notas: body.notas ?? null,
        activo: true,
      },
    });

    return NextResponse.json(proveedor, { status: 201 });
  } catch (error) {
    console.error("POST /api/proveedores error:", error);
    return NextResponse.json({ error: "Error al crear proveedor" }, { status: 500 });
  }
}
