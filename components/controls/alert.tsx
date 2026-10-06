type Tone = "error" | "warning" | "success" | "info";

const styles: Record<Tone, string> = {
  error: "border-danger/30 bg-danger-soft text-danger",
  warning: "border-warning/30 bg-warning-soft text-warning",
  success: "border-success/30 bg-success-soft text-success",
  info: "border-line bg-surface text-ink-soft",
};

const labels: Record<Tone, string> = {
  error: "Error",
  warning: "Note",
  success: "Done",
  info: "Info",
};

/**
 * Status message. State is conveyed by an icon and a text label as well as
 * colour, and errors are announced to screen readers.
 */
export function Alert({ tone, title, children }: { tone: Tone; title?: string; children?: React.ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-md border px-4 py-3 text-sm ${styles[tone]}`}>
      <AlertIcon tone={tone} />
      <div className="min-w-0 leading-relaxed">
        <p className="font-semibold">
          <span className="sr-only">{labels[tone]}: </span>
          {title ?? labels[tone]}
        </p>
        {children ? <div className="mt-0.5 text-ink-soft">{children}</div> : null}
      </div>
    </div>
  );
}

function AlertIcon({ tone }: { tone: Tone }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    "aria-hidden": true,
    className: "mt-0.5 shrink-0",
  };
  if (tone === "success") {
    return (
      <svg {...props}>
        <circle cx="9" cy="9" r="7.5" />
        <path d="M5.5 9.2l2.3 2.3 4.7-4.8" />
      </svg>
    );
  }
  if (tone === "info") {
    return (
      <svg {...props}>
        <circle cx="9" cy="9" r="7.5" />
        <path d="M9 8v4.5M9 5.5v.01" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M9 2l7.5 13h-15z" strokeLinejoin="round" />
      <path d="M9 7v3.5M9 12.8v.01" />
    </svg>
  );
}
