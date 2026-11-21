import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';

export interface OcrExtractionResult {
  engine: string;
  extractedText: string;
}

export interface OcrProvider {
  readonly name: string;
  extractText(buffer: Buffer, mimeType: string, fileName: string): Promise<OcrExtractionResult>;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

class GeminiMultimodalOcrProvider implements OcrProvider {
  readonly name = 'gemini-multimodal';

  async extractText(
    buffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<OcrExtractionResult> {
    const ai = getGeminiClient();
    const normalizedMime = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;

    const documentPart = {
      inlineData: {
        mimeType: normalizedMime,
        data: buffer.toString('base64'),
      },
    };

    const promptPart = {
      text: `You are an accurate clinical OCR transcription engine processing an uploaded medical document (${fileName}).
Extract ALL readable text from this document verbatim, preserving section structure, dates, hospital/clinic names, doctor names, medication dosages, and laboratory measurements.
STRICT RULES:
1. Preserve original languages/scripts (English, Malayalam, Hindi, Bengali) if present.
2. NEVER fabricate, guess, or autocomplete unreadable or smudged medical values, dosages, or lab numbers.
3. Mark any unreadable or blurred text strictly as [illegible].
4. Do NOT add medical advice, diagnoses, or commentary outside the transcribed document text.
Return only the clean transcribed text.`,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts: [documentPart, promptPart] },
    });

    const extractedText = (response.text ?? '').trim();
    if (!extractedText) {
      throw new Error('OCR engine could not detect readable text in this document.');
    }

    return {
      engine: this.name,
      extractedText,
    };
  }
}

/**
 * Pluggable external OCR adapter (e.g., Python EasyOCR microservice).
 * Enable via OCR_PROVIDER=external_python and EXTERNAL_OCR_URL=https://...
 */
class ExternalPythonOcrProvider implements OcrProvider {
  readonly name = 'external-python-ocr';

  async extractText(
    buffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<OcrExtractionResult> {
    const endpoint = process.env.EXTERNAL_OCR_URL?.trim();
    if (!endpoint) {
      throw new Error('EXTERNAL_OCR_URL is not configured for external OCR provider.');
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        mimeType,
        fileBase64: buffer.toString('base64'),
      }),
    });

    if (!res.ok) {
      throw new Error(`External OCR service returned status ${res.status}`);
    }

    const data = (await res.json()) as { text?: string };
    return {
      engine: this.name,
      extractedText: (data.text || '').trim(),
    };
  }
}

export function getOcrProvider(): OcrProvider {
  const provider = (process.env.OCR_PROVIDER || '').trim().toLowerCase();
  if ((provider === 'easyocr' || provider === 'external_python') && process.env.EXTERNAL_OCR_URL?.trim()) {
    return new ExternalPythonOcrProvider();
  }
  return new GeminiMultimodalOcrProvider();
}
