import type { Role } from "@prisma/client";

type Permission = "r" | "rw" | "-";

type Module =
  | "clientes"
  | "proveedores"
  | "productos"
  | "presupuestos"
  | "pedidos"
  | "albaranes"
  | "facturas"
  | "compras"
  | "promociones"
  | "ajustes"
  | "usuarios";

const PERMISSIONS: Record<Role, Record<Module, Permission>> = {
  ADMIN: {
    clientes: "rw",
    proveedores: "rw",
    productos: "rw",
    presupuestos: "rw",
    pedidos: "rw",
    albaranes: "rw",
    facturas: "rw",
    compras: "rw",
    promociones: "rw",
    ajustes: "rw",
    usuarios: "rw",
  },
  VENDEDOR: {
    clientes: "rw",
    proveedores: "r",
    productos: "r",
    presupuestos: "rw",
    pedidos: "rw",
    albaranes: "r",
    facturas: "r",
    compras: "r",
    promociones: "r",
    ajustes: "-",
    usuarios: "-",
  },
  ALMACEN: {
    clientes: "r",
    proveedores: "r",
    productos: "rw",
    presupuestos: "r",
    pedidos: "r",
    albaranes: "rw",
    facturas: "-",
    compras: "rw",
    promociones: "-",
    ajustes: "-",
    usuarios: "-",
  },
};

export function hasPermission(
  role: Role,
  module: Module,
  action: "r" | "w"
): boolean {
  const perm = PERMISSIONS[role]?.[module] ?? "-";
  if (perm === "-") return false;
  if (action === "r") return perm === "r" || perm === "rw";
  return perm === "rw";
}

export function canRead(role: Role, module: Module) {
  return hasPermission(role, module, "r");
}

export function canWrite(role: Role, module: Module) {
  return hasPermission(role, module, "w");
}

export function getVisibleModules(role: Role): Module[] {
  return (Object.keys(PERMISSIONS[role]) as Module[]).filter(
    (m) => PERMISSIONS[role][m] !== "-"
  );
}
