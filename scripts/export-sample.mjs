import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell } from "docx";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

function parseDotEnv(dotEnvPath) {
  try {
    const content = fs.readFileSync(dotEnvPath, "utf8");
    content.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([^=#\s]+)\s*=\s*"(.*)"\s*$/) || line.match(/^\s*([^=#\s]+)\s*=\s*(.*)\s*$/);
      if (m) {
        const key = m[1];
        const val = m[2];
        process.env[key] = val;
      }
    });
  } catch {
    // ignore
  }
}

parseDotEnv(path.resolve(process.cwd(), ".env"));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env. Ensure .env has VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function toBase64(filePath) {
  const buf = fs.readFileSync(filePath);
  return buf.toString("base64");
}

function findPdf() {
  const root = process.cwd();
  const files = fs.readdirSync(root);
  const candidates = files.filter((f) => f.toLowerCase().endsWith(".pdf"));
  // Prefer the user's named file if present
  const preferred = candidates.find((f) => f.toLowerCase().includes("scientific equipment proposal called for".toLowerCase()));
  return preferred ? path.join(root, preferred) : candidates.length ? path.join(root, candidates[0]) : null;
}

// Minimal in-script parser matching src/lib/documentStructure.ts (duplicated to avoid TS import in Node)
function isTableSeparator(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false;
  const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
  return cells.every((c) => /^:?-{3,}:?$/.test(c));
}
function splitTableRow(line) {
  const trimmed = line.trim();
  const content = trimmed.startsWith("|") && trimmed.endsWith("|") ? trimmed.slice(1, -1) : trimmed;
  return content.split("|").map((c) => c.trim());
}
function parseDocumentStructureText(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nodes = [];
  let i = 0;
  let paragraphBuffer = [];
  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      nodes.push({ type: "paragraph", lines: [...paragraphBuffer] });
      paragraphBuffer = [];
    }
  };
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      nodes.push({ type: "hr" });
      i++;
      continue;
    }
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      nodes.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2].trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith(">")) {
      flushParagraph();
      nodes.push({ type: "blockquote", text: trimmed.replace(/^>\s?/, "").trim() });
      i++;
      continue;
    }
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (ulMatch || olMatch) {
      flushParagraph();
      const ordered = !!olMatch;
      const items = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const m = ordered ? t.match(/^(\d+)[.)]\s+(.*)$/) : t.match(/^[-*]\s+(.*)$/);
        if (!m) break;
        items.push(ordered ? m[2].trim() : m[1].trim());
        i++;
      }
      nodes.push({ type: "list", ordered, items });
      continue;
    }
    if (trimmed.includes("|")) {
      const headerRow = splitTableRow(trimmed);
      const sepLine = lines[i + 1]?.trim() ?? "";
      if (isTableSeparator(sepLine)) {
        flushParagraph();
        i += 2;
        const rows = [];
        while (i < lines.length) {
          const t = lines[i].trim();
          if (!t.includes("|")) break;
          rows.push(splitTableRow(t));
          i++;
        }
        nodes.push({ type: "table", headers: headerRow, rows });
        continue;
      }
    }
    if (trimmed.length === 0) {
      flushParagraph();
      i++;
      continue;
    }
    paragraphBuffer.push(line);
    i++;
  }
  flushParagraph();
  return { nodes };
}

async function exportDocx(docStruct, outPath) {
  const children = [];
  docStruct.nodes.forEach((node) => {
    if (node.type === "heading") {
      const levelMap = {
        1: HeadingLevel.TITLE,
        2: HeadingLevel.HEADING_1,
        3: HeadingLevel.HEADING_2,
        4: HeadingLevel.HEADING_3,
        5: HeadingLevel.HEADING_4,
        6: HeadingLevel.HEADING_5,
      };
      children.push(new Paragraph({ text: node.text, heading: levelMap[node.level] || HeadingLevel.HEADING_3 }));
    } else if (node.type === "paragraph") {
      children.push(new Paragraph({ children: [new TextRun({ text: node.lines.join("\n"), size: 24 })] }));
    } else if (node.type === "list") {
      node.items.forEach((item, idx) => {
        const prefix = node.ordered ? `${idx + 1}. ` : "• ";
        children.push(new Paragraph({ children: [new TextRun({ text: prefix + item, size: 24 })] }));
      });
    } else if (node.type === "table") {
      const rows = [];
      rows.push(new TableRow({ children: node.headers.map((h) => new TableCell({ children: [new Paragraph({ text: h })] })) }));
      node.rows.forEach((row) => {
        rows.push(new TableRow({ children: row.map((cell) => new TableCell({ children: [new Paragraph({ text: cell })] })) }));
      });
      children.push(new Table({ rows }));
    } else if (node.type === "hr") {
      children.push(new Paragraph({ text: "" }));
    } else if (node.type === "blockquote") {
      children.push(new Paragraph({ children: [new TextRun({ text: node.text, italics: true })] }));
    }
  });
  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
}

