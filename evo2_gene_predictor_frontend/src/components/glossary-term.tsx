"use client";

import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const GLOSSARY = {
  evo2: {
    title: "Evo 2",
    body: "A DNA language model from Arc Institute, trained on genomes from across the tree of life. It estimates how likely a DNA sequence is, which Gene Scope uses to judge how disruptive a mutation looks.",
  },
  deltaScore: {
    title: "Delta likelihood score",
    body: "Evo 2's likelihood for the sequence with the variant, minus its likelihood for the reference sequence. More negative means the change looks less natural to the model, which points toward loss of function.",
  },
  prediction: {
    title: "Prediction",
    body: "Gene Scope's call from the delta score, using a cut-off calibrated on BRCA1 variants whose function was measured in the lab. It is a research estimate, not a diagnosis.",
  },
  confidence: {
    title: "Confidence",
    body: "How far the delta score sits from the pathogenic/benign cut-off, scaled by the spread seen in the BRCA1 calibration data. Higher means further from the borderline.",
  },
  alternative: {
    title: "Alternative base",
    body: "The DNA letter that replaces the reference base in the variant you want to test.",
  },
  clinvar: {
    title: "ClinVar",
    body: "A public NIH archive where labs and expert groups report genetic variants and what they believe each one means for health.",
  },
  clinicalSignificance: {
    title: "Clinical significance",
    body: "ClinVar's summary of the submitted interpretations: pathogenic (disease-causing), benign (harmless), or uncertain when the evidence is not enough to say.",
  },
  genomeAssembly: {
    title: "Genome assembly",
    body: "A specific version of the reference genome. Positions shift between versions, so hg38 and hg19 coordinates are not interchangeable.",
  },
  strand: {
    title: "Strand",
    body: "DNA has two complementary strands. A gene on the reverse strand is read in the opposite direction to the coordinates shown here.",
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;

export function GlossaryTerm({
  term,
  children,
}: {
  term: GlossaryKey;
  children?: ReactNode;
}) {
  const entry = GLOSSARY[term];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="focus-visible:decoration-primary cursor-help underline decoration-current/40 decoration-dotted underline-offset-2 outline-none"
        >
          {children ?? entry.title}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-left leading-relaxed font-normal">
        <span className="font-semibold">{entry.title}.</span> {entry.body}
      </TooltipContent>
    </Tooltip>
  );
}
