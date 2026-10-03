"use client";

import { motion } from "motion/react";
import { Dna, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";

interface HeroProps {
  mode: "search" | "browse";
  selectedChromosome?: string;
}

function HelixFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <Dna className="h-7 w-7 text-primary" />
      </div>
    </div>
  );
}

// three.js is only needed in the browser, so keep it out of the initial bundle
const DnaHelix = dynamic(
  () => import("./dna-helix").then((mod) => mod.DnaHelix),
  { ssr: false, loading: () => <HelixFallback /> },
);

// Falls back to the icon when WebGL is unavailable
class HelixBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <HelixFallback /> : this.props.children;
  }
}

export function Hero({ mode, selectedChromosome }: HeroProps) {
  const title =
    mode === "search"
      ? "Predict variant pathogenicity"
      : selectedChromosome
        ? "No genes found on this chromosome"
        : "Browse genes by chromosome";

  const subtitle =
    mode === "search"
      ? "Search a gene symbol above, or try the BRCA1 example to get started."
      : selectedChromosome
        ? "Select a different chromosome or search by symbol."
        : "Pick a chromosome to list its genes.";

  return (
    <div className="relative flex min-h-[18rem] flex-col items-center justify-center overflow-hidden px-6 py-12 text-center">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.8, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 right-1/4 h-48 w-48 rounded-full bg-chart-2/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" />
          Powered by Evo2 7B
        </div>
        <div
          aria-hidden
          className="mx-auto mb-4 h-32 w-full max-w-xl [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]"
        >
          <HelixBoundary>
            <DnaHelix />
          </HelixBoundary>
        </div>
        <h2 className="bg-gradient-to-br from-foreground to-primary bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </motion.div>
    </div>
  );
}
