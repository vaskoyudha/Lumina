import { SAMPLE_BUNDLE, SAMPLE_REPORT_DRAFT } from "@/data/report-sample";
import { downloadReportPdf } from "@/lib/darurat/pdf";

/**
 * The download path, without the 1 MB renderer: proves the button creates a
 * blob, names the file by date, and hands it to the browser. The real PDF
 * renderer is exercised by `next build`, which bundles it on demand.
 */

jest.mock("@react-pdf/renderer", () => {
  const React = require("react");
  const passthrough = (tag: string) => {
    return function PdfNode({ children }: { children?: React.ReactNode }) {
      return React.createElement(tag, null, children);
    };
  };

  return {
    Document: passthrough("pdf-document"),
    Page: passthrough("pdf-page"),
    Text: passthrough("pdf-text"),
    View: passthrough("pdf-view"),
    StyleSheet: { create: <T>(styles: T): T => styles },
    pdf: () => ({
      toBlob: async () => new Blob(["%PDF-1.4"], { type: "application/pdf" }),
    }),
  };
});

describe("downloadReportPdf", () => {
  it("hands a dated PDF blob to the browser", async () => {
    const createObjectURL = jest.fn(() => "blob:lumina-report");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    const click = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const appendChild = jest.spyOn(document.body, "appendChild");

    await downloadReportPdf({
      draft: SAMPLE_REPORT_DRAFT,
      bundle: SAMPLE_BUNDLE,
      modus: "File APK via WhatsApp",
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);

    const anchor = appendChild.mock.calls[0]?.[0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^laporan-lumina-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(anchor.href).toBe("blob:lumina-report");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:lumina-report");

    click.mockRestore();
    appendChild.mockRestore();
  });
});
