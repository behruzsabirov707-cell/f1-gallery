import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";
import type { ServiceTool } from "@/data/services";

export default function ServiceCard({
  icon: Icon,
  title,
  description,
  href,
  ctaLabel,
  tools,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  tools: ServiceTool[];
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-bg-elevated) p-6 transition-all duration-300 hover:-translate-y-1 hover:border-(--color-signal)/40 hover:shadow-[0_20px_50px_-24px_rgba(255,157,66,0.35)]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-tr-2xl rounded-bl-2xl rounded-tl-md rounded-br-md bg-(--color-signal) transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-5 w-5 text-(--color-bg)" strokeWidth={1.75} />
      </span>
      <h3 className="text-lg font-semibold text-(--color-ink)">{title}</h3>
      <p className="text-sm text-(--color-ink-muted)">{description}</p>
      <div className="flex items-center gap-3">
        {tools.map((tool) => {
          const ToolIcon = tool.icon as IconType;
          return (
            <ToolIcon
              key={tool.label}
              title={tool.label}
              className="h-4 w-4 text-(--color-ink-muted) transition-colors duration-300 group-hover:text-(--color-signal)"
            />
          );
        })}
      </div>
      <span className="mt-auto flex items-center gap-1.5 text-sm font-medium text-(--color-signal) transition-transform duration-300 group-hover:translate-x-1">
        {ctaLabel} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
