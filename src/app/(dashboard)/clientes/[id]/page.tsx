"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Pencil, Save, X } from "lucide-react";
import { formatDate, formatEuro } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Presupuesto { id: string; numero: string; estado: string; total: number; fechaEmision: string }
interface Factura { id: string; numero: string; estado: string; total: number; fechaEmision: string }
interface Cliente {
  id: string; nombre: string; cifNif: string | null; email: string | null;
  telefono: string | null; movil: string | null; direccion: string | null;
  ciudad: string | null; codigoPostal: string | null; pais: string; notas: string | null;
  activo: boolean; createdAt: string;
  presupuestos: Presupuesto[]; facturas: Factura[];
}

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-700", ENVIADO: "bg-blue-100 text-blue-700",
  ACEPTADO: "bg-green-100 text-green-700", RECHAZADO: "bg-red-100 text-red-700",
  CADUCADO: "bg-orange-100 text-orange-700", EMITIDA: "bg-blue-100 text-blue-700",
  PAGADA: "bg-green-100 text-green-700", VENCIDA: "bg-red-100 text-red-700",
  ANULADA: "bg-gray-100 text-gray-700",
};

export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Cliente>>({});

  useEffect(() => { fetchCliente(); }, [id]);

  async function fetchCliente() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes/${id}`);
      const data = await res.json();
      if (!res.ok) { router.push("/clientes"); return; }
      setCliente(data);
      setForm(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Cliente actualizado" });
      setEditing(false);
      fetchCliente();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!cliente) return null;

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const F = (field: keyof Cliente) => editing
    ? <Input value={(form[field] as string) ?? ""} onChange={(e) => set(field, e.target.value)} className="h-8" />
    : <span className="text-sm">{(cliente[field] as string) ?? "—"}</span>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clientes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
            <p className="text-muted-foreground text-sm">Alta: {formatDate(cliente.createdAt)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(cliente); }}><X className="h-4 w-4 mr-1" />Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Guardar</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos fiscales</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[["Nombre / Razón social", "nombre"], ["CIF / NIF", "cifNif"], ["Email", "email"], ["Teléfono", "telefono"], ["Móvil", "movil"]].map(([label, field]) => (
              <div key={field} className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                {F(field as keyof Cliente)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dirección</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[["Dirección", "direccion"], ["Ciudad", "ciudad"], ["Código postal", "codigoPostal"], ["País", "pais"]].map(([label, field]) => (
              <div key={field} className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                {F(field as keyof Cliente)}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Presupuestos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Presupuestos ({cliente.presupuestos.length})</CardTitle>
          <Link href={`/presupuestos/nuevo?clienteId=${id}`}><Button size="sm" variant="outline">Nuevo presupuesto</Button></Link>
        </CardHeader>
        <CardContent className="p-0">
          {cliente.presupuestos.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-4">Sin presupuestos</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-y"><tr>
                <th className="text-left px-4 py-2 font-medium">Número</th>
                <th className="text-left px-4 py-2 font-medium">Estado</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
                <th className="text-left px-4 py-2 font-medium">Fecha</th>
              </tr></thead>
              <tbody className="divide-y">
                {cliente.presupuestos.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => window.location.href = `/presupuestos/${p.id}`}>
                    <td className="px-4 py-2 font-mono text-xs">{p.numero}</td>
                    <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[p.estado] ?? ""}`}>{p.estado}</span></td>
                    <td className="px-4 py-2 text-right font-medium">{formatEuro(p.total)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(p.fechaEmision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Facturas */}
      <Card>
        <CardHeader><CardTitle className="text-base">Facturas ({cliente.facturas.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {cliente.facturas.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-4">Sin facturas</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-y"><tr>
                <th className="text-left px-4 py-2 font-medium">Número</th>
                <th className="text-left px-4 py-2 font-medium">Estado</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
                <th className="text-left px-4 py-2 font-medium">Fecha</th>
              </tr></thead>
              <tbody className="divide-y">
                {cliente.facturas.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => window.location.href = `/facturas/${f.id}`}>
                    <td className="px-4 py-2 font-mono text-xs">{f.numero}</td>
                    <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[f.estado] ?? ""}`}>{f.estado}</span></td>
                    <td className="px-4 py-2 text-right font-medium">{formatEuro(f.total)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(f.fechaEmision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
