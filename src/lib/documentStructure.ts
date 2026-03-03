export type DocNode =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" }
  | { type: "blockquote"; text: string };

export interface ParsedDocument {
  nodes: DocNode[];
}

function isTableSeparator(line: string) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false;
  // e.g. |-----|---|-----|
  const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
  return cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  const content = trimmed.startsWith("|") && trimmed.endsWith("|") ? trimmed.slice(1, -1) : trimmed;
  return content.split("|").map((c) => c.trim());
}

export function parseDocumentStructure(text: string): ParsedDocument {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nodes: DocNode[] = [];

  let i = 0;
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      nodes.push({ type: "paragraph", lines: [...paragraphBuffer] });
      paragraphBuffer = [];
    }
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw ?? "";
    const trimmed = line.trim();

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      nodes.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading #..###### (1-6)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      nodes.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      flushParagraph();
      nodes.push({
        type: "blockquote",
        text: trimmed.replace(/^>\s?/, "").trim(),
      });
      i++;
      continue;
    }

    // Lists (ordered or unordered)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (ulMatch || olMatch) {
      flushParagraph();
      const ordered = !!olMatch;
      const items: string[] = [];
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

    // Tables in markdown form
    // Expect header row, separator row, then data rows
    if (trimmed.includes("|")) {
      // Lookahead to see if we have a table block
      const headerRow = splitTableRow(trimmed);
      const sepLine = lines[i + 1]?.trim() ?? "";
      if (isTableSeparator(sepLine)) {
        flushParagraph();
        i += 2; // consume header and separator
        const rows: string[][] = [];
        while (i < lines.length) {
          const t = lines[i].trim();
          if (!t.includes("|")) break;
          const row = splitTableRow(t);
          // stop if row length mismatches header length substantially
          rows.push(row);
          i++;
        }
        nodes.push({ type: "table", headers: headerRow, rows });
        continue;
      }
    }

    // Empty line -> paragraph break
    if (trimmed.length === 0) {
      flushParagraph();
      i++;
      continue;
    }

    // Default -> accumulate paragraph lines
    paragraphBuffer.push(line);
    i++;
  }

  flushParagraph();
  return { nodes };
}

export function hasTables(doc: ParsedDocument): boolean {
  return doc.nodes.some((n) => n.type === "table");
}

