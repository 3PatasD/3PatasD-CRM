import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Company config
  await prisma.configuracionEmpresa.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nombre: "3PatasD S.L.",
      cif: "B12345678",
      direccion: "Calle Mayor, 10",
      ciudad: "Madrid",
      codigoPostal: "28013",
      pais: "España",
      telefono: "910 000 000",
      email: "info@3patasd.com",
      ivaDefecto: 21,
    },
  });

  // Admin user
  const adminHash = await bcrypt.hash("admin123", 10);
  await prisma.usuario.upsert({
    where: { email: "admin@3patasd.com" },
    update: {},
    create: {
      nombre: "Administrador",
      email: "admin@3patasd.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  // Vendedor
  const vendedorHash = await bcrypt.hash("vendedor123", 10);
  await prisma.usuario.upsert({
    where: { email: "vendedor@3patasd.com" },
    update: {},
    create: {
      nombre: "Carlos Vendedor",
      email: "vendedor@3patasd.com",
      passwordHash: vendedorHash,
      role: "VENDEDOR",
    },
  });

  // Almacén
  const almacenHash = await bcrypt.hash("almacen123", 10);
  await prisma.usuario.upsert({
    where: { email: "almacen@3patasd.com" },
    update: {},
    create: {
      nombre: "Ana Almacén",
      email: "almacen@3patasd.com",
      passwordHash: almacenHash,
      role: "ALMACEN",
    },
  });

  // Categories
  const cats = ["Materiales", "Herramientas", "Consumibles", "Repuestos"];
  const categorias: Record<string, { id: string }> = {};
  for (const nombre of cats) {
    const c = await prisma.categoria.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    categorias[nombre] = c;
  }

  // Products
  const productos = [
    { sku: "MAT-001", nombre: "Acero inoxidable 304 (kg)", precioCosto: 3.5, precioVenta: 6.0, iva: 21, stock: 500, minimo: 100, unidad: "kg", cat: "Materiales" },
    { sku: "MAT-002", nombre: "Aluminio 6061 (kg)", precioCosto: 4.2, precioVenta: 7.5, iva: 21, stock: 300, minimo: 50, unidad: "kg", cat: "Materiales" },
    { sku: "HER-001", nombre: "Taladro percutor 800W", precioCosto: 85, precioVenta: 149.99, iva: 21, stock: 15, minimo: 3, unidad: "ud", cat: "Herramientas" },
    { sku: "CON-001", nombre: "Guantes de protección (par)", precioCosto: 2.1, precioVenta: 4.5, iva: 21, stock: 200, minimo: 50, unidad: "par", cat: "Consumibles" },
    { sku: "REP-001", nombre: "Rodamiento 6204-2RS", precioCosto: 1.8, precioVenta: 3.95, iva: 21, stock: 8, minimo: 20, unidad: "ud", cat: "Repuestos" },
  ];

  for (const p of productos) {
    await prisma.producto.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        nombre: p.nombre,
        precioCosto: p.precioCosto,
        precioVenta: p.precioVenta,
        iva: p.iva,
        stockActual: p.stock,
        stockMinimo: p.minimo,
        unidad: p.unidad,
        categoriaId: categorias[p.cat].id,
      },
    });
  }

  // Customers
  await prisma.cliente.upsert({
    where: { id: "seed-cliente-1" },
    update: {},
    create: {
      id: "seed-cliente-1",
      nombre: "Industrias García S.A.",
      cifNif: "A87654321",
      email: "compras@garcia.es",
      telefono: "91 234 5678",
      direccion: "Pol. Industrial Norte, Nave 5",
      ciudad: "Madrid",
      codigoPostal: "28020",
    },
  });

  await prisma.cliente.upsert({
    where: { id: "seed-cliente-2" },
    update: {},
    create: {
      id: "seed-cliente-2",
      nombre: "Taller López e Hijos",
      cifNif: "B11223344",
      email: "info@tallerlopez.com",
      telefono: "93 345 6789",
      direccion: "Calle Industria, 22",
      ciudad: "Barcelona",
      codigoPostal: "08030",
    },
  });

  // Supplier
  await prisma.proveedor.upsert({
    where: { id: "seed-proveedor-1" },
    update: {},
    create: {
      id: "seed-proveedor-1",
      nombre: "Distribuciones Metálicas S.L.",
      cifNif: "B98765432",
      email: "pedidos@distmet.es",
      telefono: "91 567 8901",
      contacto: "Pedro Suministros",
      direccion: "Av. de la Industria, 100",
      ciudad: "Alcalá de Henares",
      codigoPostal: "28801",
    },
  });

  // Promo code
  await prisma.codigoPromocion.upsert({
    where: { codigo: "BIENVENIDO10" },
    update: {},
    create: {
      codigo: "BIENVENIDO10",
      descripcion: "Descuento de bienvenida 10%",
      tipo: "PORCENTAJE",
      valor: 10,
      limiteUsos: 100,
      activo: true,
    },
  });

  await prisma.codigoPromocion.upsert({
    where: { codigo: "DESCUENTO50" },
    update: {},
    create: {
      codigo: "DESCUENTO50",
      descripcion: "Descuento fijo de 50€",
      tipo: "FIJO",
      valor: 50,
      limiteUsos: 20,
      activo: true,
    },
  });

  console.log("✅ Seed completado");
  console.log("   admin@3patasd.com / admin123");
  console.log("   vendedor@3patasd.com / vendedor123");
  console.log("   almacen@3patasd.com / almacen123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
