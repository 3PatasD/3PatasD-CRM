"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface Usuario { id: string; nombre: string; email: string; role: string; activo: boolean; createdAt: string; }

const ROLE_LABELS: Record<string, string> = { ADMIN: "Administrador", VENDEDOR: "Vendedor", ALMACEN: "Almacén" };
const ROLE_COLORS: Record<string, string> = { ADMIN: "bg-purple-100 text-purple-700", VENDEDOR: "bg-blue-100 text-blue-700", ALMACEN: "bg-teal-100 text-teal-700" };

export default function UsuariosPage() {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", role: "VENDEDOR" });

  useEffect(() => { fetchUsuarios(); }, []);

  async function fetchUsuarios() {
    setLoading(true);
    fetch("/api/usuarios").then((r) => r.json()).then(setUsuarios).finally(() => setLoading(false));
  }

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Usuario creado" });
      setShowForm(false);
      setForm({ nombre: "", email: "", password: "", role: "VENDEDOR" });
      fetchUsuarios();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function toggleActivo(id: string, activo: boolean) {
    await fetch(`/api/usuarios/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !activo }) });
    setUsuarios((p) => p.map((u) => u.id === id ? { ...u, activo: !activo } : u));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Usuarios</h1><p className="text-muted-foreground text-sm mt-1">Gestión de usuarios y roles del sistema</p></div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Nuevo usuario</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Nuevo usuario</CardTitle>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nombre *</Label><Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required /></div>
              <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required /></div>
              <div className="space-y-1.5"><Label>Contraseña *</Label><Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={6} /></div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.role} onChange={(e) => set("role", e.target.value)}>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ALMACEN">Almacén</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Crear usuario</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b"><tr>
            <th className="text-left px-4 py-3 font-medium">Usuario</th>
            <th className="text-left px-4 py-3 font-medium">Rol</th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Alta</th>
            <th className="text-left px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
            : usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.nombre}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? ""}`}>{ROLE_LABELS[u.role] ?? u.role}</span></td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3"><Badge variant={u.activo ? "default" : "secondary"}>{u.activo ? "Activo" : "Inactivo"}</Badge></td>
                <td className="px-4 py-3"><button onClick={() => toggleActivo(u.id, u.activo)} className="text-xs text-muted-foreground hover:text-foreground underline">{u.activo ? "Desactivar" : "Activar"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
