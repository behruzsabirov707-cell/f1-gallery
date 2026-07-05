import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function ServicesCtaCard({
  title,
  description,
  ctaLabel,
  href,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-4 rounded-xl border border-(--color-brand-to)/30 bg-gradient-to-br from-(--color-brand-from)/15 to-(--color-brand-to)/15 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-(--color-brand-to)/60 hover:shadow-[0_20px_50px_-24px_rgba(63,160,245,0.35)]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-tr-2xl rounded-bl-2xl rounded-tl-md rounded-br-md border border-(--color-brand-to)/40 bg-(--color-bg-elevated) transition-transform duration-300 group-hover:scale-110">
        <ArrowUpRight
          className="h-5 w-5 text-(--color-brand-to)"
          strokeWidth={1.75}
        />
      </span>
      <h3 className="text-lg font-semibold text-(--color-ink)">{title}</h3>
      <p className="text-sm text-(--color-ink-muted)">{description}</p>
      <span className="mt-auto flex items-center gap-1.5 text-sm font-medium text-(--color-brand-to) transition-transform duration-300 group-hover:translate-x-1">
        {ctaLabel} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
