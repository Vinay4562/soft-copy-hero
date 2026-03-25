import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentPage: number;
  totalPages: number;
}

export function useDocumentProcessor() {
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentPage: 0,
    totalPages: 0,
  });
  const [extractedText, setExtractedText] = useState('');

  const processDocument = useCallback(async (file: File) => {
    setState({
      isProcessing: true,
      progress: 0,
      currentPage: 0,
      totalPages: 1,
    });
    setExtractedText('');

    try {
      toast.info('Processing document...');
      
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      setState(prev => ({
        ...prev,
        currentPage: 1,
        progress: 50,
      }));
      
      const storedKey = localStorage.getItem("GEMINI_API_KEY");
      const customApiKey = (storedKey && storedKey.trim().length > 5) ? storedKey.trim() : undefined;
      
      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type || 'application/pdf',
          customApiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Processing error:', data.error);
        const status = response.status;
        const errorObj = data.error || {};
        const message = (typeof errorObj === 'string' ? errorObj : errorObj.message) || "";
        
        if (status === 429 || (typeof message === 'string' && (message.includes('429') || message.includes('limit reached')))) {
          throw new Error("LIMIT_REACHED");
        }
        if (status === 401 || status === 403 || (typeof message === 'string' && (message.includes('401') || message.includes('403') || message.includes('API key not valid') || message.includes('API Key not found')))) {
          throw new Error("INVALID_KEY");
        }
        throw new Error(message || 'Failed to process document');
      }

      setState(prev => ({ ...prev, progress: 100 }));

      if (data?.text) {
        setExtractedText(data.text);
        toast.success('Document processed successfully!');
      } else {
        toast.warning('No text could be extracted from the document.');
      }
      
    } catch (error) {
      console.error('Document processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : "";
      
      if (errorMessage === "LIMIT_REACHED") {
        toast.error("Gemini API limit reached. Please update your API key in Settings.", {
          duration: 10000,
          action: {
            label: "Settings",
            onClick: () => window.dispatchEvent(new CustomEvent('switch-to-settings-tab'))
          }
        });
      } else if (errorMessage === "INVALID_KEY") {
        toast.error("Invalid Gemini API key. Please check your settings.", {
          duration: 10000,
          action: {
            label: "Settings",
            onClick: () => window.dispatchEvent(new CustomEvent('switch-to-settings-tab'))
          }
        });
      } else {
        toast.error(errorMessage || 'Failed to process document');
      }
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, []);

  const clearText = useCallback(() => {
    setExtractedText('');
    setState({
      isProcessing: false,
      progress: 0,
      currentPage: 0,
      totalPages: 0,
    });
  }, []);

  return {
    ...state,
    extractedText,
    setExtractedText,
    processDocument,
    clearText,
  };
}
