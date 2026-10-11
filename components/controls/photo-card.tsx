/** A small landscape "photo", drawn inline for decorative illustrations (homepage, footer). */
export function PhotoCard({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true">
      <rect width="120" height="90" rx="8" fill="#ffffff" />
      <rect x="5" y="5" width="110" height="80" rx="5" fill="#dbeafe" />
      <circle cx="88" cy="24" r="8" fill="#ffffff" />
      <path d="M5 70l28-32 18 18 14-14 50 46v-3a5 5 0 01-5 5H10a5 5 0 01-5-5z" fill="#60a5fa" />
      <path d="M5 74l28-22 22 18 12-9 48 21v3a5 5 0 01-5 5H10a5 5 0 01-5-5z" fill="#2563eb" />
    </svg>
  );
}
