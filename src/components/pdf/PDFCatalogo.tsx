import { Document, Page, Text, View, Image, styles, toDecimal, formatEuroPDF, formatDatePDF, PDFFooter } from "./PDFBase";
import { StyleSheet } from "@react-pdf/renderer";

const s = StyleSheet.create({
  catHeader: { backgroundColor: "#1e3a5f", padding: "5 8", marginBottom: 0, marginTop: 14, borderRadius: 3 },
  catTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#fff", textTransform: "uppercase" },
  catCount: { fontSize: 7, color: "#aac4e8", marginTop: 1 },
  tableHeader: { flexDirection: "row", backgroundColor: "#eef2f7", padding: "4 4", borderBottomWidth: 1, borderBottomColor: "#ccd6e8" },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#334" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", padding: "3 4" },
  td: { fontSize: 8, color: "#222" },
  tdMuted: { fontSize: 7.5, color: "#777" },
  lowStock: { fontSize: 7.5, color: "#c0392b" },
  wSku: { width: 62 },
  wNombre: { flex: 1 },
  wPrecio: { width: 60, textAlign: "right" },
  wIva: { width: 32, textAlign: "right" },
  wStock: { width: 42, textAlign: "right" },
  wUnidad: { width: 34, textAlign: "left", paddingLeft: 4 },
  sinCat: { backgroundColor: "#f5f5f5", padding: "5 8", marginTop: 14, borderRadius: 3, borderLeftWidth: 3, borderLeftColor: "#bbb" },
  sinCatTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#555", textTransform: "uppercase" },
  summary: { marginTop: 20, padding: "8 10", backgroundColor: "#f9f9fb", borderRadius: 4, borderWidth: 1, borderColor: "#e4e8f0" },
  summaryTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#444", marginBottom: 6 },
  summaryRow: { flexDirection: "row", marginBottom: 2 },
  summaryLabel: { flex: 1, fontSize: 7.5, color: "#666" },
  summaryVal: { fontSize: 7.5, color: "#222", fontFamily: "Helvetica-Bold" },
});

type Producto = { sku: string; nombre: string; precioVenta: number; precioCosto: number; iva: number; stockActual: number; stockMinimo: number; unidad: string };
type CategoriaGroup = { nombre: string; productos: Producto[] };
type Empresa = { nombre: string; cif: string; direccion: string; ciudad: string; codigoPostal: string; pais: string; telefono?: string | null; email?: string | null; logoUrl?: string | null; datosBancarios?: string | null } | null;

function TableHeader() {
  return (
    <View style={s.tableHeader}>
      <Text style={[s.th, s.wSku]}>SKU</Text>
      <Text style={[s.th, s.wNombre]}>Nombre</Text>
      <Text style={[s.th, s.wPrecio]}>P. Venta</Text>
      <Text style={[s.th, s.wIva]}>IVA%</Text>
      <Text style={[s.th, s.wStock]}>Stock</Text>
      <Text style={[s.th, s.wUnidad]}>Unidad</Text>
    </View>
  );
}

function ProductRow({ p, i }: { p: Producto; i: number }) {
  const low = p.stockActual <= p.stockMinimo;
  return (
    <View style={[s.tableRow, i % 2 === 1 ? { backgroundColor: "#fafbfc" } : {}]}>
      <Text style={[s.td, s.wSku, { fontFamily: "Helvetica", fontSize: 7.5, color: "#555" }]}>{p.sku}</Text>
      <Text style={[s.td, s.wNombre]}>{p.nombre}</Text>
      <Text style={[s.td, s.wPrecio]}>{formatEuroPDF(p.precioVenta)}</Text>
      <Text style={[s.td, s.wIva]}>{toDecimal(p.iva)}%</Text>
      <Text style={[low ? s.lowStock : s.td, s.wStock]}>{toDecimal(p.stockActual)}</Text>
      <Text style={[s.tdMuted, s.wUnidad]}>{p.unidad}</Text>
    </View>
  );
}

export function PDFCatalogo({ categorias, sinCategoria, empresa, fecha }: { categorias: CategoriaGroup[]; sinCategoria: Producto[]; empresa: Empresa; fecha: string }) {
  const e = empresa;
  const totalProductos = categorias.reduce((a, c) => a + c.productos.length, 0) + sinCategoria.length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {e?.logoUrl ? (
              <Image src={e.logoUrl} style={styles.logo} />
            ) : (
              <Text style={[styles.companyName, { fontSize: 14 }]}>{e?.nombre ?? "Mi Empresa"}</Text>
            )}
            {e?.logoUrl && <Text style={[styles.companyDetail, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>{e.nombre}</Text>}
            {e?.cif && <Text style={styles.companyDetail}>CIF: {e.cif}</Text>}
            {e?.direccion && <Text style={styles.companyDetail}>{e.direccion}</Text>}
            {e?.ciudad && <Text style={styles.companyDetail}>{e.codigoPostal} {e.ciudad}, {e.pais}</Text>}
          </View>
          <View style={styles.companyBlock}>
            <Text style={styles.title}>CATÁLOGO DE PRODUCTOS</Text>
            <Text style={[styles.companyDetail, { marginTop: 6 }]}>Fecha de generación: {fecha}</Text>
            <Text style={[styles.companyDetail, { marginTop: 2 }]}>{totalProductos} productos · {categorias.length} categorías</Text>
          </View>
        </View>

        {/* Categories with products */}
        {categorias.map((cat) => (
          <View key={cat.nombre} wrap={false}>
            <View style={s.catHeader}>
              <Text style={s.catTitle}>{cat.nombre}</Text>
              <Text style={s.catCount}>{cat.productos.length} producto{cat.productos.length !== 1 ? "s" : ""}</Text>
            </View>
            <TableHeader />
            {cat.productos.map((p, i) => <ProductRow key={p.sku} p={p} i={i} />)}
          </View>
        ))}

        {/* Sin categoría */}
        {sinCategoria.length > 0 && (
          <View wrap={false}>
            <View style={s.sinCat}>
              <Text style={s.sinCatTitle}>Sin categoría</Text>
            </View>
            <TableHeader />
            {sinCategoria.map((p, i) => <ProductRow key={p.sku} p={p} i={i} />)}
          </View>
        )}

        {/* Summary */}
        <View style={s.summary}>
          <Text style={s.summaryTitle}>RESUMEN</Text>
          {categorias.map((cat) => (
            <View key={cat.nombre} style={s.summaryRow}>
              <Text style={s.summaryLabel}>{cat.nombre}</Text>
              <Text style={s.summaryVal}>{cat.productos.length} productos</Text>
            </View>
          ))}
          {sinCategoria.length > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Sin categoría</Text>
              <Text style={s.summaryVal}>{sinCategoria.length} productos</Text>
            </View>
          )}
          <View style={[s.summaryRow, { marginTop: 4, borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 4 }]}>
            <Text style={[s.summaryLabel, { fontFamily: "Helvetica-Bold" }]}>TOTAL</Text>
            <Text style={s.summaryVal}>{totalProductos} productos</Text>
          </View>
        </View>

        <PDFFooter empresa={e} />
      </Page>
    </Document>
  );
}
