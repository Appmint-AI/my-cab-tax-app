import { ai } from "./replit_integrations/image/client";

export interface ReceiptOcrResult {
  merchantName: string;
  date: string;
  totalAmount: number | null;
  confidence: number;
  rawText: string;
  items: Array<{ description: string; amount: number }>;
}

export async function scanReceiptWithAI(imageBuffer: Buffer, mimeType: string): Promise<ReceiptOcrResult> {
  const base64 = imageBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: base64,
              mimeType: mimeType || "image/jpeg",
            },
          },
          {
            text: `You are an expert receipt OCR system. Analyze this receipt image and extract the following information.

Return ONLY a valid JSON object with exactly these fields (no markdown, no code blocks, no explanation):
{
  "merchantName": "string - the store/business name",
  "date": "string - receipt date in YYYY-MM-DD format, or empty string if not found",
  "totalAmount": number or null - the total/grand total amount as a decimal number,
  "confidence": number - your confidence in the extraction accuracy from 0-100,
  "rawText": "string - all readable text from the receipt",
  "items": [{"description": "string", "amount": number}] - individual line items if visible
}

Important rules:
- For totalAmount, look for "Total", "Grand Total", "Amount Due", "Balance" labels
- If multiple totals exist, use the largest one (usually the grand total)
- Dates should be converted to YYYY-MM-DD format
- confidence should reflect how clearly you can read the receipt
- If you cannot determine a field, use empty string for strings or null for numbers
- Do NOT include tax-only amounts as the total`,
          },
        ],
      },
    ],
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      merchantName: String(parsed.merchantName || ""),
      date: String(parsed.date || ""),
      totalAmount: parsed.totalAmount != null ? Number(parsed.totalAmount) : null,
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
      rawText: String(parsed.rawText || ""),
      items: Array.isArray(parsed.items) ? parsed.items.map((item: any) => ({
        description: String(item.description || ""),
        amount: Number(item.amount) || 0,
      })) : [],
    };
  } catch (parseError) {
    console.error("Failed to parse Gemini OCR response:", text);
    return {
      merchantName: "",
      date: "",
      totalAmount: null,
      confidence: 0,
      rawText: text,
      items: [],
    };
  }
}
