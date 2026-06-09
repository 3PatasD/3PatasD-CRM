import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/setup — creates the first admin user if no users exist yet
export async function POST(req: Request) {
  const count = await prisma.usuario.count();
  if (count > 0) {
    return NextResponse.json(
      { error: "Setup already completed. Users already exist." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const nombre = (body.nombre as string) || "Admin";
  const email = (body.email as string) || "admin@crm.com";
  const password = (body.password as string) || "admin123";

  const hash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: { nombre, email, passwordHash: hash, role: "ADMIN", activo: true },
    select: { id: true, nombre: true, email: true, role: true },
  });

  return NextResponse.json({ ok: true, usuario }, { status: 201 });
}
