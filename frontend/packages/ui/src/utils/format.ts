export function money(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Alias for money(), used by pdf-generator.ts */
export const formatCurrency = money;

export function shortDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
