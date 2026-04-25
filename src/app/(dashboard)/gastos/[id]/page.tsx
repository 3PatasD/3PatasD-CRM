"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Pencil, Save, X, Trash2, CheckCircle } from "lucide-react";
import { formatDate, formatEuro } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface Gasto {
  id: string; tipo: string; concepto: string; categoria: string | null;
  proveedorId: string | null; proveedorNombre: string | null;
  proveedor: { id: string; nombre: string; cifNif: string | null; email: string | null } | null;
  importe: number; iva: number; importeTotal: number;
  fecha: string; fechaVencimiento: string | null; estado: string;
  metodoPago: string | null; numeroFactura: string | null; notas: string | null;
  esRecurrente: boolean; periodicidad: string | null; proximaRenovacion: string | null;
  usuario: { nombre: string };
  createdAt: string;
}

type GastoForm = Omit<Partial<Gasto>, "importe" | "iva"> & { importe?: string; iva?: string };

const TIPO_LABELS: Record<string, string> = {
  SUSCRIPCION: "Suscripción", COMPRA_PUNTUAL: "Compra puntual", FACTURA_PROVEEDOR: "Factura proveedor",
};
const TIPO_COLORS: Record<string, string> = {
  SUSCRIPCION: "bg-purple-100 text-purple-700",
  COMPRA_PUNTUAL: "bg-blue-100 text-blue-700",
  FACTURA_PROVEEDOR: "bg-orange-100 text-orange-700",
};
const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700",
  PAGADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-700",
};
const CAT_LABELS: Record<string, string> = {
  SOFTWARE: "Software", HARDWARE: "Hardware", SERVICIOS: "Servicios",
  ALQUILER: "Alquiler", SUMINISTROS: "Suministros", MARKETING: "Marketing",
  FORMACION: "Formación", TRANSPORTE: "Transporte", IMPUESTOS: "Impuestos", OTROS: "Otros",
};
const CATEGORIAS = Object.entries(CAT_LABELS);

