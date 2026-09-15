import { z } from 'zod';

export const materialCodes = ['PLA', 'PETG', 'ABS', 'RESINA'] as const;
export type MaterialCode = (typeof materialCodes)[number];

export const layerHeights = [0.2, 0.12, 0.08] as const;
export type LayerHeightMm = (typeof layerHeights)[number];

export const allowedModelExtensions = ['.stl', '.3mf', '.obj', '.step'] as const;

export const MAX_MODEL_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB

export const QUOTE_BASE_PRICE = 58;
export const PIX_DISCOUNT_RATE = 0.1;
export const MAX_INSTALLMENTS = 10;

export const quoteRequestSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  material: z.enum(materialCodes),
  layerHeight: z.union([z.literal(0.2), z.literal(0.12), z.literal(0.08)]),
  colorId: z.string().min(1),
  quantity: z.number().int().min(1).max(999),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export interface QuotePriceBreakdown {
  basePrice: number;
  materialMultiplier: number;
  layerHeightMultiplier: number;
  quantity: number;
  subtotal: number;
  pixDiscount: number;
  totalPix: number;
  totalCard: number;
  installments: number;
}

export function calculateQuotePrice(
  materialMultiplier: number,
  layerHeightMultiplier: number,
  quantity: number,
): QuotePriceBreakdown {
  const subtotal = QUOTE_BASE_PRICE * materialMultiplier * layerHeightMultiplier * quantity;
  const pixDiscount = subtotal * PIX_DISCOUNT_RATE;

  return {
    basePrice: QUOTE_BASE_PRICE,
    materialMultiplier,
    layerHeightMultiplier,
    quantity,
    subtotal: round2(subtotal),
    pixDiscount: round2(pixDiscount),
    totalPix: round2(subtotal - pixDiscount),
    totalCard: round2(subtotal),
    installments: MAX_INSTALLMENTS,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
