"use client";
import { useEffect, useState } from "react";
import { Euro, ShoppingCart, Receipt, Package } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { TopClientesTable } from "@/components/dashboard/TopClientesTable";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { formatEuro } from "@/lib/utils";

interface DashboardData {
  ventasMesActual: number;
  ventasMesAnterior: number;
  tendenciaVentas: number;
  pedidosPendientes: number;
  facturasPendientesPago: number;
  productosStockBajo: { id: string; nombre: string; sku: string; stockActual: number; stockMinimo: number }[];
  topClientes: { clienteId: string; nombre: string; totalFacturado: number }[];
  ingresosVsGastos: { mes: string; ingresos: number; gastos: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Resumen del negocio</p>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 h-80 rounded-lg border bg-card animate-pulse" />
          <div className="h-80 rounded-lg border bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Resumen del negocio</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Ventas este mes"
          value={formatEuro(data.ventasMesActual)}
          icon={Euro}
          tendencia={data.tendenciaVentas}
          colorClass="text-blue-600"
        />
        <KPICard
          title="Pedidos pendientes"
          value={String(data.pedidosPendientes)}
          icon={ShoppingCart}
          descripcion="En estado Pendiente o En proceso"
          colorClass="text-orange-600"
        />
        <KPICard
          title="Facturas por cobrar"
          value={String(data.facturasPendientesPago)}
          icon={Receipt}
          descripcion="Emitidas o vencidas sin pagar"
          colorClass="text-green-600"
        />
        <KPICard
          title="Productos stock bajo"
          value={String(data.productosStockBajo.length)}
          icon={Package}
          descripcion="Por debajo del mínimo configurado"
          colorClass="text-amber-600"
        />
      </div>

      {/* Chart + Top clientes */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <SalesChart data={data.ingresosVsGastos} />
        <TopClientesTable data={data.topClientes} />
      </div>

      {/* Low stock */}
      {data.productosStockBajo.length > 0 && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <LowStockAlert data={data.productosStockBajo} />
        </div>
      )}
    </div>
  );
}
