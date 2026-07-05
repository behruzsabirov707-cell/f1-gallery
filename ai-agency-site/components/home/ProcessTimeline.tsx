import type { Dictionary } from "@/i18n/dictionaries/uz";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

export default function ProcessTimeline({ dict }: { dict: Dictionary }) {
  const { process } = dict.home;

  return (
    <section
      id="process"
      className="border-y border-(--color-border) bg-(--color-bg-elevated)/40 py-24"
    >
      <Container className="flex flex-col gap-12">
        <Reveal>
          <SectionHeading eyebrow={process.eyebrow} title={process.title} />
        </Reveal>
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {process.steps.map((step, i) => (
            <li key={step.id} className="border-t-2 border-(--color-wire) pt-4">
              <Reveal delay={i * 0.08} className="flex flex-col gap-3">
                <span className="font-(family-name:--font-mono) text-sm text-(--color-signal)">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold text-(--color-ink)">
                  {step.title}
                </h3>
                <p className="text-sm text-(--color-ink-muted)">
                  {step.description}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
