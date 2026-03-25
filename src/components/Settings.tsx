import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Key, Bot, Cpu, Save, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

export const Settings = () => {
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem("GEMINI_API_KEY") || "";
    setSavedKey(storedKey);
    setApiKey(""); // Explicitly ensure input is blank on load
  }, []);

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;
    
    localStorage.setItem("GEMINI_API_KEY", trimmedKey);
    setSavedKey(trimmedKey);
    setApiKey(""); // Reset input after saving
    toast.success("New API key saved and activated");
    setTestStatus("idle");
    setIsEditing(false);
  };

  const handleClear = () => {
    localStorage.removeItem("GEMINI_API_KEY");
    setApiKey("");
    setSavedKey("");
    setTestStatus("idle");
    setIsEditing(false);
    toast.info("Custom API key removed. Using system default.");
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus("idle");
    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customApiKey: apiKey || savedKey || undefined }),
      });

      if (response.ok) {
        setTestStatus("success");
        toast.success("Connection successful! API key is valid.");
      } else {
        const data = await response.json();
        setTestStatus("error");
        toast.error(data.error || "Connection failed. Please check your API key.");
      }
    } catch (error) {
      setTestStatus("error");
      toast.error("Network error. Could not reach the API.");
    } finally {
      setIsTesting(false);
    }
  };

  const maskKey = (key: string) => {
    if (!key) return "Not Configured";
    return `${key.substring(0, 8)}••••••••${key.substring(key.length - 4)}`;
  };

  const aiDetails = {
    provider: "Google Gemini AI",
    model: "gemini-2.5-flash",
    status: savedKey ? "Custom Key Active" : "System Default Active",
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl mx-auto">
      {(!savedKey || isEditing) && (
        <Card className="border-primary/10 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Key className="w-5 h-5 text-primary" />
              {savedKey ? "Update API Configuration" : "API Configuration"}
            </CardTitle>
            <CardDescription>
              {savedKey 
                ? "Enter a new key to replace the current active one." 
                : "Configure your Google Gemini API credentials to get started."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="api-key" className="text-sm font-semibold">
                {savedKey ? "New Gemini API Key" : "Gemini API Key"}
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  placeholder="Enter new API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <Button 
                  onClick={handleSave} 
                  disabled={!apiKey || apiKey.length < 10}
                  className="flex-1 sm:flex-none gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savedKey ? "Update Key" : "Save Key"}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTesting || (!apiKey && !savedKey)}
                  className="flex-1 sm:flex-none gap-2"
                >
                  {isTesting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : testStatus === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : testStatus === "error" ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Test {apiKey ? "New Key" : "Current Key"}
                </Button>

                {isEditing && (
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md border border-border/50">
                <AlertCircle className="w-3 h-3 inline mr-1 -mt-0.5" />
                Custom keys are stored locally in your browser.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/10 shadow-md bg-secondary/5">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">Active System Status</CardTitle>
            <div className="flex gap-2">
              {savedKey && !isEditing && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 text-xs"
                >
                  Update Key
                </Button>
              )}
              {savedKey && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleClear}
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                >
                  Reset to Default
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background border border-primary/10 space-y-1 shadow-sm">
              <div className="flex items-center gap-2 text-primary">
                <Cpu className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Provider</span>
              </div>
              <p className="text-sm font-semibold">{aiDetails.provider}</p>
            </div>
            
            <div className="p-4 rounded-xl bg-background border border-primary/10 space-y-1 shadow-sm">
              <div className="flex items-center gap-2 text-primary">
                <Bot className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Model</span>
              </div>
              <p className="text-sm font-semibold">{aiDetails.model}</p>
            </div>

            <div className="p-4 rounded-xl bg-background border border-primary/10 space-y-1 shadow-sm">
              <div className="flex items-center gap-2 text-primary">
                <Key className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Active Auth</span>
              </div>
              <p className="text-sm font-semibold truncate text-primary/80">
                {savedKey ? maskKey(savedKey) : "System Default"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
