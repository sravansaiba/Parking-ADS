import { View, Alert, UIManager, findNodeHandle, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";

/* ============================
   TYPE DEFINITIONS
   ============================ */
export interface TenantDescription {
  heading: string;
  points: string[];
  footer: string;
}

export interface QRCardData {
  code: string;
  label: string;
  tenant: { name: string; description: TenantDescription };
  language: "en" | "hi" | "te";
}

interface DownloadOptions {
  showSuccessAlert?: boolean;
  customSuccessMessage?: string;
}

interface PdfGenerationOptions {
  pageSize?: "A4" | "Letter";
  margin?: number;
  orientation?: "portrait" | "landscape";
}

/* ============================
   CONSTANTS
   ============================ */
const DOCUMENT_DIR = (FileSystem as any).documentDirectory ?? (FileSystem as any).cacheDirectory ?? "";
const DEFAULT_DELAY_MS = 150;
const CAPTURE_QUALITY = 0.95;
const MAX_RETRIES = 3;

/* ============================
   UTILITY FUNCTIONS
   ============================ */
const sleep = (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms));

const safeFilename = (name: string): string => {
  return name.replace(/[^a-z0-9_\-\.]/gi, "_").substring(0, 200);
};

const ensureFileUri = (path: string): string => {
  return path.startsWith("file://") ? path : `file://${path}`;
};

const getTimestamp = (): string => {
  return new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
};

/* ============================
   PLATFORM-SPECIFIC SAVE LOGIC
   ============================ */
