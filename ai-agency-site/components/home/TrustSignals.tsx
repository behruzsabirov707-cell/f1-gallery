import type { Dictionary } from "@/i18n/dictionaries/uz";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { stats } from "@/data/stats";

const labelKeys = {
  projects: "projectsLabel",
  industries: "industriesLabel",
  support: "supportLabel",
} as const;

export default function TrustSignals({ dict }: { dict: Dictionary }) {
  const { trustSignals } = dict.home;

  return (
    <section className="border-y border-(--color-border) bg-(--color-bg-elevated)/40">
      <Container className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <Reveal
            key={stat.id}
            delay={i * 0.08}
            className="flex flex-col items-center gap-1 text-center"
          >
            <span className="font-(family-name:--font-mono) text-3xl font-medium text-(--color-ink)">
              {stat.value}
            </span>
            <span className="text-sm text-(--color-ink-muted)">
              {trustSignals[labelKeys[stat.id]]}
            </span>
          </Reveal>
        ))}
      </Container>
    </section>
  );
}
