import { Bot } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

export default function Portfolio({ dict }: { dict: Dictionary }) {
  const { portfolio } = dict.home;

  return (
    <section id="portfolio" className="py-24">
      <Container className="flex flex-col gap-10">
        <Reveal>
          <SectionHeading
            eyebrow={portfolio.eyebrow}
            title={portfolio.title}
            description={portfolio.description}
          />
        </Reveal>

        <Reveal
          delay={0.1}
          className="flex flex-col gap-6 rounded-xl border border-(--color-signal)/30 bg-(--color-signal)/10 p-8 sm:flex-row sm:items-center"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-2xl rounded-tl-md rounded-br-md border border-(--color-signal)/40 bg-(--color-bg-elevated)">
            <Bot className="h-6 w-6 text-(--color-signal)" strokeWidth={1.75} />
          </span>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-(--color-ink)">
              {portfolio.flagship.title}
            </h3>
            <p className="text-sm text-(--color-ink-muted)">
              {portfolio.flagship.description}
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-3">
          {portfolio.metrics.map((metric, i) => (
            <Reveal
              key={metric.label}
              delay={0.15 + i * 0.08}
              className="flex flex-col gap-2 rounded-xl border border-(--color-border) bg-(--color-bg-elevated)/60 p-6"
            >
              <span className="font-(family-name:--font-display) text-4xl italic text-(--color-brand-to)">
                {metric.value}
              </span>
              <p className="text-sm text-(--color-ink-muted)">{metric.label}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