function exportPdf(docStruct, outPath) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  const lineGap = 6;
  let yCursor = margin;
  const ensureSpace = (needed) => {
    if (yCursor + needed > pageHeight - margin) {
      pdf.addPage();
      yCursor = margin;
    }
    return yCursor;
  };
  const advance = (dy) => {
    yCursor += dy;
  };
  pdf.setFont("helvetica", "normal");
  docStruct.nodes.forEach((node) => {
    if (node.type === "heading") {
      const size = node.level === 1 ? 18 : node.level === 2 ? 16 : node.level === 3 ? 14 : 12;
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(node.text, maxWidth);
      const y = ensureSpace(lines.length * lineGap + 4);
      const alignCenter = node.level === 1;
      lines.forEach((ln, idx) => {
        const x = alignCenter ? pageWidth / 2 : margin;
        if (alignCenter) pdf.text(ln, x, y + idx * lineGap, { align: "center" });
        else pdf.text(ln, margin, y + idx * lineGap);
      });
      advance(lines.length * lineGap + 4);
      pdf.setFontSize(11);
    } else if (node.type === "paragraph") {
      pdf.setFontSize(11);
      const paraText = node.lines.join("\n");
      const lines = pdf.splitTextToSize(paraText, maxWidth);
      const y = ensureSpace(lines.length * lineGap + 2);
      lines.forEach((ln, idx) => pdf.text(ln, margin, y + idx * lineGap));
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
      const rowHeight = 7;
      let y = ensureSpace((1 + node.rows.length) * (rowHeight + 1) + 4);
      pdf.setFontSize(11);
      node.headers.forEach((h, ci) => {
        const x = margin + ci * colWidth;
        pdf.rect(x, y, colWidth, rowHeight);
        pdf.text(h, x + 2, y + rowHeight - 2);
      });
      y += rowHeight + 1;
      node.rows.forEach((row) => {
        if (y + rowHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        for (let ci = 0; ci < cols; ci++) {
          const x = margin + ci * colWidth;
          const cellText = row[ci] ?? "";
          pdf.rect(x, y, colWidth, rowHeight);
          const lines = pdf.splitTextToSize(cellText, colWidth - 4);
          pdf.text(lines, x + 2, y + 4);
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
  const arrayBuffer = pdf.output("arraybuffer");
  fs.writeFileSync(outPath, Buffer.from(arrayBuffer));
}

function exportXlsx(text, docStruct, outPath) {
  const workbook = XLSX.utils.book_new();
  const hasTables = docStruct.nodes.some((n) => n.type === "table");
  if (hasTables) {
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
    const data = lines.map((line, index) => ({ Line: index + 1, Content: line }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet["!cols"] = [{ wch: 8 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Text");
  }
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  fs.writeFileSync(outPath, buffer);
}

async function main() {
  const pdfPath = findPdf();
  if (!pdfPath) {
    console.error("No PDF found in project root.");
    process.exit(1);
  }
  console.log("Using PDF:", pdfPath);
  const base64 = toBase64(pdfPath);
  console.log("Invoking Supabase function for extraction...");
  const { data, error } = await supabase.functions.invoke("process-document", {
    body: { imageBase64: base64, mimeType: "application/pdf" },
  });
  if (error) {
    console.error("Extraction error:", error);
    process.exit(1);
  }
  const text = data?.text || "";
  if (!text) {
    console.error("No text extracted.");
    process.exit(1);
  }
  const outDir = path.join(process.cwd(), "exports");
  fs.mkdirSync(outDir, { recursive: true });
  const docStruct = parseDocumentStructureText(text);
  console.log("Exporting DOCX...");
  await exportDocx(docStruct, path.join(outDir, "Scientific-Equipment-Proposal.docx"));
  console.log("Exporting PDF...");
  exportPdf(docStruct, path.join(outDir, "Scientific-Equipment-Proposal.pdf"));
  console.log("Exporting XLSX...");
  exportXlsx(text, docStruct, path.join(outDir, "Scientific-Equipment-Proposal.xlsx"));
  console.log("Done. Files saved to:", outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

