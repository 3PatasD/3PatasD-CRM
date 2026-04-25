import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { toDecimal } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Ventas mes actual e anterior
    const [facturasMes, facturasAnterior, comprasMes, gastosMes] = await Promise.all([
      prisma.factura.aggregate({
        _sum: { total: true },
        where: { fechaEmision: { gte: startOfMonth }, estado: { not: "ANULADA" } },
      }),
      prisma.factura.aggregate({
        _sum: { total: true },
        where: {
          fechaEmision: { gte: startOfLastMonth, lte: endOfLastMonth },
          estado: { not: "ANULADA" },
        },
      }),
      prisma.compra.aggregate({
        _sum: { total: true },
        where: { fechaEmision: { gte: startOfMonth }, estado: { not: "CANCELADA" } },
      }),
      prisma.gasto.aggregate({
        _sum: { importeTotal: true },
        where: { fecha: { gte: startOfMonth }, estado: { not: "CANCELADO" } },
      }),
    ]);

    const ventasMesActual = toDecimal(facturasMes._sum.total);
    const ventasMesAnterior = toDecimal(facturasAnterior._sum.total);
    const tendenciaVentas =
      ventasMesAnterior > 0
        ? Math.round(((ventasMesActual - ventasMesAnterior) / ventasMesAnterior) * 100)
        : 0;
    const gastosMesActual = toDecimal(comprasMes._sum.total) + toDecimal(gastosMes._sum.importeTotal);
    const beneficioNeto = ventasMesActual - gastosMesActual;

    // Pedidos pendientes
    const pedidosPendientes = await prisma.pedido.count({
      where: { estado: { in: ["PENDIENTE", "EN_PROCESO"] } },
    });

    // Facturas pendientes de pago
    const facturasPendientesPago = await prisma.factura.count({
      where: { estado: { in: ["EMITIDA", "VENCIDA"] } },
    });

    // Productos con stock bajo
    const productosStockBajo = await prisma.$queryRaw<
      { id: string; nombre: string; sku: string; stockActual: number; stockMinimo: number }[]
    >`
      SELECT id, nombre, sku, "stockActual"::float, "stockMinimo"::float
      FROM "Producto"
      WHERE activo = true AND "stockActual" <= "stockMinimo"
      ORDER BY ("stockActual" - "stockMinimo") ASC
      LIMIT 10
    `;

    // Top 5 clientes
    const topClientes = await prisma.factura.groupBy({
      by: ["clienteId"],
      _sum: { total: true },
      where: { estado: { not: "ANULADA" } },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    });

    const topClientesWithNames = await Promise.all(
      topClientes.map(async (t) => {
        const cliente = await prisma.cliente.findUnique({
          where: { id: t.clienteId },
          select: { nombre: true },
        });
        return {
          clienteId: t.clienteId,
          nombre: cliente?.nombre ?? "—",
          totalFacturado: toDecimal(t._sum.total),
        };
      })
    );

    // Ingresos vs Gastos últimos 12 meses
    const ingresosVsGastos: { mes: string; ingresos: number; gastos: number; neto: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [ing, comprasGas, gastosGas] = await Promise.all([
        prisma.factura.aggregate({
          _sum: { total: true },
          where: { fechaEmision: { gte: start, lte: end }, estado: { not: "ANULADA" } },
        }),
        prisma.compra.aggregate({
          _sum: { total: true },
          where: { fechaEmision: { gte: start, lte: end }, estado: { not: "CANCELADA" } },
        }),
        prisma.gasto.aggregate({
          _sum: { importeTotal: true },
          where: { fecha: { gte: start, lte: end }, estado: { not: "CANCELADO" } },
        }),
      ]);

      const ingresos = toDecimal(ing._sum.total);
      const gastos = toDecimal(comprasGas._sum.total) + toDecimal(gastosGas._sum.importeTotal);
      ingresosVsGastos.push({
        mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        ingresos,
        gastos,
        neto: ingresos - gastos,
      });
    }

    return NextResponse.json({
      ventasMesActual,
      ventasMesAnterior,
      tendenciaVentas,
      gastosMesActual,
      beneficioNeto,
      pedidosPendientes,
      facturasPendientesPago,
      productosStockBajo,
      topClientes: topClientesWithNames,
      ingresosVsGastos,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Error al obtener datos del dashboard" }, { status: 500 });
  }
}
