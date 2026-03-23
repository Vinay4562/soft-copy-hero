import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { FileUpload } from "@/components/FileUpload";
import { TextEditor } from "@/components/TextEditor";
import { ExportOptions } from "@/components/ExportOptions";
import { Settings } from "@/components/Settings";
import { useDocumentProcessor } from "@/hooks/useDocumentProcessor";
import { Scan, Wand2, Download, CheckCircle2, Settings as SettingsIcon, LayoutDashboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("converter");
  const {
    isProcessing,
    extractedText,
    setExtractedText,
    processDocument,
    clearText,
  } = useDocumentProcessor();

  useEffect(() => {
    const handleSwitchToSettings = () => {
      setActiveTab("settings");
    };
    window.addEventListener('switch-to-settings-tab', handleSwitchToSettings);
    return () => {
      window.removeEventListener('switch-to-settings-tab', handleSwitchToSettings);
    };
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    processDocument(file);
  };

  const handleClear = () => {
    setSelectedFile(null);
    clearText();
  };

  const features = [
    {
      icon: Scan,
      title: "Smart OCR",
      description: "AI-powered text extraction from scanned and blurred documents",
    },
    {
      icon: Wand2,
      title: "Auto-Enhancement",
      description: "Automatically enhances clarity for better recognition",
    },
    {
      icon: Download,
      title: "Multiple Formats",
      description: "Export to Word, PDF, or Excel with one click",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid grid-cols-2 w-[400px]">
              <TabsTrigger value="converter" className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Converter
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="converter">
            {/* Hero Section */}
            <div className="text-center mb-12 animate-fade-up">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
                Convert Scanned PDFs to
                <span className="text-gradient"> Editable Documents</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Transform blurry scans and photos into perfectly editable text using advanced AI technology.
                Export to Word, PDF, or Excel instantly.
              </p>
            </div>

            {/* Features */}
            {!selectedFile && (
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {features.map((feature, index) => (
                  <div
                    key={feature.title}
                    className="bg-card rounded-xl p-6 shadow-card border border-border animate-fade-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <FileUpload
                  onFileSelect={handleFileSelect}
                  isProcessing={isProcessing}
                  selectedFile={selectedFile}
                  onClear={handleClear}
                />
                
                {extractedText && (
                  <TextEditor text={extractedText} onTextChange={setExtractedText} />
                )}
              </div>

              <div className="space-y-6">
                <ExportOptions text={extractedText} disabled={!extractedText || isProcessing} />
                
                {/* Status Card */}
                {extractedText && (
                  <div className="bg-card rounded-xl shadow-card border border-border p-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Processing Complete</h4>
                        <p className="text-sm text-muted-foreground">Ready to export</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Words extracted</span>
                        <span className="font-medium text-foreground">
                          {extractedText.trim().split(/\s+/).filter(Boolean).length}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Characters</span>
                        <span className="font-medium text-foreground">{extractedText.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tips Card */}
                <div className="bg-card rounded-xl shadow-card border border-border p-6 animate-fade-up" style={{ animationDelay: "0.3s" }}>
                  <h4 className="font-semibold text-foreground mb-3">Tips for Best Results</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      Use high-resolution scans when possible
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      Ensure documents are well-lit and aligned
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      Review extracted text before exporting
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="max-w-4xl mx-auto">
              <Settings />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;

