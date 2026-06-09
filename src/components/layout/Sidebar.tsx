"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Package, FileText,
  ShoppingCart, ClipboardList, Truck, Receipt, Tag,
  Settings, UserCog, ChevronRight, X, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["ADMIN","VENDEDOR","ALMACEN"] },
  { separator: true },
  { label: "Clientes", href: "/clientes", icon: Users, roles: ["ADMIN","VENDEDOR","ALMACEN"] },
  { label: "Proveedores", href: "/proveedores", icon: Building2, roles: ["ADMIN","VENDEDOR","ALMACEN"] },
  { label: "Productos", href: "/productos", icon: Package, roles: ["ADMIN","VENDEDOR","ALMACEN"] },
  { separator: true },
  { label: "Presupuestos", href: "/presupuestos", icon: FileText, roles: ["ADMIN","VENDEDOR","ALMACEN"] },
  { label: "Pedidos", href: "/pedidos", icon: ClipboardList, roles: ["ADMIN","VENDEDOR","ALMACEN"] },
  { label: "Albaranes", href: "/albaranes", icon: Truck, roles: ["ADMIN","VENDEDOR","ALMACEN"] },
  { label: "Facturas", href: "/facturas", icon: Receipt, roles: ["ADMIN","VENDEDOR"] },
  { separator: true },
  { label: "Compras", href: "/compras", icon: ShoppingCart, roles: ["ADMIN","ALMACEN"] },
  { label: "Gastos", href: "/gastos", icon: TrendingDown, roles: ["ADMIN","VENDEDOR"] },
  { separator: true },
  { label: "Promociones", href: "/promociones", icon: Tag, roles: ["ADMIN","VENDEDOR"] },
  { separator: true },
  { label: "Ajustes", href: "/ajustes", icon: Settings, roles: ["ADMIN"] },
  { label: "Usuarios", href: "/usuarios", icon: UserCog, roles: ["ADMIN"] },
] as const;

interface SidebarProps {
  role: Role;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0 lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
          <span className="text-xl font-bold text-white">3PatasD CRM</span>
          <button onClick={onClose} className="lg:hidden text-sidebar-foreground/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item, i) => {
            if ("separator" in item) {
              return <div key={i} className="my-2 mx-4 h-px bg-sidebar-border" />;
            }

            if (!(item.roles as readonly string[]).includes(role)) return null;

            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
                {active && <ChevronRight className="ml-auto h-3 w-3" />}
              </Link>
            );
          })}
        </nav>

        {/* Version */}
        <div className="px-6 py-3 border-t border-sidebar-border text-xs text-sidebar-foreground/40">
          v1.0.0
        </div>
      </aside>
    </>
  );
}
