import { Code2, Globe2, LifeBuoy } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

// Bir ikonka bir punktga mos keladi — dictionarylardagi whyUs.points har doim 3 ta.
const pointIcons = [Code2, Globe2, LifeBuoy] as const;

export default function WhyUs({ dict }: { dict: Dictionary }) {
  const { whyUs } = dict.home;

  return (
    <section id="why-us" className="relative overflow-hidden py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-(--color-signal)/10 blur-[110px]"
      />
      <Container className="relative flex flex-col gap-12">
        <Reveal>
          <SectionHeading eyebrow={whyUs.eyebrow} title={whyUs.title} />
        </Reveal>
        <div className="grid gap-8 sm:grid-cols-3">
          {whyUs.points.map((point, i) => {
            const Icon = pointIcons[i];
            return (
              <Reveal
                key={point.title}
                delay={i * 0.08}
                className="flex flex-col gap-3 rounded-xl border border-(--color-border) bg-(--color-bg-elevated)/60 p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-tr-2xl rounded-bl-2xl rounded-tl-md rounded-br-md bg-(--color-signal)">
                  {Icon && (
                    <Icon
                      className="h-5 w-5 text-(--color-bg)"
                      strokeWidth={1.75}
                    />
                  )}
                </span>
                <h3 className="text-lg font-semibold text-(--color-ink)">
                  {point.title}
                </h3>
                <p className="text-sm text-(--color-ink-muted)">
                  {point.description}
                </p>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
