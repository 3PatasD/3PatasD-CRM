import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { toDecimal } from "@/lib/utils";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#222", padding: 36, paddingBottom: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  logo: { width: 80, height: 40, objectFit: "contain" },
  companyBlock: { alignItems: "flex-end" },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  companyDetail: { fontSize: 8, color: "#555" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  numero: { fontSize: 10, color: "#555", marginBottom: 16 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4, color: "#444", textTransform: "uppercase", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 2 },
  row: { flexDirection: "row" },
  col: { flex: 1 },
  label: { fontSize: 8, color: "#888" },
  value: { fontSize: 9 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f0f4ff", padding: "5 4", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  tableHeaderCell: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#333" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", padding: "4 4" },
  tableCell: { fontSize: 8 },
  flex1: { flex: 1 },
  w80: { width: 80, textAlign: "right" },
  w60: { width: 60, textAlign: "right" },
  w40: { width: 40, textAlign: "right" },
  totalBlock: { alignItems: "flex-end", marginTop: 10 },
  totalRow: { flexDirection: "row", width: 200, marginBottom: 2 },
  totalLabel: { flex: 1, fontSize: 8, color: "#555" },
  totalValue: { fontSize: 8, textAlign: "right" },
  totalFinal: { flexDirection: "row", width: 200, borderTopWidth: 1, borderTopColor: "#222", paddingTop: 4, marginTop: 4 },
  totalFinalLabel: { flex: 1, fontSize: 11, fontFamily: "Helvetica-Bold" },
  totalFinalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 6, fontSize: 7, color: "#aaa", textAlign: "center" },
  notes: { fontSize: 8, color: "#555", marginTop: 6, padding: "6 8", backgroundColor: "#f9f9f9", borderRadius: 4 },
});

export { styles, Document, Page, Text, View, Image, toDecimal };

type EmpresaConfig = {
  nombre: string; cif: string; direccion: string; ciudad: string;
  codigoPostal: string; pais: string; telefono?: string | null; email?: string | null;
  logoUrl?: string | null; datosBancarios?: string | null;
} | null;

export function formatEuroPDF(val: number | string | null | undefined): string {
  const n = typeof val === "string" ? parseFloat(val) : (val ?? 0);
  return `${(isNaN(n) ? 0 : n).toFixed(2)} €`;
}

export function formatDatePDF(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-ES").format(new Date(date));
}