class FileDownloader {
  /**
   * Save file directly to device storage (Android 10+)
   * Uses Storage Access Framework for user-friendly Downloads folder
   */
  private static async saveAndroid(fileUri: string, fileName: string, mimeType: string): Promise<void> {
    try {
      const SAF = (FileSystem as any).StorageAccessFramework;
      
      if (!SAF) {
        console.warn("StorageAccessFramework unavailable - falling back to share");
        await Sharing.shareAsync(fileUri, { mimeType, UTI: mimeType });
        return;
      }

      // Request directory permissions (user selects Downloads folder)
      const permissions = await SAF.requestDirectoryPermissionsAsync();

      if (!permissions.granted) {
        console.log("User denied storage permission - using share dialog");
        await Sharing.shareAsync(fileUri, { mimeType, UTI: mimeType });
        return;
      }

      // Read file as base64
      const base64Content = await FileSystem.readAsStringAsync(fileUri, { 
        encoding: FileSystem.EncodingType.Base64 
      });

      // Create file in selected directory
      const newFileUri = await SAF.createFileAsync(
        permissions.directoryUri,
        fileName,
        mimeType
      );

      // Write content
      await FileSystem.writeAsStringAsync(newFileUri, base64Content, { 
        encoding: FileSystem.EncodingType.Base64 
      });

      Alert.alert(
        "✅ Download Complete", 
        `File saved successfully:\n${fileName}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Android save error:", error);
      // Fallback to share dialog
      await Sharing.shareAsync(fileUri, { mimeType, UTI: mimeType });
    }
  }

  /**
   * Save file to iOS Documents folder (accessible via Files app)
   */
  private static async saveIOS(fileUri: string, fileName: string, mimeType: string): Promise<string> {
    try {
      const documentDir = (FileSystem as any).documentDirectory;
      
      if (!documentDir) {
        throw new Error("Document directory not available");
      }

      const targetPath = `${documentDir}${fileName}`;

      // Copy file to Documents
      await FileSystem.copyAsync({
        from: fileUri,
        to: targetPath
      });

      Alert.alert(
        "✅ Download Complete",
        `File saved to Files app:\n${fileName}`,
        [{ text: "OK" }]
      );

      return targetPath;
    } catch (error) {
      console.error("iOS save error:", error);
      // Fallback to share dialog
      await Sharing.shareAsync(fileUri, { mimeType, UTI: mimeType });
      return fileUri;
    }
  }

  /**
   * Universal save method - automatically handles platform differences
   */
  static async save(
    fileUri: string, 
    fileName: string, 
    mimeType: string,
    options: DownloadOptions = {}
  ): Promise<string> {
    const safeFileName = safeFilename(fileName);

    if (Platform.OS === "android") {
      await this.saveAndroid(fileUri, safeFileName, mimeType);
      return fileUri;
    }

    if (Platform.OS === "ios") {
      return await this.saveIOS(fileUri, safeFileName, mimeType);
    }

    // Fallback for other platforms
    await Sharing.shareAsync(fileUri, { mimeType, UTI: mimeType });
    return fileUri;
  }
}

/* ============================
   IMAGE CAPTURE & GENERATION
   ============================ */
export class CardImageGenerator {
  /**
   * Measure view to ensure it's ready before capture
   */
  private static async waitForViewReady(
    target: View,
    timeoutMs: number = 3000
  ): Promise<{ width: number; height: number }> {
    const start = Date.now();
    
    while (Date.now() - start < timeoutMs) {
      try {
        const node = findNodeHandle(target);
        if (!node) {
          await sleep(100);
          continue;
        }

        const measured: { width: number; height: number } = await new Promise((resolve) => {
          UIManager.measure(node, (_x: number, _y: number, width: number, height: number) => {
            resolve({ width, height });
          });
        });

        if (measured && measured.width > 0 && measured.height > 0) {
          console.log(`View ready: ${measured.width}x${measured.height}`);
          return measured;
        }
      } catch (error) {
        console.warn("Measurement attempt failed:", error);
      }
      
      await sleep(100);
    }
    
    throw new Error("View did not render in time");
  }

  /**
   * Capture a view as PNG image with retry logic
   */
  static async captureView(
    viewRef: React.RefObject<View> | View | null,
    retries: number = MAX_RETRIES
  ): Promise<string> {
    const target = viewRef && "current" in viewRef ? viewRef.current : viewRef;

    if (!target) {
      throw new Error("View reference is not available");
    }

    // Wait for view to be fully rendered and measured
    try {
      await this.waitForViewReady(target, 3000);
    } catch (error) {
      console.error("View not ready:", error);
      // Continue anyway, but with longer delay
      await sleep(500);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt + 1}/${retries + 1}`);
          await sleep(500 * attempt); // Exponential backoff
        }

        // Extra delay to ensure rendering
        await sleep(300);

        const uri = await captureRef(target, {
          format: "png",
          quality: CAPTURE_QUALITY,
          result: "tmpfile",
          width: undefined, // Let it use natural dimensions
          height: undefined,
        });

        if (!uri) {
          throw new Error("Capture returned empty URI");
        }

        console.log("Capture successful:", uri);
        return uri;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Capture attempt ${attempt + 1} failed:`, error);
      }
    }

    throw lastError || new Error("Failed to capture view");
  }

  /**
   * Capture multiple views with progress tracking
   */
  static async captureMultiple(
    inputs: Array<{ id: string; ref: React.RefObject<View> | View | null }>,
    onProgress?: (current: number, total: number, id: string) => void
  ): Promise<Array<{ id: string; uri: string }>> {
    const results: Array<{ id: string; uri: string }> = [];

    for (let i = 0; i < inputs.length; i++) {
      const { id, ref } = inputs[i];

      try {
        if (i > 0) {
          await sleep(300); // Prevent overwhelming the system
        }

        const uri = await this.captureView(ref);
        results.push({ id, uri });

        onProgress?.(i + 1, inputs.length, id);
      } catch (error) {
        console.error(`Failed to capture card ${id}:`, error);
        // Continue with other cards
      }
    }

    return results;
  }
}

/* ============================
   PDF GENERATION
   ============================ */
export class PdfGenerator {
  /**
   * Generate PDF from multiple images
   */
  static async fromImages(
    imagePaths: string[],
    baseName: string = "parking_cards",
    options: PdfGenerationOptions = {}
  ): Promise<string> {
    try {
      const validPaths = imagePaths
        .filter(path => path && path.length > 0)
        .map(ensureFileUri);

      if (validPaths.length === 0) {
        throw new Error("No valid image paths provided");
      }

      const html = this.generateHtml(validPaths, options);
      const { uri } = await Print.printToFileAsync({ html });

      return uri;
    } catch (error) {
      console.error("PDF generation error:", error);
      throw new Error(`Failed to generate PDF: ${(error as Error).message}`);
    }
  }

  /**
   * Generate HTML for PDF with images
   */
  private static generateHtml(
    imagePaths: string[],
    options: PdfGenerationOptions
  ): string {
    const { pageSize = "A4", margin = 0, orientation = "portrait" } = options;

    const imageElements = imagePaths.map((path, index) => `
      <div class="page" ${index < imagePaths.length - 1 ? 'style="page-break-after: always;"' : ''}>
        <img src="${path}" alt="QR Card ${index + 1}" />
      </div>
    `).join("\n");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page {
              size: ${pageSize} ${orientation};
              margin: ${margin}mm;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
            }
            
            .page {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              width: 100vw;
              margin: 0;
              padding: 0;
            }
            
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>
        <body>
          ${imageElements}
        </body>
      </html>
    `;
  }

  /**
   * Generate single-page PDF from one image
   */
  static async fromSingleImage(
    imagePath: string,
    fileName: string = "qr_card"
  ): Promise<string> {
    return this.fromImages([imagePath], fileName, { pageSize: "A4" });
  }
}

