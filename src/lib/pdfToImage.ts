// PDF to image conversion using a lighter approach
// For browser compatibility, we'll use an embedded PDF viewer approach

export interface PageImage {
  pageNumber: number;
  imageData: string;
  width: number;
  height: number;
}

export async function convertPdfToImages(file: File): Promise<PageImage[]> {
  // Convert PDF file to base64 for processing
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  );
  
  // Return as a single "page" with the full PDF base64
  // The AI model can process the PDF directly
  return [{
    pageNumber: 1,
    imageData: base64,
    width: 0,
    height: 0,
  }];
}

export async function getPdfPageCount(_file: File): Promise<number> {
  // Without PDF.js, we can't easily count pages
  // Return 1 as we'll process the whole document
  return 1;
}
