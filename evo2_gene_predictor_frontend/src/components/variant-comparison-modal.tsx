import type { ClinvarVariant } from "~/utils/genome-api";
import { Button } from "./ui/button";
import { Check, ExternalLink, Shield, X } from "lucide-react";
import { motion } from "motion/react";
import {
  getClassificationColorClasses,
  getNucleotideColorClass,
} from "~/utils/coloring-utils";

export function VariantComparisonModal({
  comparisonVariant,
  onClose,
}: {
  comparisonVariant: ClinvarVariant | null;
  onClose: () => void;
}) {
  if (!comparisonVariant || !comparisonVariant.evo2Result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
        {/* Modal header */}
        <div className="border-b border-border p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">
              Variant Analysis Comparison
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 cursor-pointer p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Modal content */}
        <div className="p-5">
          {comparisonVariant && comparisonVariant.evo2Result && (
            <div className="space-y-6">
              <div className="rounded-md border border-border bg-muted/40 p-4">
                <h4 className="mb-3 text-sm font-medium text-foreground">
                  Variant Information
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="w-28 text-xs text-muted-foreground">
                          Position:
                        </span>
                        <span className="text-xs text-foreground">
                          {comparisonVariant.location}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-28 text-xs text-muted-foreground">
                          Type:
                        </span>
                        <span className="text-xs text-foreground">
                          {comparisonVariant.variation_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="w-28 text-xs text-muted-foreground">
                          Variant:
                        </span>
                        <span className="font-mono text-xs text-foreground">
                          {(() => {
                            const match =
                              comparisonVariant.title.match(/(\w)>(\w)/);
                            if (match && match.length === 3) {
                              const [_, ref, alt] = match;
                              return (
                                <>
                                  <span
                                    className={getNucleotideColorClass(ref!)}
                                  >
                                    {ref}
                                  </span>
                                  <span>{">"}</span>
                                  <span
                                    className={getNucleotideColorClass(alt!)}
                                  >
                                    {alt}
                                  </span>
                                </>
                              );
                            }
                            return comparisonVariant.title;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-28 text-xs text-muted-foreground">
                          ClinVar ID:
                        </span>
                        <a
                          href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${comparisonVariant.clinvar_id}`}
                          className="text-xs text-primary hover:underline"
                          target="_blank"
                        >
                          {comparisonVariant.clinvar_id}
                        </a>
                        <ExternalLink className="ml-1 inline-block h-3 w-3 text-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variant results */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-foreground">
                  Analysis Comparison
                </h4>
                <div className="rounded-md border border-border bg-card p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* ClinVar Assesment */}
                    <div className="rounded-md bg-muted/50 p-4">
                      <h5 className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                          <span className="h-3 w-3 rounded-full bg-primary"></span>
                        </span>
                        ClinVar Assessment
                      </h5>
                      <div className="mt-2">
                        <div
                          className={`w-fit rounded-md px-2 py-1 text-xs font-normal ${getClassificationColorClasses(comparisonVariant.classification)}`}
                        >
                          {comparisonVariant.classification ||
                            "Unknown significance"}
                        </div>
                      </div>
                    </div>

                    {/* Evo2 Prediction */}
                    <div className="rounded-md bg-muted/50 p-4">
                      <h5 className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                          <span className="h-3 w-3 rounded-full bg-primary"></span>
                        </span>
                        Evo2 Prediction
                      </h5>
                      <div className="mt-2">
                        <div
                          className={`flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-normal ${getClassificationColorClasses(comparisonVariant.evo2Result.prediction)}`}
                        >
                          <Shield className="h-3 w-3" />
                          {comparisonVariant.evo2Result.prediction}
                        </div>
                      </div>
                      {/* Delta score */}
                      <div className="mt-3">
                        <div className="mb-1 text-xs text-muted-foreground">
                          Delta Likelihood Score:
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {comparisonVariant.evo2Result.delta_score.toFixed(6)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {comparisonVariant.evo2Result.delta_score < 0
                            ? "Negative score indicates loss of function"
                            : "Positive score indicated gain/neutral function"}
                        </div>
                      </div>
                      {/* Confidence bar */}
                      <div className="mt-3">
                        <div className="mb-1 text-xs text-muted-foreground">
                          Confidence:
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className={`h-2 rounded-full bg-gradient-to-r ${comparisonVariant.evo2Result.prediction.includes("pathogenic") ? "from-red-400 to-red-600" : "from-green-400 to-green-600"}`}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, comparisonVariant.evo2Result.classification_confidence * 100)}%`,
                            }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <div className="mt-1 text-right text-xs text-muted-foreground">
                          {Math.round(
                            comparisonVariant.evo2Result
                              .classification_confidence * 100,
                          )}
                          %
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assesment Agreement */}
                  <div className="mt-4 rounded-md bg-muted/30 p-3 text-xs leading-relaxed">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${comparisonVariant.classification.toLowerCase() === comparisonVariant.evo2Result.prediction.toLowerCase() ? "bg-green-100 dark:bg-green-900/40" : "bg-yellow-100 dark:bg-yellow-900/40"}`}
                      >
                        {comparisonVariant.classification.toLowerCase() ===
                        comparisonVariant.evo2Result.prediction.toLowerCase() ? (
                          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                        ) : (
                          <span className="flex h-3 w-3 items-center justify-center text-yellow-600 dark:text-yellow-400">
                            <p>!</p>
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-foreground">
                        {comparisonVariant.classification.toLowerCase() ===
                        comparisonVariant.evo2Result.prediction.toLowerCase()
                          ? "Evo2 prediction agrees with ClinVar classification"
                          : "Evo2 prediction differs from ClinVar classification"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex justify-end border-t border-border bg-muted/40 p-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
