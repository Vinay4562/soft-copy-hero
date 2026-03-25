import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Key, Bot, Cpu, Save } from "lucide-react";

export const Settings = () => {
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState("");

  useEffect(() => {
    const storedKey = localStorage.getItem("GEMINI_API_KEY") || "";
    setApiKey(storedKey);
    setSavedKey(storedKey);
  }, []);

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    localStorage.setItem("GEMINI_API_KEY", trimmedKey);
    setApiKey(trimmedKey);
    setSavedKey(trimmedKey);
    toast.success("Gemini API Key saved successfully!");
  };

  const handleClear = () => {
    localStorage.removeItem("GEMINI_API_KEY");
    setApiKey("");
    setSavedKey("");
    toast.info("Custom API key cleared. Using system default.");
  };

  const aiDetails = {
    provider: "Google Gemini API",
    model: "gemini-2.5-flash",
    status: savedKey ? "Custom Key Configured" : "Using System Default (Recommended)",
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Configure your custom Google Gemini API key for document processing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">Gemini API Key</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Gemini API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-grow"
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 sm:flex-none flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save
                </Button>
                {savedKey && (
                  <Button onClick={handleClear} variant="outline" className="flex-1 sm:flex-none">
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Your key is stored locally in your browser. Leave blank to use the system's default key.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Details
          </CardTitle>
          <CardDescription>
            Current AI model and provider information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Cpu className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Provider</p>
                <p className="text-sm text-muted-foreground">{aiDetails.provider}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Bot className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Model</p>
                <p className="text-sm text-muted-foreground">{aiDetails.model}</p>
              </div>
            </div>
            <div className="sm:col-span-2 flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Key className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">API Status</p>
                <p className="text-sm text-muted-foreground">{aiDetails.status}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
