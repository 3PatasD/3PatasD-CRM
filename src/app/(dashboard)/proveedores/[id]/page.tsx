"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Pencil, Save, X } from "lucide-react";
import { formatDate, formatEuro } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Compra { id: string; numero: string; estado: string; total: number; fechaEmision: string }
interface Proveedor {
  id: string; nombre: string; cifNif: string | null; email: string | null;
  telefono: string | null; contacto: string | null; direccion: string | null;
  ciudad: string | null; codigoPostal: string | null; pais: string; notas: string | null;
  createdAt: string; compras: Compra[];
}

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-700", RECIBIDA_PARCIAL: "bg-blue-100 text-blue-700",
  RECIBIDA: "bg-green-100 text-green-700", CANCELADA: "bg-red-100 text-red-700",
};

export default function ProveedorDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Proveedor>>({});

  useEffect(() => { fetchProveedor(); }, [id]);

  async function fetchProveedor() {
    setLoading(true);
    try {
      const res = await fetch(`/api/proveedores/${id}`);
      const data = await res.json();
      if (!res.ok) { router.push("/proveedores"); return; }
      setProveedor(data);
      setForm(data);
    } finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/proveedores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Proveedor actualizado" });
      setEditing(false);
      fetchProveedor();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!proveedor) return null;

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));
  const F = (field: keyof Proveedor) => editing
    ? <Input value={(form[field] as string) ?? ""} onChange={(e) => set(field, e.target.value)} className="h-8" />
    : <span className="text-sm">{(proveedor[field] as string) ?? "—"}</span>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/proveedores"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{proveedor.nombre}</h1>
            <p className="text-muted-foreground text-sm">Alta: {formatDate(proveedor.createdAt)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(proveedor); }}><X className="h-4 w-4 mr-1" />Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Guardar</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del proveedor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[["Nombre","nombre"],["CIF / NIF","cifNif"],["Email","email"],["Teléfono","telefono"],["Contacto","contacto"]].map(([l, f]) => (
              <div key={f} className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{l}</Label>
                {F(f as keyof Proveedor)}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Dirección</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[["Dirección","direccion"],["Ciudad","ciudad"],["CP","codigoPostal"],["País","pais"]].map(([l, f]) => (
              <div key={f} className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{l}</Label>
                {F(f as keyof Proveedor)}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Compras ({proveedor.compras.length})</CardTitle>
          <Link href={`/compras/nuevo?proveedorId=${id}`}><Button size="sm" variant="outline">Nueva compra</Button></Link>
        </CardHeader>
        <CardContent className="p-0">
          {proveedor.compras.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-4">Sin compras registradas</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-y"><tr>
                <th className="text-left px-4 py-2 font-medium">Número</th>
                <th className="text-left px-4 py-2 font-medium">Estado</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
                <th className="text-left px-4 py-2 font-medium">Fecha</th>
              </tr></thead>
              <tbody className="divide-y">
                {proveedor.compras.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => window.location.href = `/compras/${c.id}`}>
                    <td className="px-4 py-2 font-mono text-xs">{c.numero}</td>
                    <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[c.estado] ?? ""}`}>{c.estado}</span></td>
                    <td className="px-4 py-2 text-right font-medium">{formatEuro(c.total)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(c.fechaEmision)}</td>
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
