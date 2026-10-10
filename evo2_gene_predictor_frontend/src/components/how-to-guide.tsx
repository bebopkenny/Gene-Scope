"use client";

import { CircleHelp, X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Button } from "./ui/button";

const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: "Choose a genome assembly",
    body: (
      <>
        hg38 is selected for you and is the right choice for most people. Switch
        to hg19 only if the positions you have come from that older version.
      </>
    ),
  },
  {
    title: "Find a gene",
    body: (
      <>
        Under <b>Search Genes</b>, type a symbol or name such as BRCA1 and press
        Enter. Or open <b>Browse Chromosomes</b> and pick a chromosome to list
        its genes. Not sure where to start? Press <b>Try BRCA1 example</b>. Then
        select a gene in the results to open it.
      </>
    ),
  },
  {
    title: "Pick a variant to test",
    body: (
      <>
        A variant here is one DNA letter swapped for another. You can type a
        position and the new letter (A, C, G or T) under{" "}
        <b>Variant Analysis</b>, click any letter in the <b>Gene Sequence</b>{" "}
        viewer to fill in its position, or press <b>Analyze with Evo2</b> next
        to a variant already reported in ClinVar.
      </>
    ),
  },
  {
    title: "Read the result",
    body: (
      <>
        <b>Analyze variant</b> sends the change to the Evo 2 model. You get a
        prediction (likely pathogenic or likely benign), the score behind it and
        how confident the call is. For a ClinVar variant,{" "}
        <b>Compare Results</b> puts Evo 2 next to ClinVar&apos;s own
        classification. The first analysis after a quiet spell is slower while
        the model starts up.
      </>
    ),
  },
  {
    title: "Explore the gene",
    body: (
      <>
        Drag the slider or type a start and end, then press{" "}
        <b>Load sequence</b> to view up to 10,000 bases.{" "}
        <b>Score region with Evo2</b> shows how strongly the model expects each
        base. <b>Protein Structure</b> shows the AlphaFold 3D model: drag to
        rotate, Ctrl + scroll to zoom. <b>Back to results</b> returns to the
        gene list.
      </>
    ),
  },
];

export function HowToGuide() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => dialogRef.current?.showModal()}
        className="h-9 cursor-pointer text-foreground/70 hover:bg-accent hover:text-accent-foreground"
      >
        <CircleHelp className="h-4 w-4" />
        How to use
      </Button>

      {/* native dialog: it traps focus, closes on Escape and returns focus to the button */}
      <dialog
        ref={dialogRef}
        aria-labelledby="how-to-title"
        // the dialog has no padding, so a click that lands on it is a click on the backdrop
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/60"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 id="how-to-title" className="text-lg font-medium text-foreground">
            How to use Gene Scope
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close"
            onClick={close}
            className="h-9 w-9 cursor-pointer p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Gene Scope estimates whether a single-letter change in a human gene
            looks harmful, using the Evo 2 DNA model, and lets you compare that
            with what ClinVar reports.
          </p>

          <ol className="mt-5 space-y-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground [&_b]:font-medium [&_b]:text-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 space-y-2 rounded-md border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Words with a{" "}
              <span className="underline decoration-current/40 decoration-dotted underline-offset-2">
                dotted underline
              </span>{" "}
              explain themselves when you hover over or tab to them.
            </p>
            <p>
              For learning and research only. Predictions are experimental and
              may be wrong, so do not use them for medical decisions.
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-border bg-muted/40 p-4">
          <Button type="button" onClick={close} className="cursor-pointer">
            Got it
          </Button>
        </div>
      </dialog>
    </>
  );
}
