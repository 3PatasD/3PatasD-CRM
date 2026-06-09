import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { PDFAlbaran } from "@/components/pdf/PDFAlbaran";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const [albaran, empresa] = await Promise.all([
      prisma.albaran.findUnique({
        where: { id },
        include: {
          pedido: { include: { cliente: true } },
          lineas: { orderBy: { orden: "asc" } },
        },
      }),
      prisma.configuracionEmpresa.findFirst(),
    ]);

    if (!albaran) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const element = React.createElement(PDFAlbaran, { albaran, empresa }) as unknown as React.ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${albaran.numero}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF albaran error:", error);
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
  }
}