export default function GastoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<Gasto | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<GastoForm>({});

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    const res = await fetch(`/api/gastos/${id}`);
    if (!res.ok) { router.push("/gastos"); return; }
    const d = await res.json();
    setData(d);
    setForm({ ...d, importe: String(d.importe), iva: String(d.iva) });
    setLoading(false);
  }

  async function marcarPagado() {
    const res = await fetch(`/api/gastos/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "PAGADO" }),
    });
    if (res.ok) { toast({ title: "Marcado como pagado" }); fetchData(); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/gastos/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          importe: parseFloat(form.importe ?? "0"),
          iva: parseFloat(form.iva ?? "0"),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Gasto actualizado" });
      setEditing(false);
      fetchData();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/gastos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Gasto eliminado" });
      router.push("/gastos");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setDeleting(false); setDeleteOpen(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  const set = (f: string, v: string | boolean) => setForm((p) => ({ ...p, [f]: v }));
  const importeNum = parseFloat(form.importe ?? "0") || 0;
  const ivaNum = parseFloat(form.iva ?? "0") || 0;
  const importeTotalCalc = importeNum * (1 + ivaNum / 100);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/gastos"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold">{data.concepto}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLORS[data.tipo] ?? ""}`}>{TIPO_LABELS[data.tipo] ?? data.tipo}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[data.estado] ?? ""}`}>{data.estado}</span>
            </div>
            <p className="text-muted-foreground text-sm">{formatDate(data.fecha)} · {data.usuario.nombre}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {data.estado === "PENDIENTE" && !editing && (
            <Button size="sm" onClick={marcarPagado}><CheckCircle className="h-4 w-4 mr-1" />Marcar pagado</Button>
          )}
          {!editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-1" />Eliminar</Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm({ ...data, importe: String(data.importe), iva: String(data.iva) }); }}><X className="h-4 w-4 mr-1" />Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Guardar</Button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="¿Eliminar gasto?" description={`Vas a eliminar "${data.concepto}". Esta acción no se puede deshacer.`} onConfirm={handleDelete} loading={deleting} confirmLabel="Eliminar" variant="destructive" requireText="eliminar" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Información general</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Concepto</Label>
              {editing ? <Input value={form.concepto ?? ""} onChange={(e) => set("concepto", e.target.value)} className="h-8" /> : <span>{data.concepto}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              {editing ? (
                <select className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={form.categoria ?? ""} onChange={(e) => set("categoria", e.target.value)}>
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                </select>
              ) : <span>{data.categoria ? (CAT_LABELS[data.categoria] ?? data.categoria) : "—"}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Proveedor</Label>
              {editing ? <Input value={form.proveedorNombre ?? ""} onChange={(e) => set("proveedorNombre", e.target.value)} className="h-8" placeholder="Nombre del proveedor" /> : (
                <span>
                  {data.proveedor ? (
                    <Link href={`/proveedores/${data.proveedor.id}`} className="text-primary hover:underline">{data.proveedor.nombre}</Link>
                  ) : data.proveedorNombre ?? "—"}
                </span>
              )}
            </div>
            {(data.numeroFactura || editing) && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Nº Factura proveedor</Label>
                {editing ? <Input value={form.numeroFactura ?? ""} onChange={(e) => set("numeroFactura", e.target.value)} className="h-8 font-mono" /> : <span className="font-mono">{data.numeroFactura}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Importes y pago</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Importe sin IVA</Label>
              {editing ? <Input type="number" step="0.01" value={form.importe ?? ""} onChange={(e) => set("importe", e.target.value)} className="h-8" /> : <span className="font-medium">{formatEuro(data.importe)}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">IVA</Label>
              {editing ? (
                <select className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={form.iva ?? "21"} onChange={(e) => set("iva", e.target.value)}>
                  {["0","4","10","21"].map((v) => <option key={v} value={v}>{v}%</option>)}
                </select>
              ) : <span>{Number(data.iva)}%</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Total con IVA</Label>
              <span className="font-bold text-base">{editing ? formatEuro(importeTotalCalc) : formatEuro(data.importeTotal)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              {editing ? (
                <select className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={form.estado ?? "PENDIENTE"} onChange={(e) => set("estado", e.target.value)}>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="PAGADO">Pagado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              ) : <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${ESTADO_COLORS[data.estado] ?? ""}`}>{data.estado}</span>}
            </div>
            {(data.metodoPago || editing) && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Método de pago</Label>
                {editing ? <Input value={form.metodoPago ?? ""} onChange={(e) => set("metodoPago", e.target.value)} className="h-8" placeholder="Transferencia, tarjeta..." /> : <span>{data.metodoPago}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Fechas</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Fecha del gasto</Label>
              {editing ? <Input type="date" value={form.fecha?.slice(0, 10) ?? ""} onChange={(e) => set("fecha", e.target.value)} className="h-8" /> : <span>{formatDate(data.fecha)}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Fecha de vencimiento</Label>
              {editing ? <Input type="date" value={form.fechaVencimiento?.slice(0, 10) ?? ""} onChange={(e) => set("fechaVencimiento", e.target.value)} className="h-8" /> : <span>{data.fechaVencimiento ? formatDate(data.fechaVencimiento) : "—"}</span>}
            </div>
            {data.esRecurrente && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Próxima renovación</Label>
                {editing ? <Input type="date" value={form.proximaRenovacion?.slice(0, 10) ?? ""} onChange={(e) => set("proximaRenovacion", e.target.value)} className="h-8" /> : <span>{data.proximaRenovacion ? formatDate(data.proximaRenovacion) : "—"}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        {data.esRecurrente && (
          <Card>
            <CardHeader><CardTitle className="text-base">Recurrencia</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Periodicidad</span><span>{data.periodicidad}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Próxima renovación</span><span>{data.proximaRenovacion ? formatDate(data.proximaRenovacion) : "—"}</span></div>
            </CardContent>
          </Card>
        )}
      </div>

      {(data.notas || editing) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <textarea className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y" value={form.notas ?? ""} onChange={(e) => set("notas", e.target.value)} />
            ) : <p className="text-sm">{data.notas}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
