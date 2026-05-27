"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, X, Pencil, KeyRound, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface Usuario { id: string; nombre: string; email: string; role: string; activo: boolean; createdAt: string; }

const ROLE_LABELS: Record<string, string> = { ADMIN: "Administrador", VENDEDOR: "Vendedor", ALMACEN: "Almacén" };
const ROLE_COLORS: Record<string, string> = { ADMIN: "bg-purple-100 text-purple-700", VENDEDOR: "bg-blue-100 text-blue-700", ALMACEN: "bg-teal-100 text-teal-700" };

type Mode = "none" | "create" | "edit";

const EMPTY_FORM = { nombre: "", email: "", password: "", role: "VENDEDOR" };

export default function UsuariosPage() {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("none");
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => { fetchUsuarios(); }, []);

  async function fetchUsuarios() {
    setLoading(true);
    fetch("/api/usuarios").then((r) => r.json()).then(setUsuarios).finally(() => setLoading(false));
  }

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowPwd(false);
    setMode("create");
  }

  function openEdit(u: Usuario) {
    setForm({ nombre: u.nombre, email: u.email, password: "", role: u.role });
    setEditId(u.id);
    setShowPwd(false);
    setMode("edit");
  }

  function closeForm() { setMode("none"); setEditId(null); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Usuario creado" });
      closeForm();
      fetchUsuarios();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = { nombre: form.nombre, email: form.email, role: form.role };
      if (form.password) payload.password = form.password;
      const res = await fetch(`/api/usuarios/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Usuario actualizado" });
      closeForm();
      fetchUsuarios();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function toggleActivo(id: string, activo: boolean) {
    const res = await fetch(`/api/usuarios/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !activo }) });
    if (res.ok) setUsuarios((p) => p.map((u) => u.id === id ? { ...u, activo: !activo } : u));
    else {
      const d = await res.json();
      toast({ title: "Error", description: d.error, variant: "destructive" });
    }
  }

  const isEditing = mode === "edit";
  const isCreate = mode === "create";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Usuarios</h1><p className="text-muted-foreground text-sm mt-1">Gestión de usuarios y roles del sistema</p></div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nuevo usuario</Button>
      </div>

      {(isCreate || isEditing) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isEditing ? <><Pencil className="h-4 w-4" />Editar usuario</> : <><Plus className="h-4 w-4" />Nuevo usuario</>}
            </CardTitle>
            <button onClick={closeForm}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
          </CardHeader>
          <CardContent>
            <form onSubmit={isEditing ? handleEdit : handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  {isEditing ? "Nueva contraseña" : "Contraseña *"}
                </Label>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    required={!isEditing}
                    minLength={isEditing && !form.password ? undefined : 6}
                    placeholder={isEditing ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {isEditing && (
                  <p className="text-xs text-muted-foreground">Las contraseñas se almacenan cifradas. Solo puedes establecer una nueva.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.role}
                  onChange={(e) => set("role", e.target.value)}
                >
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ALMACEN">Almacén</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={closeForm}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {isEditing ? "Guardar cambios" : "Crear usuario"}
                </Button>
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
            {loading
              ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Cargando...</td></tr>
              : usuarios.map((u) => (
                <tr key={u.id} className={`hover:bg-muted/20 ${editId === u.id ? "bg-muted/30" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.nombre}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? ""}`}>{ROLE_LABELS[u.role] ?? u.role}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.activo ? "default" : "secondary"}>{u.activo ? "Activo" : "Inactivo"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Pencil className="h-3 w-3" />Editar
                      </button>
                      <span className="text-muted-foreground/40">·</span>
                      <button
                        onClick={() => toggleActivo(u.id, u.activo)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
