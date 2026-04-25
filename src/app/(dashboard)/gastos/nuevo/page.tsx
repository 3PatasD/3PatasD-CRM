"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Proveedor { id: string; nombre: string; cifNif: string | null }

const CATEGORIAS = [
  ["SOFTWARE", "Software"], ["HARDWARE", "Hardware"], ["SERVICIOS", "Servicios"],
  ["ALQUILER", "Alquiler"], ["SUMINISTROS", "Suministros"], ["MARKETING", "Marketing"],
  ["FORMACION", "Formación"], ["TRANSPORTE", "Transporte"], ["IMPUESTOS", "Impuestos"], ["OTROS", "Otros"],
];

export default function NuevoGastoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [tipo, setTipo] = useState("COMPRA_PUNTUAL");
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [importe, setImporte] = useState("");
  const [iva, setIva] = useState("21");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [estado, setEstado] = useState("PENDIENTE");
  const [metodoPago, setMetodoPago] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [notas, setNotas] = useState("");
  const [esRecurrente, setEsRecurrente] = useState(false);
  const [periodicidad, setPeriodicidad] = useState("MENSUAL");
  const [proximaRenovacion, setProximaRenovacion] = useState("");

  useEffect(() => {
    fetch("/api/proveedores").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setProveedores(data);
    });
  }, []);

  // Auto-enable recurrente for suscripcion tipo
  useEffect(() => {
    if (tipo === "SUSCRIPCION") setEsRecurrente(true);
    else if (tipo === "COMPRA_PUNTUAL") setEsRecurrente(false);
  }, [tipo]);

  const importeNum = parseFloat(importe) || 0;
  const ivaNum = parseFloat(iva) || 0;
  const importeTotal = importeNum * (1 + ivaNum / 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo, concepto, categoria: categoria || null,
          proveedorNombre: proveedorNombre || null,
          importe: importeNum, iva: ivaNum,
          fecha, fechaVencimiento: fechaVencimiento || null,
          estado, metodoPago: metodoPago || null,
          numeroFactura: numeroFactura || null,
          notas: notas || null,
          esRecurrente,
          periodicidad: esRecurrente ? periodicidad : null,
          proximaRenovacion: (esRecurrente && proximaRenovacion) ? proximaRenovacion : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Gasto registrado" });
      router.push(`/gastos/${data.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/gastos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Nuevo gasto</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Tipo de gasto</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["COMPRA_PUNTUAL", "Compra puntual", "Una compra o gasto único"],
                ["SUSCRIPCION", "Suscripción", "Servicio recurrente (mensual, anual...)"],
                ["FACTURA_PROVEEDOR", "Factura proveedor", "Factura de un proveedor registrado"],
              ].map(([val, label, desc]) => (
                <button
                  key={val} type="button"
                  onClick={() => setTipo(val)}
                  className={`p-3 rounded-lg border text-left transition-colors ${tipo === val ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"}`}
                >
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Detalles</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Concepto *</Label>
              <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: Suscripción Adobe Creative Cloud" required />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Sin categoría</option>
                {CATEGORIAS.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <Input
                list="proveedores-list"
                value={proveedorNombre}
                onChange={(e) => setProveedorNombre(e.target.value)}
                placeholder="Nombre del proveedor..."
              />
              <datalist id="proveedores-list">
                {proveedores.map((p) => <option key={p.id} value={p.nombre} />)}
              </datalist>
            </div>
            {tipo === "FACTURA_PROVEEDOR" && (
              <div className="space-y-1.5">
                <Label>Nº Factura proveedor</Label>
                <Input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} placeholder="FAC-2026-001" className="font-mono" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Importes y fechas</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Importe sin IVA (€) *</Label>
              <Input type="number" step="0.01" min="0" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-1.5">
              <Label>IVA (%)</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={iva} onChange={(e) => setIva(e.target.value)}>
                {["0", "4", "10", "21"].map((v) => <option key={v} value={v}>{v}%</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Total con IVA</Label>
              <div className="flex h-9 items-center px-3 rounded-md border bg-muted/30 text-sm font-medium">{importeTotal.toFixed(2)} €</div>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha del gasto</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de vencimiento</Label>
              <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PAGADO">Pagado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            {estado === "PAGADO" && (
              <div className="space-y-1.5">
                <Label>Método de pago</Label>
                <Input value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} placeholder="Transferencia, tarjeta, efectivo..." />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recurrente */}
        {(tipo === "SUSCRIPCION" || esRecurrente) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Recurrencia</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox" id="recurrente"
                  checked={esRecurrente}
                  onChange={(e) => setEsRecurrente(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="recurrente" className="text-sm">Es un gasto recurrente</label>
              </div>
              {esRecurrente && (
                <>
                  <div className="space-y-1.5">
                    <Label>Periodicidad</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={periodicidad} onChange={(e) => setPeriodicidad(e.target.value)}>
                      <option value="MENSUAL">Mensual</option>
                      <option value="TRIMESTRAL">Trimestral</option>
                      <option value="SEMESTRAL">Semestral</option>
                      <option value="ANUAL">Anual</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Próxima renovación</Label>
                    <Input type="date" value={proximaRenovacion} onChange={(e) => setProximaRenovacion(e.target.value)} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y"
              value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas adicionales..."
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/gastos"><Button variant="outline" type="button">Cancelar</Button></Link>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : "Registrar gasto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
