import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { PDFPresupuesto } from "@/components/pdf/PDFPresupuesto";
import type { DocumentProps } from "@react-pdf/renderer";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const [presupuesto, empresa] = await Promise.all([
      prisma.presupuesto.findUnique({
        where: { id },
        include: {
          cliente: true,
          usuario: { select: { nombre: true } },
          lineas: { orderBy: { orden: "asc" } },
          codigoPromo: { select: { codigo: true } },
        },
      }),
      prisma.configuracionEmpresa.findFirst(),
    ]);

    if (!presupuesto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const element = React.createElement(PDFPresupuesto, { presupuesto, empresa }) as unknown as React.ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${presupuesto.numero}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF presupuesto error:", error);
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
  }
}
