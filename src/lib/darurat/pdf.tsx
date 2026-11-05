"use client";

import {
  Document,
  Page,
  pdf as renderPdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { EvidenceBundle } from "@/lib/contracts/evidence";
import {
  buildReportModel,
  REPORT_STATEMENT,
  type ReportDraft,
} from "@/lib/darurat/report";

/**
 * PDF renderer for the emergency report (§5-D).
 *
 * Rendered entirely in the browser: the reporter's name, account numbers and
 * chronology never leave the device (privacy promise §11.6). Loaded only when
 * the person presses "Unduh laporan PDF", so it stays out of the main bundle.
 *
 * PDF colours are print values, not UI colours: @react-pdf/renderer cannot
 * resolve CSS variables. They are kept in one place so there is no drift.
 */

const PDF_COLORS = {
  ink: "#111820",
  dim: "#556171",
  line: "#c8ced8",
  paper: "#ffffff",
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 40,
    paddingBottom: 56,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.45,
    color: PDF_COLORS.ink,
    backgroundColor: PDF_COLORS.paper,
  },
  brand: {
    fontSize: 8,
    letterSpacing: 1.6,
    color: PDF_COLORS.dim,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 8.5,
    color: PDF_COLORS.dim,
    marginBottom: 16,
  },
  section: { marginBottom: 13 },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.line,
    paddingBottom: 3,
    marginBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 2 },
  rowLabel: { width: 105, color: PDF_COLORS.dim },
  rowValue: { flex: 1 },
  paragraph: { lineHeight: 1.5 },
  chronologyRow: { flexDirection: "row", marginBottom: 3 },
  chronologyIndex: { width: 16, color: PDF_COLORS.dim },
  chronologyText: { flex: 1 },
  artifact: { marginBottom: 4 },
  artifactLabel: { fontFamily: "Helvetica-Bold" },
  artifactValue: { color: PDF_COLORS.dim },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  signatureBox: { width: "45%" },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.ink,
    marginTop: 34,
    paddingTop: 3,
  },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 24,
    fontSize: 7.5,
    color: PDF_COLORS.dim,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.line,
    paddingTop: 4,
  },
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function ReportDocument({
  draft,
  bundle,
  modus,
}: {
  draft: ReportDraft;
  bundle: EvidenceBundle;
  modus: string;
}) {
  const model = buildReportModel(draft, bundle, modus);
  const generatedAt = new Date().toLocaleString("id-ID");

  return (
    <Document
      title={`Laporan dugaan penipuan — ${model.reporter.name}`}
      author="Lumina"
      subject="Laporan dugaan penipuan untuk bank atau kepolisian"
      creator="Lumina"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>LUMINA · MODE DARURAT</Text>
        <Text style={styles.title}>Laporan Dugaan Penipuan</Text>
        <Text style={styles.subtitle}>
          Disusun oleh pelapor untuk diserahkan ke bank atau kepolisian. Bukan
          laporan resmi instansi.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pelapor</Text>
          <Row label="Nama" value={model.reporter.name} />
          <Row label="Nomor HP" value={model.reporter.phone} />
          <Row label="Modus" value={model.incident.modus} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kejadian</Text>
          <Row label="Waktu" value={model.incident.at} />
          <Row label="Kerugian" value={model.incident.loss} />
          <Row label="Bank / e-wallet" value={model.incident.bank} />
          <Row label="Rekening pelaku" value={model.incident.account} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan</Text>
          <Text style={styles.paragraph}>{model.narrative}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kronologi</Text>
          {model.chronology.length > 0 ? (
            model.chronology.map((line, index) => (
              <View key={line} style={styles.chronologyRow}>
                <Text style={styles.chronologyIndex}>{index + 1}.</Text>
                <Text style={styles.chronologyText}>{line}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.paragraph}>Belum diisi.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bukti yang disimpan</Text>
          {model.artifacts.map((artifact) => (
            <View key={artifact.id} style={styles.artifact}>
              <Text style={styles.artifactLabel}>{artifact.label}</Text>
              <Text style={styles.artifactValue}>{artifact.value}</Text>
            </View>
          ))}
          <Text style={styles.artifactValue}>
            Bukti asli (tangkapan layar, mutasi rekening) dibawa terpisah.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pernyataan dan tanda tangan</Text>
          <Text style={styles.paragraph}>{REPORT_STATEMENT}</Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text>
                {model.incident.place}, {model.incident.at}
              </Text>
            </View>
            <View style={styles.signatureBox}>
              <Text>Pelapor</Text>
              <View style={styles.signatureLine}>
                <Text>{model.reporter.name}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Dibuat dengan Lumina pada {generatedAt}. Dokumen ini dirender di
          perangkat pelapor; tidak ada data yang diunggah ke server.
        </Text>
      </Page>
    </Document>
  );
}

/** Render and download the report. Only ever called from a click handler. */
export async function downloadReportPdf({
  draft,
  bundle,
  modus,
}: {
  draft: ReportDraft;
  bundle: EvidenceBundle;
  modus: string;
}): Promise<void> {
  const blob = await renderPdf(
    <ReportDocument draft={draft} bundle={bundle} modus={modus} />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `laporan-lumina-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
