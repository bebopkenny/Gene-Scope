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
  likelihoodTrack: {
    title: "Evo 2 likelihood track",
    body: "The probability Evo 2 gives each reference base, judged from the DNA before it. Tall bars are bases the model strongly expects. Short bars are positions it finds hard to predict.",
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
  reviewStatus: {
    title: "Review status",
    body: "ClinVar's zero-to-four-star rating of how well supported a classification is. More stars mean several submitters agree or an expert panel has reviewed it.",
  },
  alphafold: {
    title: "AlphaFold",
    body: "An AI system from Google DeepMind that predicts a protein's 3D shape from its amino acid sequence. Structures here come from the AlphaFold Protein Structure Database.",
  },
  plddt: {
    title: "pLDDT",
    body: "AlphaFold's confidence in each residue's position, from 0 to 100. Above 90 is very high and 70 to 90 is confident. Below 50 often marks flexible or disordered regions rather than a wrong prediction.",
  },
  sift: {
    title: "SIFT",
    body: "Judges an amino acid change by how well that position is conserved across related proteins. Scores run from 0 to 1, and below 0.05 is called deleterious.",
  },
  polyphen: {
    title: "PolyPhen-2",
    body: "Estimates how damaging an amino acid change is from conservation and features of the protein's structure. Scores run from 0 to 1, and higher means more likely damaging.",
  },
  cadd: {
    title: "CADD",
    body: "Combined Annotation Dependent Depletion ranks a single-base change against every possible one in the genome. A scaled score of 20 puts it in the top 1% most likely to be harmful, and 30 in the top 0.1%.",
  },
  alphaMissense: {
    title: "AlphaMissense",
    body: "A Google DeepMind model built on AlphaFold that rates every possible amino acid change from 0 to 1. Above 0.564 is called likely pathogenic and below 0.34 likely benign.",
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
