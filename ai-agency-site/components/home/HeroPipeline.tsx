const nodeDelays = ["0s", "1.1s", "2.2s", "3.3s"];

export default function HeroPipeline({
  labels,
}: {
  labels: readonly string[];
}) {
  return (
    <div
      aria-hidden="true"
      className="relative mt-4 flex w-full max-w-2xl flex-col items-stretch gap-6 sm:flex-row sm:items-center sm:gap-0"
    >
      <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-(--color-wire) sm:block">
        <span className="pipeline-packet absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-(--color-signal) shadow-[0_0_8px_2px_rgba(255,157,66,0.6)]" />
      </div>
      {labels.map((label, i) => (
        <div
          key={label}
          className="relative flex flex-1 flex-col items-center gap-2"
        >
          <span
            style={{ animationDelay: nodeDelays[i] }}
            className="pipeline-node flex h-12 w-12 items-center justify-center rounded-full border border-(--color-border) bg-(--color-bg-elevated) font-(family-name:--font-mono) text-xs text-(--color-ink-muted)"
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="font-(family-name:--font-mono) text-[11px] uppercase tracking-wide text-(--color-ink-muted)">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