export function PDFHeader({ empresa, titulo, numero, fecha }: { empresa: EmpresaConfig; titulo: string; numero: string; fecha: string }) {
  return (
    <View style={styles.header}>
      <View>
        {empresa?.logoUrl ? (
          <Image src={empresa.logoUrl} style={styles.logo} />
        ) : (
          <Text style={[styles.companyName, { fontSize: 14 }]}>{empresa?.nombre ?? "Mi Empresa"}</Text>
        )}
        {empresa?.logoUrl && <Text style={[styles.companyDetail, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>{empresa.nombre}</Text>}
        {empresa?.cif && <Text style={styles.companyDetail}>CIF: {empresa.cif}</Text>}
        {empresa?.direccion && <Text style={styles.companyDetail}>{empresa.direccion}</Text>}
        {empresa?.ciudad && <Text style={styles.companyDetail}>{empresa.codigoPostal} {empresa.ciudad}, {empresa.pais}</Text>}
        {empresa?.telefono && <Text style={styles.companyDetail}>Tel: {empresa.telefono}</Text>}
        {empresa?.email && <Text style={styles.companyDetail}>{empresa.email}</Text>}
      </View>
      <View style={styles.companyBlock}>
        <Text style={styles.title}>{titulo}</Text>
        <Text style={styles.numero}>{numero}</Text>
        <Text style={styles.companyDetail}>Fecha: {fecha}</Text>
      </View>
    </View>
  );
}

export function PDFClienteBlock({ cliente }: { cliente: { nombre: string; cifNif?: string | null; email?: string | null; direccion?: string | null; ciudad?: string | null; codigoPostal?: string | null } }) {
  return (
    <View style={[styles.section, { backgroundColor: "#f9f9f9", padding: 8, borderRadius: 4 }]}>
      <Text style={styles.sectionTitle}>Cliente</Text>
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>{cliente.nombre}</Text>
      {cliente.cifNif && <Text style={styles.companyDetail}>CIF/NIF: {cliente.cifNif}</Text>}
      {cliente.email && <Text style={styles.companyDetail}>{cliente.email}</Text>}
      {cliente.direccion && <Text style={styles.companyDetail}>{cliente.direccion}</Text>}
      {cliente.ciudad && <Text style={styles.companyDetail}>{cliente.codigoPostal} {cliente.ciudad}</Text>}
    </View>
  );
}

export function PDFLineasTable({ lineas }: { lineas: { descripcion: string; cantidad: number | string; precioUnitario: number | string; descuento?: number | string; iva: number | string; subtotal: number | string }[] }) {
  return (
    <View style={styles.section}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.flex1]}>Descripción</Text>
        <Text style={[styles.tableHeaderCell, styles.w60]}>Cant.</Text>
        <Text style={[styles.tableHeaderCell, styles.w80]}>P.Unit.</Text>
        <Text style={[styles.tableHeaderCell, styles.w40]}>Dto%</Text>
        <Text style={[styles.tableHeaderCell, styles.w40]}>IVA%</Text>
        <Text style={[styles.tableHeaderCell, styles.w80]}>Subtotal</Text>
      </View>
      {lineas.map((l, i) => (
        <View key={i} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: "#fafafa" } : {}]}>
          <Text style={[styles.tableCell, styles.flex1]}>{l.descripcion}</Text>
          <Text style={[styles.tableCell, styles.w60]}>{toDecimal(l.cantidad as number | string)}</Text>
          <Text style={[styles.tableCell, styles.w80]}>{formatEuroPDF(l.precioUnitario as number)}</Text>
          <Text style={[styles.tableCell, styles.w40]}>{toDecimal(l.descuento as number ?? 0)}%</Text>
          <Text style={[styles.tableCell, styles.w40]}>{toDecimal(l.iva as number)}%</Text>
          <Text style={[styles.tableCell, styles.w80]}>{formatEuroPDF(l.subtotal as number)}</Text>
        </View>
      ))}
    </View>
  );
}

export function PDFTotales({ subtotal, descuentoGlobal, descuentoPromo, totalIva, total }: { subtotal: number; descuentoGlobal?: number; descuentoPromo?: number; totalIva: number; total: number }) {
  return (
    <View style={styles.totalBlock}>
      <View style={styles.totalRow}><Text style={styles.totalLabel}>Base imponible</Text><Text style={styles.totalValue}>{formatEuroPDF(subtotal)}</Text></View>
      {(descuentoGlobal ?? 0) > 0 && <View style={styles.totalRow}><Text style={styles.totalLabel}>Descuento global</Text><Text style={styles.totalValue}>-{formatEuroPDF(subtotal * (descuentoGlobal! / 100))}</Text></View>}
      {(descuentoPromo ?? 0) > 0 && <View style={styles.totalRow}><Text style={styles.totalLabel}>Código promo</Text><Text style={styles.totalValue}>-{formatEuroPDF(descuentoPromo!)}</Text></View>}
      <View style={styles.totalRow}><Text style={styles.totalLabel}>IVA</Text><Text style={styles.totalValue}>{formatEuroPDF(totalIva)}</Text></View>
      <View style={styles.totalFinal}><Text style={styles.totalFinalLabel}>TOTAL</Text><Text style={styles.totalFinalValue}>{formatEuroPDF(total)}</Text></View>
    </View>
  );
}

export function PDFFooter({ empresa }: { empresa: EmpresaConfig }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{empresa?.nombre ?? ""}{empresa?.cif ? ` · CIF: ${empresa.cif}` : ""}{empresa?.datosBancarios ? ` · ${empresa.datosBancarios}` : ""}</Text>
    </View>
  );
}
