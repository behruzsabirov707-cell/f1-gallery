"use client";

import { motion } from "framer-motion";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import type { Locale } from "@/i18n/config";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import HeroPipeline from "@/components/home/HeroPipeline";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function Hero({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { hero } = dict.home;

  return (
    <section className="relative flex min-h-[78dvh] items-center overflow-hidden py-20 sm:min-h-[82dvh]">
      <div
        aria-hidden="true"
        className="hero-glow pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--color-signal)/20 blur-[120px]"
      />
      <Container className="relative flex flex-col items-center gap-6 text-center">
        <motion.span
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeUp}
          className="font-(family-name:--font-display) text-xs italic tracking-[0.2em] text-(--color-signal)"
        >
          {hero.eyebrow}
        </motion.span>
        <motion.h1
          initial="hidden"
          animate="visible"
          custom={0.1}
          variants={fadeUp}
          className="max-w-3xl text-4xl font-semibold leading-tight text-(--color-ink) sm:text-6xl"
        >
          {hero.titleLine1}{" "}
          <span className="font-(family-name:--font-display) italic text-(--color-signal)">
            {hero.titleAccent}
          </span>{" "}
          {hero.titleLine2}
        </motion.h1>
        <motion.p
          initial="hidden"
          animate="visible"
          custom={0.2}
          variants={fadeUp}
          className="max-w-xl text-(--color-ink-muted)"
        >
          {hero.description}
        </motion.p>
        <motion.div initial="hidden" animate="visible" custom={0.3} variants={fadeUp}>
          <Button href={`/${locale}#contact`} className="mt-2">
            {hero.ctaPrimary}
          </Button>
        </motion.div>
        <HeroPipeline labels={hero.pipeline} />
      </Container>
    </section>
  );
}
