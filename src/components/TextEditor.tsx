import { useState, useEffect } from "react";
import { Edit3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TextEditorProps {
  text: string;
  onTextChange: (text: string) => void;
}

export const TextEditor = ({ text, onTextChange }: TextEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableText, setEditableText] = useState(text);

  useEffect(() => {
    setEditableText(text);
  }, [text]);

  const handleSave = () => {
    onTextChange(editableText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditableText(text);
    setIsEditing(false);
  };

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
        <div>
          <h3 className="font-semibold text-foreground">Extracted Text</h3>
          <p className="text-sm text-muted-foreground">
            {wordCount} words · {charCount} characters
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-gradient-primary hover:opacity-90">
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit3 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>
      <div className="p-6">
        {isEditing ? (
          <Textarea
            value={editableText}
            onChange={(e) => setEditableText(e.target.value)}
            className="min-h-[400px] font-mono text-sm resize-none border-0 focus-visible:ring-0 bg-transparent p-0"
            placeholder="Extracted text will appear here..."
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-foreground text-sm leading-relaxed bg-transparent p-0 m-0 overflow-auto max-h-[400px]">
              {text || "No text extracted yet. Upload a PDF to get started."}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
