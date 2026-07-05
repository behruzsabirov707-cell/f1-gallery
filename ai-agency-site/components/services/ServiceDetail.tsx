import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import type { Locale } from "@/i18n/config";
import type { ServiceMeta } from "@/data/services";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

export default function ServiceDetail({
  dict,
  locale,
  service,
}: {
  dict: Dictionary;
  locale: Locale;
  service: ServiceMeta;
}) {
  const content = dict.services[service.id];
  const { serviceDetail } = dict.common;
  const Icon = service.icon;

  return (
    <div>
      <section className="relative overflow-hidden pt-20 pb-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-(--color-brand-from)/20 to-(--color-brand-to)/20 blur-[120px]"
        />
        <Container className="relative flex flex-col items-center gap-6 text-center">
          <Link
            href={`/${locale}#services`}
            className="text-xs font-semibold tracking-[0.2em] text-(--color-ink-muted) hover:text-(--color-ink)"
          >
            ← {serviceDetail.backToServices}
          </Link>
          <span className="flex h-14 w-14 items-center justify-center rounded-tr-2xl rounded-bl-2xl rounded-tl-md rounded-br-md bg-gradient-to-br from-(--color-brand-from) to-(--color-brand-to)">
            <Icon className="h-6 w-6 text-white" strokeWidth={1.75} />
          </span>
          <h1 className="max-w-2xl text-3xl font-semibold text-(--color-ink) sm:text-5xl">
            {content.title}
          </h1>
          <p className="max-w-xl text-(--color-ink-muted)">{content.subtitle}</p>
          <Button href={`/${locale}#contact`}>{dict.common.buttons.contactUs}</Button>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-(--color-ink)">
              {serviceDetail.whatItIsLabel}
            </h2>
            <p className="text-(--color-ink-muted)">{content.whatItIs}</p>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-(--color-ink)">
              {serviceDetail.whoForLabel}
            </h2>
            <ul className="flex flex-col gap-3">
              {content.whoFor.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-sm text-(--color-ink-muted)"
                >
                  <span aria-hidden="true" className="text-(--color-brand-to)">
                    →
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="flex flex-col gap-8">
          <h2 className="text-xl font-semibold text-(--color-ink)">
            {serviceDetail.problemLabel}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-xl border border-(--color-border) bg-(--color-bg-elevated) p-6">
              <span className="text-xs font-semibold tracking-[0.2em] text-(--color-ink-muted)">
                {serviceDetail.beforeLabel}
              </span>
              <p className="text-sm text-(--color-ink-muted)">
                {content.problem.before}
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-(--color-border) bg-(--color-bg-elevated) p-6">
              <span className="text-xs font-semibold tracking-[0.2em] text-(--color-brand-to)">
                {serviceDetail.afterLabel}
              </span>
              <p className="text-sm text-(--color-ink-muted)">
                {content.problem.after}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="flex flex-col gap-8">
          <h2 className="text-xl font-semibold text-(--color-ink)">
            {serviceDetail.howItWorksLabel}
          </h2>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {content.howItWorks.map((step, i) => (
              <li
                key={step.title}
                className="flex flex-col gap-3 border-t-2 border-(--color-brand-to)/30 pt-4"
              >
                <span className="font-(family-name:--font-mono) text-sm text-(--color-brand-to)">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold text-(--color-ink)">
                  {step.title}
                </h3>
                <p className="text-sm text-(--color-ink-muted)">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-16">
        <Container className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-(--color-ink)">
            {serviceDetail.techLabel}
          </h2>
          <div className="flex flex-wrap gap-3">
            {content.tech.map((item) => (
              <span
                key={item}
                className="rounded-full border border-(--color-border) px-4 py-2 text-sm text-(--color-ink-muted)"
              >
                {item}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-24">
        <Container className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-semibold text-(--color-ink) sm:text-3xl">
            {serviceDetail.ctaTitle}
          </h2>
          <p className="max-w-xl text-(--color-ink-muted)">
            {serviceDetail.ctaDescription}
          </p>
          <Button href={`/${locale}#contact`}>{dict.common.buttons.contactUs}</Button>
        </Container>
      </section>
    </div>
  );
}
