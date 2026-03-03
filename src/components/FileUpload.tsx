import { useCallback, useState, forwardRef } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  selectedFile: File | null;
  onClear: () => void;
}

export const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(({ onFileSelect, isProcessing, selectedFile, onClear }, ref) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  if (selectedFile) {
    return (
      <div ref={ref} className="relative bg-card rounded-xl p-6 shadow-card border border-border animate-fade-in">
        <button
          onClick={onClear}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center">
            {isProcessing ? (
              <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
            ) : (
              <FileText className="w-7 h-7 text-primary-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        {isProcessing && (
          <div className="mt-4">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-gradient-primary animate-pulse-gentle" style={{ width: "60%" }} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">Extracting text with AI...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer group",
        isDragOver
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
          isDragOver ? "bg-primary scale-110" : "bg-secondary group-hover:bg-primary/10"
        )}>
          <Upload className={cn(
            "w-8 h-8 transition-colors",
            isDragOver ? "text-primary-foreground" : "text-primary"
          )} />
        </div>
        <div>
          <p className="font-semibold text-foreground text-lg">
            Drop your PDF here
          </p>
          <p className="text-muted-foreground mt-1">
            or click to browse files
          </p>
        </div>
        <p className="text-sm text-muted-foreground/70">
          Supports scanned documents and blurred PDFs
        </p>
      </div>
    </div>
  );
});

FileUpload.displayName = "FileUpload";
