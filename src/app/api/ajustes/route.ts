import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const config = await prisma.configuracionEmpresa.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        nombre: "Mi Empresa S.L.",
        cif: "B00000000",
        direccion: "Calle Principal, 1",
        ciudad: "Madrid",
        codigoPostal: "28001",
        pais: "España",
        ivaDefecto: 21,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("GET /api/ajustes error:", error);
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const config = await prisma.configuracionEmpresa.upsert({
      where: { id: 1 },
      update: {
        nombre: body.nombre !== undefined ? body.nombre : undefined,
        cif: body.cif !== undefined ? body.cif : undefined,
        direccion: body.direccion !== undefined ? body.direccion : undefined,
        ciudad: body.ciudad !== undefined ? body.ciudad : undefined,
        codigoPostal: body.codigoPostal !== undefined ? body.codigoPostal : undefined,
        pais: body.pais !== undefined ? body.pais : undefined,
        telefono: body.telefono !== undefined ? body.telefono : undefined,
        email: body.email !== undefined ? body.email : undefined,
        web: body.web !== undefined ? body.web : undefined,
        logoUrl: body.logoUrl !== undefined ? body.logoUrl : undefined,
        datosBancarios: body.datosBancarios !== undefined ? body.datosBancarios : undefined,
        ivaDefecto: body.ivaDefecto !== undefined ? body.ivaDefecto : undefined,
      },
      create: {
        id: 1,
        nombre: body.nombre ?? "Mi Empresa S.L.",
        cif: body.cif ?? "B00000000",
        direccion: body.direccion ?? "Calle Principal, 1",
        ciudad: body.ciudad ?? "Madrid",
        codigoPostal: body.codigoPostal ?? "28001",
        pais: body.pais ?? "España",
        telefono: body.telefono ?? null,
        email: body.email ?? null,
        web: body.web ?? null,
        logoUrl: body.logoUrl ?? null,
        datosBancarios: body.datosBancarios ?? null,
        ivaDefecto: body.ivaDefecto ?? 21,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("PUT /api/ajustes error:", error);
    return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 });
  }
}