/* ============================
   PUBLIC API - HIGH-LEVEL FUNCTIONS
   ============================ */

/**
 * ✅ Download single card as PDF
 */
export async function downloadSingleCardAsPDF(
  viewRef: React.RefObject<View> | View | null,
  fileName: string
): Promise<void> {
  try {
    // 1. Capture the view as image
    const imageUri = await CardImageGenerator.captureView(viewRef);

    // 2. Convert to PDF
    const pdfUri = await PdfGenerator.fromSingleImage(imageUri, fileName);

    // 3. Save to device
    const safeName = `${safeFilename(fileName)}_${getTimestamp()}.pdf`;
    await FileDownloader.save(pdfUri, safeName, "application/pdf");

  } catch (error) {
    console.error("Single card PDF download error:", error);
    Alert.alert("Download Failed", "Could not download the QR card as PDF");
    throw error;
  }
}

/**
 * ✅ Download multiple cards as single PDF
 */
export async function downloadMultipleCardsAsPDF(
  cards: Array<{ id: string; ref: React.RefObject<View> | View | null }>,
  fileName: string = "parking_cards",
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  try {
    // 1. Capture all cards as images
    const captured = await CardImageGenerator.captureMultiple(
      cards,
      (current, total, id) => {
        onProgress?.(current, total);
      }
    );

    if (captured.length === 0) {
      throw new Error("No cards were captured successfully");
    }

    // 2. Generate PDF from images
    const imagePaths = captured.map(c => c.uri);
    const pdfUri = await PdfGenerator.fromImages(imagePaths, fileName);

    // 3. Save to device
    const safeName = `${safeFilename(fileName)}_${getTimestamp()}.pdf`;
    await FileDownloader.save(pdfUri, safeName, "application/pdf");

  } catch (error) {
    console.error("Multiple cards PDF download error:", error);
    Alert.alert("Download Failed", "Could not download all QR cards as PDF");
    throw error;
  }
}

/**
 * ✅ Legacy function - kept for backward compatibility
 */
export async function generateCardImage(
  viewRef: React.RefObject<View> | View | null,
  _cardData: QRCardData
): Promise<string> {
  return CardImageGenerator.captureView(viewRef);
}

/**
 * ✅ Legacy function - kept for backward compatibility
 */
export async function generatePDFFromCards(
  imagePaths: string[],
  baseName: string = "parking_cards"
): Promise<string> {
  return PdfGenerator.fromImages(imagePaths, baseName);
}

/**
 * ✅ Legacy function - refactored for direct download
 */
export async function downloadSingleCard(uri: string, filename: string): Promise<string> {
  const safeName = `${safeFilename(filename)}_${getTimestamp()}.png`;
  return FileDownloader.save(uri, safeName, "image/png");
}

/**
 * ✅ Legacy function - refactored for direct PDF download
 */
export async function downloadMultipleCards(params: {
  filePaths: string[];
  zipIfPossible?: boolean;
  zipName?: string;
}): Promise<string> {
  const { filePaths, zipName = "parking_cards" } = params;
  
  if (!filePaths || filePaths.length === 0) {
    throw new Error("No files provided");
  }

  const pdfUri = await PdfGenerator.fromImages(filePaths, zipName);
  const safeName = `${safeFilename(zipName)}_${getTimestamp()}.pdf`;
  
  await FileDownloader.save(pdfUri, safeName, "application/pdf");
  
  return pdfUri;
}

/* ============================
   UTILITY EXPORTS
   ============================ */
export function generateCardDataBulk(
  startRange: number,
  endRange: number,
  tenant: { name: string; description: TenantDescription },
  language: "en" | "hi" | "te" = "en"
): QRCardData[] {
  const cards: QRCardData[] = [];
  for (let i = startRange; i <= endRange; i++) {
    cards.push({
      code: `#${i.toString().padStart(13, "0")}`,
      label: `Card ${i}`,
      tenant,
      language,
    });
  }
  return cards;
}

export function formatCardCode(n: number): string {
  return `#${n.toString().padStart(13, "0")}`;
}

export function parseCardCode(code: string): number {
  return parseInt(code.replace("#", ""), 10);
}

export default {
  // New class-based API
  CardImageGenerator,
  PdfGenerator,
  FileDownloader,
  
  // High-level functions
  downloadSingleCardAsPDF,
  downloadMultipleCardsAsPDF,
  
  // Legacy API (backward compatible)
  generateCardImage,
  downloadSingleCard,
  downloadMultipleCards,
  generatePDFFromCards,
  
  // Utilities
  generateCardDataBulk,
  formatCardCode,
  parseCardCode,
};