/**
 * Soft icon tints used on the homepage and in the footer. Blue stays the brand
 * colour for actions; these only help tell icons apart at a glance.
 */
export const TINTS = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  violet: "bg-violet-50 text-violet-600",
  rose: "bg-rose-50 text-rose-600",
  teal: "bg-teal-50 text-teal-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
} as const;

export type Tint = keyof typeof TINTS;
