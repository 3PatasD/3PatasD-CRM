-- CreateEnum
CREATE TYPE "TipoGasto" AS ENUM ('SUSCRIPCION', 'COMPRA_PUNTUAL', 'FACTURA_PROVEEDOR');

-- CreateEnum
CREATE TYPE "EstadoGasto" AS ENUM ('PENDIENTE', 'PAGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('SOFTWARE', 'HARDWARE', 'SERVICIOS', 'ALQUILER', 'SUMINISTROS', 'MARKETING', 'FORMACION', 'TRANSPORTE', 'IMPUESTOS', 'OTROS');

-- CreateEnum
CREATE TYPE "PeriodicidadGasto" AS ENUM ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "tipo" "TipoGasto" NOT NULL,
    "concepto" TEXT NOT NULL,
    "categoria" "CategoriaGasto",
    "proveedorId" TEXT,
    "proveedorNombre" TEXT,
    "importe" DECIMAL(10,2) NOT NULL,
    "iva" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "importeTotal" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "estado" "EstadoGasto" NOT NULL DEFAULT 'PENDIENTE',
    "metodoPago" TEXT,
    "numeroFactura" TEXT,
    "notas" TEXT,
    "esRecurrente" BOOLEAN NOT NULL DEFAULT false,
    "periodicidad" "PeriodicidadGasto",
    "proximaRenovacion" TIMESTAMP(3),
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
