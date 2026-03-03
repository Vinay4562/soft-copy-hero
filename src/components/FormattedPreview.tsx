import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { parseDocumentStructure, type DocNode } from "@/lib/documentStructure";

interface FormattedPreviewProps {
  text: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export const FormattedPreview = ({ text, open, onOpenChange, title = "Formatted Preview" }: FormattedPreviewProps) => {
  const doc = useMemo(() => parseDocumentStructure(text), [text]);

  const renderNode = (node: DocNode, idx: number) => {
    switch (node.type) {
      case "heading": {
        const size = Math.max(1, Math.min(6, node.level));
        const classes =
          size === 1
            ? "text-2xl font-bold mt-6 mb-3 text-center"
            : size === 2
            ? "text-xl font-semibold mt-5 mb-3"
            : size === 3
            ? "text-lg font-semibold mt-4 mb-2"
            : "text-base font-semibold mt-3 mb-2";
        return <h2 key={idx} className={classes}>{node.text}</h2>;
      }
      case "paragraph": {
        return (
          <p key={idx} className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">
            {node.lines.join("\n")}
          </p>
        );
      }
      case "list": {
        const ListTag = node.ordered ? "ol" : "ul";
        return (
          <ListTag key={idx} className="text-sm leading-relaxed mb-3 pl-6 list-outside list-disc">
            {node.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ListTag>
        );
      }
      case "table": {
        return (
          <div key={idx} className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {node.headers.map((h, i) => (
                    <th key={i} className="border border-border bg-muted/50 px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {node.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} className="border border-border px-3 py-2 align-top">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      case "hr": {
        return <hr key={idx} className="my-4 border-border" />;
      }
      case "blockquote": {
        return (
          <blockquote key={idx} className="border-l-2 border-border pl-4 italic text-muted-foreground my-3">
            {node.text}
          </blockquote>
        );
      }
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Review the formatted document before exporting.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
          <div className="prose prose-sm max-w-none">
            {doc.nodes.map((n, i) => renderNode(n, i))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
