"use client";

import { useId } from "react";

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
      {children}
    </label>
  );
}

export function Fieldset({ legend, children, hint }: { legend: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </fieldset>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** Radio group styled as a segmented control. Uses native radios for keyboard and screen-reader support. */
export function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
  hint,
}: {
  legend: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  hint?: React.ReactNode;
}) {
  const name = useId();
  return (
    <Fieldset legend={legend} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`relative inline-flex min-h-10 cursor-pointer items-center rounded-md border px-3.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
              value === option.value
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-line-strong bg-canvas text-ink-soft hover:bg-surface"
            } ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {value === option.value ? (
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="mr-1.5">
                <path d="M3 7.2l2.6 2.6L11 4.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : null}
            {option.label}
          </label>
        ))}
      </div>
    </Fieldset>
  );
}

/** Quality slider. Value is 0–1; shown to users as a percentage. */
export function QualitySlider({
  value,
  onChange,
  label = "Quality",
  min = 0.1,
  max = 1,
  hint,
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  hint?: React.ReactNode;
}) {
  const id = useId();
  const percent = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <output htmlFor={id} className="font-mono text-sm tabular-nums text-ink">
          {percent}%
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={Math.round(min * 100)}
        max={Math.round(max * 100)}
        step={1}
        value={percent}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        aria-valuetext={`${percent} percent`}
        className="mt-2 h-2 w-full cursor-pointer accent-[var(--color-accent)]"
      />
      <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden="true">
        <span>Smaller file</span>
        <span>Higher quality</span>
      </div>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  description?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--color-accent)]"
        aria-describedby={description ? `${id}-desc` : undefined}
      />
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-ink">
          {children}
        </label>
        {description ? (
          <p id={`${id}-desc`} className="mt-0.5 text-xs leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const inputClass =
  "block min-h-11 w-full rounded-md border border-line-strong bg-canvas px-3 text-base text-ink tabular-nums placeholder:text-muted focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-accent aria-[invalid=true]:border-danger";
