"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, FileDown, CheckCircle, XCircle } from "lucide-react";
import { formatDate, formatEuro, toDecimal } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LineaAlbaran { id: string; descripcion: string; cantidad: number; precioUnitario: number; iva: number; subtotal: number; }
interface Albaran { id: string; numero: string; lineas: LineaAlbaran[]; }
interface Factura {
  id: string; numero: string; estado: string; fechaEmision: string; fechaVencimiento: string | null;
  metodoPago: string | null; notasCliente: string | null;
  subtotal: number; totalIva: number; total: number;
  cliente: { id: string; nombre: string; cifNif: string | null; direccion: string | null; ciudad: string | null };
  albaranes: Albaran[];
}

const ESTADO_COLORS: Record<string, string> = {
  EMITIDA: "bg-blue-100 text-blue-700", PAGADA: "bg-green-100 text-green-700",
  VENCIDA: "bg-red-100 text-red-700", ANULADA: "bg-gray-100 text-gray-700",
};

export default function FacturaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/facturas/${id}`);
      const d = await res.json();
      if (!res.ok) { router.push("/facturas"); return; }
      setData(d);
    } finally { setLoading(false); }
  }

  async function cambiarEstado(estado: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/facturas/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: `Estado: ${estado}` });
      fetchData();
    } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" }); }
    finally { setActing(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  const allLineas = data.albaranes.flatMap((a) => a.lineas);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/facturas"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{data.numero}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[data.estado] ?? ""}`}>{data.estado}</span>
            </div>
            <p className="text-muted-foreground text-sm">{data.cliente.nombre} · {formatDate(data.fechaEmision)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/api/facturas/${id}/pdf`} target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-1" />PDF</Button></a>
          {data.estado === "EMITIDA" && (
            <Button size="sm" onClick={() => cambiarEstado("PAGADA")} disabled={acting}>
              <CheckCircle className="h-4 w-4 mr-1" />Marcar pagada
            </Button>
          )}
          {(data.estado === "EMITIDA" || data.estado === "VENCIDA") && (
            <Button size="sm" variant="outline" onClick={() => cambiarEstado("ANULADA")} disabled={acting}>
              <XCircle className="h-4 w-4 mr-1" />Anular
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="font-medium">{data.cliente.nombre}</div>
            {data.cliente.cifNif && <div className="text-muted-foreground">{data.cliente.cifNif}</div>}
            {data.cliente.ciudad && <div className="text-muted-foreground">{data.cliente.direccion}, {data.cliente.ciudad}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Detalles</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Fecha emisión</span><span>{formatDate(data.fechaEmision)}</span></div>
            {data.fechaVencimiento && <div className="flex justify-between"><span className="text-muted-foreground">Vencimiento</span><span>{formatDate(data.fechaVencimiento)}</span></div>}
            {data.metodoPago && <div className="flex justify-between"><span className="text-muted-foreground">Método de pago</span><span>{data.metodoPago}</span></div>}
            <div className="text-xs text-muted-foreground mt-2">Albaranes: {data.albaranes.map((a) => a.numero).join(", ")}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Conceptos facturados</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-muted/30 border-y"><tr>
              <th className="text-left px-4 py-2">Descripción</th>
              <th className="text-right px-4 py-2">Cant.</th>
              <th className="text-right px-4 py-2">P.Unit.</th>
              <th className="text-right px-4 py-2">IVA%</th>
              <th className="text-right px-4 py-2">Subtotal</th>
            </tr></thead>
            <tbody className="divide-y">
              {allLineas.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.descripcion}</td>
                  <td className="px-4 py-2 text-right">{toDecimal(l.cantidad)}</td>
                  <td className="px-4 py-2 text-right">{formatEuro(l.precioUnitario)}</td>
                  <td className="px-4 py-2 text-right">{toDecimal(l.iva)}%</td>
                  <td className="px-4 py-2 text-right font-medium">{formatEuro(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <div className="w-72 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatEuro(data.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>{formatEuro(data.totalIva)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatEuro(data.total)}</span></div>
        </div>
      </div>
    </div>
  );
}
