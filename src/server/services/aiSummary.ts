import { GoogleGenAI, Type, type GenerateContentResponse } from '@google/genai';
import { AI_SUMMARY_DISCLAIMER } from '../../shared/constants.ts';
import type { StructuredAiSummary } from '../../db/schema.ts';

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

export interface SummarySourceInput {
  sourceText: string;
  recordTitle?: string | null;
  category?: string | null;
  workerAllergies?: string | null;
  workerChronicConditions?: string | null;
}

export async function generateStructuredHealthSummary(
  input: SummarySourceInput
): Promise<StructuredAiSummary> {
  const ai = getGeminiClient();
  const modelName = 'gemini-4-hydrogen';

  const systemInstruction = `You are a strict clinical information structuring assistant for CareBridge, a digital health record platform for migrant workers in Kerala.
Your ONLY role is to organize facts explicitly written in the provided medical text into structured JSON fields.
MANDATORY SAFETY RULES:
1. NEVER independently diagnose or infer a medical condition not explicitly stated in the text.
2. NEVER prescribe, recommend, or modify medications or treatments.
3. NEVER invent, estimate, or fill in missing lab values, dosages, or dates.
4. Populate "explicitDiagnosis" ONLY with diagnoses literally written in the source text. If none are explicitly stated, return an empty array.
5. Clearly report any illegible parts, missing dates, missing dosages, or incomplete clinical fields inside "missingOrUncertainInfo".
6. Keep phrasing clear, neutral, factual, and easy to review by a qualified healthcare professional.`;

  const prompt = `Analyze the following medical record/document text and produce a structured clinical summary JSON.

Record Title: ${input.recordTitle || 'Not provided'}
Record Category: ${input.category || 'Not provided'}
Worker Profile Context (only include in allergies/chronicConditions if relevant or noted):
- Known Allergies on Profile: ${input.workerAllergies || 'None recorded'}
- Known Chronic Conditions on Profile: ${input.workerChronicConditions || 'None recorded'}

--- SOURCE MEDICAL TEXT ---
${input.sourceText}
--- END SOURCE TEXT ---`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mainObservations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Key clinical observations explicitly present in the source text.',
          },
          explicitDiagnosis: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Diagnoses ONLY if explicitly written in the source document. Never infer.',
          },
          medicinesMentioned: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Medicines, dosages, or schedules explicitly mentioned in the source text.',
          },
          laboratoryValues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                test: { type: Type.STRING },
                value: { type: Type.STRING },
                unit: { type: Type.STRING },
                referenceRange: { type: Type.STRING },
              },
              required: ['test', 'value'],
            },
            description: 'Exact laboratory or vital measurements written in the source text.',
          },
          allergies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Allergies mentioned in the text or noted on profile.',
          },
          chronicConditions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Chronic conditions explicitly mentioned in the text or noted on profile.',
          },
          dates: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Clinical visit, test, or follow-up dates mentioned in the source text.',
          },
          missingOrUncertainInfo: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Any illegible markings, missing dates, unstated diagnoses, or incomplete details.',
          },
        },
        required: [
          'mainObservations',
          'explicitDiagnosis',
          'medicinesMentioned',
          'laboratoryValues',
          'allergies',
          'chronicConditions',
          'dates',
          'missingOrUncertainInfo',
        ],
      },
    },
  });

  const rawJson = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawJson) as Partial<StructuredAiSummary>;

  return {
    mainObservations: Array.isArray(parsed.mainObservations) ? parsed.mainObservations : [],
    explicitDiagnosis: Array.isArray(parsed.explicitDiagnosis) ? parsed.explicitDiagnosis : [],
    medicinesMentioned: Array.isArray(parsed.medicinesMentioned) ? parsed.medicinesMentioned : [],
    laboratoryValues: Array.isArray(parsed.laboratoryValues) ? parsed.laboratoryValues : [],
    allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
    chronicConditions: Array.isArray(parsed.chronicConditions) ? parsed.chronicConditions : [],
    dates: Array.isArray(parsed.dates) ? parsed.dates : [],
    missingOrUncertainInfo: Array.isArray(parsed.missingOrUncertainInfo)
      ? parsed.missingOrUncertainInfo
      : [],
    disclaimer: AI_SUMMARY_DISCLAIMER,
    generatedAt: new Date().toISOString(),
    modelUsed: modelName,
  };
}
