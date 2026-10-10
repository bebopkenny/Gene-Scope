"use client";

import { useEffect, useState } from "react";
import { getClassificationColorClasses } from "~/utils/coloring-utils";
import type { GeneFromSearch } from "~/utils/genome-api";
import {
  fetchProteinConsequence,
  type ProteinConsequenceLookup,
} from "~/utils/protein-api";
import { GlossaryTerm } from "./glossary-term";
import type { SubmittedVariant } from "./protein-structure";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

// Tools that only rate a change of amino acid, with how to read each score
const MISSENSE_TOOLS = [
  { key: "sift", name: "SIFT", hint: "0 to 1, lower is more damaging" },
  {
    key: "polyphen",
    name: "PolyPhen-2",
    hint: "0 to 1, higher is more damaging",
  },
  {
    key: "alphaMissense",
    name: "AlphaMissense",
    hint: "0 to 1, higher is more damaging",
  },
] as const;

const TILE_CLASSES = "border-border bg-muted/40 rounded-md border p-3";
const TILE_TITLE_CLASSES = "text-muted-foreground text-xs font-medium";

// Reuses the ClinVar chip colors: red for harmful, green for harmless, yellow in between
function chipColor(prediction: string) {
  if (prediction === "deleterious" || prediction === "probably damaging") {
    return getClassificationColorClasses("pathogenic");
  }
  if (prediction === "tolerated") {
    return getClassificationColorClasses("benign");
  }
  return getClassificationColorClasses(prediction);
}

// A scaled CADD score of 10 marks the top 10% of all possible changes, 20 the top 1%, 30 the top 0.1%
function caddRank(phred: number) {
  if (phred >= 30) return "In the top 0.1% of all possible changes";
  if (phred >= 20) return "In the top 1% of all possible changes";
  if (phred >= 10) return "In the top 10% of all possible changes";
  return "Outside the top 10% of all possible changes";
}

export function OtherPredictors({
  gene,
  genomeId,
  variant,
  onRetry,
}: {
  gene: GeneFromSearch;
  genomeId: string;
  variant: SubmittedVariant | null;
  onRetry: () => void;
}) {
  const [lookup, setLookup] = useState<ProteinConsequenceLookup | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLookup(null);
    setFailed(false);
    if (!variant) return;
    let cancelled = false;

    // The protein card asks for the same variant, and the request is shared
    fetchProteinConsequence({
      position: variant.position,
      alternative: variant.alternative,
      genomeId,
      chromosome: gene.chrom,
      geneSymbol: gene.symbol,
    })
      .then((result) => {
        if (!cancelled) setLookup(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [variant, genomeId, gene.chrom, gene.symbol]);

  if (!variant) return null;

  const scores = lookup?.status === "found" ? lookup.consequence : null;
  const missing = scores
    ? MISSENSE_TOOLS.filter(({ key }) => !scores[key]).map(({ name }) => name)
    : [];

  const describeStatus = () => {
    if (failed) return "The other predictors could not be looked up.";
    if (!lookup) return "Looking up other predictors...";
    if (lookup.status === "unsupported-assembly") {
      return "Other predictors can only be looked up for hg38 and hg19.";
    }
    if (lookup.status === "no-transcript") {
      return `No ${gene.symbol} transcript covers this position, so there is nothing to rate.`;
    }
    return null;
  };

  return (
    <Card className="bg-card gap-0 border-none py-0 shadow-sm">
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          Other Predictors
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-4">
        <p className="text-muted-foreground mb-4 text-sm">
          What other tools make of{" "}
          <span className="text-foreground">
            {variant.position.toLocaleString()} to {variant.alternative}
          </span>
          {scores &&
            ` (${[scores.consequence, scores.proteinChange].filter(Boolean).join(", ")})`}
          .
        </p>

        {scores ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {MISSENSE_TOOLS.map(({ key, hint }) => {
                const call = scores[key];
                if (!call) return null;

                return (
                  <div key={key} className={TILE_CLASSES}>
                    <div className={TILE_TITLE_CLASSES}>
                      <GlossaryTerm term={key} />
                    </div>
                    <div
                      className={`mt-2 inline-block rounded-lg px-3 py-1 text-xs ${chipColor(call.prediction)}`}
                    >
                      {call.prediction}
                    </div>
                    <div className="text-foreground mt-2 text-sm">
                      Score {call.score}
                    </div>
                    <div className="text-muted-foreground text-xs">{hint}</div>
                  </div>
                );
              })}

              {scores.caddPhred !== null && (
                <div className={TILE_CLASSES}>
                  <div className={TILE_TITLE_CLASSES}>
                    <GlossaryTerm term="cadd" />
                  </div>
                  <div className="text-foreground mt-2 text-sm">
                    Scaled score {scores.caddPhred}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {caddRank(scores.caddPhred)}, higher is more damaging
                  </div>
                </div>
              )}
            </div>

            {missing.length > 0 && (
              <p className="text-muted-foreground mt-3 text-sm">
                No score from {new Intl.ListFormat("en").format(missing)}
                {scores.consequence.includes("missense")
                  ? " for this change."
                  : ": only variants that change an amino acid are rated."}
              </p>
            )}

            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Scores come from Ensembl VEP for the gene&apos;s main transcript.
              Each tool weighs different evidence than Evo 2, so they can
              disagree with it and with each other.
            </p>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p role="status" className="text-muted-foreground text-sm">
              {describeStatus()}
            </p>
            {failed && (
              <Button
                variant="outline"
                size="sm"
                className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-7 cursor-pointer text-sm"
                onClick={onRetry}
              >
                Try again
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
