import { FileText, FileSpreadsheet, File, Download, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, forwardRef } from "react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell } from "docx";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { parseDocumentStructure, hasTables } from "@/lib/documentStructure";
import { FormattedPreview } from "@/components/FormattedPreview";

type ExportFormat = "docx" | "pdf" | "xlsx";

interface ExportOptionsProps {
  text: string;
  disabled: boolean;
}

export const ExportOptions = forwardRef<HTMLDivElement, ExportOptionsProps>(({ text, disabled }, ref) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("docx");
  const [isExporting, setIsExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const formats = [
    { id: "docx" as const, label: "Word", icon: FileText, color: "text-blue-600" },
    { id: "pdf" as const, label: "PDF", icon: File, color: "text-red-500" },
    { id: "xlsx" as const, label: "Excel", icon: FileSpreadsheet, color: "text-green-600" },
  ];

  const handleExport = async () => {
    if (!text || isExporting) return;
    
    setIsExporting(true);
    
    try {
      const blob = await generateExport(text, selectedFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `converted-document.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div ref={ref} className="bg-card rounded-xl shadow-card border border-border p-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
      <h3 className="font-semibold text-foreground mb-4">Export Format</h3>
      
      <div className="grid grid-cols-3 gap-3 mb-6">
        {formats.map((format) => (
          <button
            key={format.id}
            onClick={() => setSelectedFormat(format.id)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
              selectedFormat === format.id
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/30 hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {selectedFormat === format.id && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
            )}
            <format.icon className={cn("w-8 h-8", format.color)} />
            <span className="text-sm font-medium text-foreground">{format.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPreviewOpen(true)}
          disabled={disabled}
          className="h-10"
        >
          <Eye className="w-5 h-5 mr-2" />
          Preview formatted
        </Button>
        <Button
          onClick={handleExport}
          disabled={disabled || isExporting}
          className="bg-gradient-primary hover:opacity-90 transition-opacity h-10 text-base font-medium flex-1"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Download as {formats.find((f) => f.id === selectedFormat)?.label}
            </>
          )}
        </Button>
      </div>

      <FormattedPreview text={text} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
});

ExportOptions.displayName = "ExportOptions";

async function generateExport(text: string, format: ExportFormat): Promise<Blob> {
  switch (format) {
    case "docx":
      return generateDocx(text);
    case "pdf":
      return generatePdf(text);
    case "xlsx":
      return generateXlsx(text);
    default:
      throw new Error("Unsupported format");
  }
}

async function generateDocx(text: string): Promise<Blob> {
  const docStruct = parseDocumentStructure(text);
  const children: (Paragraph | Table)[] = [];

  docStruct.nodes.forEach((node) => {
    if (node.type === "heading") {
      const levelMap: Record<number, HeadingLevel> = {
        1: HeadingLevel.TITLE,
        2: HeadingLevel.HEADING_1,
        3: HeadingLevel.HEADING_2,
        4: HeadingLevel.HEADING_3,
        5: HeadingLevel.HEADING_4,
        6: HeadingLevel.HEADING_5,
      };
      children.push(
        new Paragraph({
          text: node.text,
          heading: levelMap[node.level] || HeadingLevel.HEADING_3,
        })
      );
    } else if (node.type === "paragraph") {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: node.lines.join("\n"), size: 24 })],
        })
      );
    } else if (node.type === "list") {
      node.items.forEach((item, idx) => {
        const prefix = node.ordered ? `${idx + 1}. ` : "• ";
        children.push(new Paragraph({ children: [new TextRun({ text: prefix + item, size: 24 })] }));
      });
    } else if (node.type === "table") {
      const rows: TableRow[] = [];
      rows.push(
        new TableRow({
          children: node.headers.map((h) => new TableCell({ children: [new Paragraph({ text: h })] })),
        })
      );
      node.rows.forEach((row) => {
        rows.push(
          new TableRow({
            children: row.map((cell) => new TableCell({ children: [new Paragraph({ text: cell })] })),
          })
        );
      });
      children.push(new Table({ rows }));
    } else if (node.type === "hr") {
      children.push(new Paragraph({ text: "" }));
    } else if (node.type === "blockquote") {
      children.push(new Paragraph({ children: [new TextRun({ text: node.text, italics: true })] }));
    }
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return await Packer.toBlob(doc);
}

function generatePdf(text: string): Blob {
  const docStruct = parseDocumentStructure(text);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  const lineGap = 6;

  let yCursor = margin;
  const ensureSpace = (needed: number) => {
    if (yCursor + needed > pageHeight - margin) {
      pdf.addPage();
      yCursor = margin;
    }
    return yCursor;
  };
  const advance = (dy: number) => {
    yCursor += dy;
  };
  pdf.setFont("helvetica", "normal");

  docStruct.nodes.forEach((node) => {
    if (node.type === "heading") {
      const size = node.level === 1 ? 18 : node.level === 2 ? 16 : node.level === 3 ? 14 : 12;
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(node.text, maxWidth);
      const y = ensureSpace(lines.length * lineGap + 4);
      // Center H1, left otherwise
      const alignCenter = node.level === 1;
      lines.forEach((ln: string, idx: number) => {
        const x = alignCenter ? pageWidth / 2 : margin;
        if (alignCenter) {
          pdf.text(ln, x, y + idx * lineGap, { align: "center" });
        } else {
          pdf.text(ln, margin, y + idx * lineGap);
        }
      });
      advance(lines.length * lineGap + 4);
      pdf.setFontSize(11);
    } else if (node.type === "paragraph") {
      pdf.setFontSize(11);
      const paraText = node.lines.join("\n");
      const lines = pdf.splitTextToSize(paraText, maxWidth);
      const y = ensureSpace(lines.length * lineGap + 2);
      lines.forEach((ln: string, idx: number) => {
        pdf.text(ln, margin, y + idx * lineGap);
      });
      advance(lines.length * lineGap + 2);
    } else if (node.type === "list") {
      pdf.setFontSize(11);
      const yStart = ensureSpace(node.items.length * lineGap + 2);
      node.items.forEach((item, idx) => {
        const bullet = node.ordered ? `${idx + 1}.` : "•";
        pdf.text(`${bullet} ${item}`, margin, yStart + idx * lineGap);
      });
      advance(node.items.length * lineGap + 2);
    } else if (node.type === "table") {
      const cols = node.headers.length;
      const colWidth = maxWidth / cols;
      const minRowHeight = 7;
      let y = ensureSpace(minRowHeight + 4);

      pdf.setFontSize(11);
      // Header with dynamic height
      const headerHeights: number[] = node.headers.map((h) => {
        const lines = pdf.splitTextToSize(h, colWidth - 4) as string[];
        return Math.max(minRowHeight, lines.length * lineGap + 4);
      });
      const headerRowHeight = Math.max(...headerHeights);
      node.headers.forEach((h, ci) => {
        const x = margin + ci * colWidth;
        pdf.rect(x, y, colWidth, headerRowHeight);
        const lines = pdf.splitTextToSize(h, colWidth - 4) as string[];
        lines.forEach((ln, li) => {
          pdf.text(ln, x + 2, y + 4 + li * lineGap);
        });
      });
      y += headerRowHeight + 1;

      // Data rows with dynamic heights per row
      node.rows.forEach((row) => {
        const cellLines: string[][] = [];
        let maxLines = 1;
        for (let ci = 0; ci < cols; ci++) {
          const cellText = (row[ci] ?? "").replace(/\s+/g, " ").trim();
          const lines = pdf.splitTextToSize(cellText, colWidth - 4) as string[];
          cellLines.push(lines);
          if (lines.length > maxLines) maxLines = lines.length;
        }
        const rowHeight = Math.max(minRowHeight, maxLines * lineGap + 4);
        if (y + rowHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        for (let ci = 0; ci < cols; ci++) {
          const x = margin + ci * colWidth;
          pdf.rect(x, y, colWidth, rowHeight);
          const lines = cellLines[ci];
          lines.forEach((ln, li) => {
            pdf.text(ln, x + 2, y + 4 + li * lineGap);
          });
        }
        y += rowHeight + 1;
      });
      yCursor = y + 2;
    } else if (node.type === "hr") {
      const y = ensureSpace(4);
      pdf.line(margin, y, margin + maxWidth, y);
      advance(6);
    } else if (node.type === "blockquote") {
      const y = ensureSpace(lineGap * 2);
      pdf.setFontSize(11);
      pdf.text(node.text, margin + 4, y);
      advance(lineGap * 2);
    }
  });

  return pdf.output("blob");
}

function generateXlsx(text: string): Blob {
  const docStruct = parseDocumentStructure(text);
  const workbook = XLSX.utils.book_new();

  if (hasTables(docStruct)) {
    let tblIndex = 1;
    docStruct.nodes.forEach((node) => {
      if (node.type === "table") {
        const sheetName = `Table ${tblIndex++}`;
        const data = [node.headers, ...node.rows];
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet["!cols"] = node.headers.map(() => ({ wch: 30 }));
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    });
  } else {
    const lines = text.split("\n");
    const data = lines.map((line, index) => ({
      Line: index + 1,
      Content: line,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet["!cols"] = [{ wch: 8 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Text");
  }

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
