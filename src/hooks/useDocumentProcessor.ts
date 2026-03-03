import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: {
          imageBase64: base64,
          mimeType: 'application/pdf',
        },
      });

      if (error) {
        console.error('Processing error:', error);
        throw new Error(error.message || 'Failed to process document');
      }

      if (data?.error) {
        throw new Error(data.error);
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
      toast.error(error instanceof Error ? error.message : 'Failed to process document');
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
