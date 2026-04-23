"use client";

import {
  analyzeVariantWithAPI,
  type ClinvarVariant,
  type GeneFromSearch,
} from "~/utils/genome-api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Viaoda_Libre } from "next/font/google";
import {
  BarChart2,
  ExternalLink,
  RefreshCw,
  Search,
  Shield,
  Zap,
} from "lucide-react";
import { getClassificationColorClasses } from "~/utils/coloring-utils";

export default function KnownVariants({
  refreshVariants,
  showComparison,
  updateClinvarVariant,
  clinvarVariants,
  isLoadingClinvar,
  clinvarError,
  genomeId,
  gene,
}: {
  refreshVariants: () => void;
  showComparison: (variant: ClinvarVariant) => void;
  updateClinvarVariant: (id: string, newVariant: ClinvarVariant) => void;
  clinvarVariants: ClinvarVariant[];
  isLoadingClinvar: boolean;
  clinvarError: string | null;
  genomeId: string;
  gene: GeneFromSearch;
}) {
  const analyzeVariant = async (variant: ClinvarVariant) => {
    let variantDetails = null;
    const position = variant.location
      ? parseInt(variant.location.replaceAll(",", ""))
      : null;

    const refAltMatch = variant.title.match(/(\w)>(\w)/);

    if (refAltMatch && refAltMatch.length === 3) {
      variantDetails = {
        position,
        reference: refAltMatch[1],
        alternative: refAltMatch[2],
      };
    }

    if (
      !variantDetails ||
      !variantDetails.position ||
      !variantDetails.reference ||
      !variantDetails.alternative
    ) {
      return;
    }

    updateClinvarVariant(variant.clinvar_id, {
      ...variant,
      isAnalyzing: true,
    });

    try {
      const data = await analyzeVariantWithAPI({
        position: variantDetails.position,
        alternative: variantDetails.alternative,
        genomeId: genomeId,
        chromosome: gene.chrom,
      });

      const updatedVariant: ClinvarVariant = {
        ...variant,
        isAnalyzing: false,
        evo2Result: data,
      };

      updateClinvarVariant(variant.clinvar_id, updatedVariant);

      showComparison(updatedVariant);
    } catch (error) {
      updateClinvarVariant(variant.clinvar_id, {
        ...variant,
        isAnalyzing: false,
        evo2Error: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  };
  return (
    <Card className="gap-0 border-none bg-card py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pt-4 pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">
          Known Variants in Gene from ClinVar
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshVariants}
          disabled={isLoadingClinvar}
          className="h-7 cursor-pointer text-xs text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        {clinvarError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {clinvarError}
          </div>
        )}

        {isLoadingClinvar ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
          </div>
        ) : clinvarVariants.length > 0 ? (
          <div className="h-96 max-h-96 overflow-y-scroll rounded-md border border-border">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-muted/70 hover:bg-muted">
                  <TableHead className="py-2 text-xs font-medium text-foreground">
                    Variant
                  </TableHead>
                  <TableHead className="py-2 text-xs font-medium text-foreground">
                    Type
                  </TableHead>
                  <TableHead className="py-2 text-xs font-medium text-foreground">
                    Clinical Significance
                  </TableHead>
                  <TableHead className="py-2 text-xs font-medium text-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinvarVariants.map((variant) => (
                  <TableRow
                    key={variant.clinvar_id}
                    className="border-b border-border"
                  >
                    <TableCell className="py-2">
                      <div className="text-xs font-medium text-foreground">
                        {variant.title}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <p>Location: {variant.location}</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-6 cursor-pointer px-0 text-xs text-primary hover:text-primary/80"
                          onClick={() =>
                            window.open(
                              `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar_id}`,
                              "_blank",
                            )
                          }
                        >
                          View in ClinVar
                          <ExternalLink className="ml-1 inline-block h-2 w-2" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-xs text-foreground">
                      {variant.variation_type}
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      <div
                        className={`w-fit rounded-md px-2 py-1 text-center font-normal ${getClassificationColorClasses(variant.classification)}`}
                      >
                        {variant.classification || "Unknown"}
                      </div>
                      {variant.evo2Result && (
                        <div className="mt-2">
                          <div
                            className={`flex w-fit items-center gap-1 rounded-md px-2 py-1 text-center ${getClassificationColorClasses(variant.evo2Result.prediction)}`}
                          >
                            <Shield className="h-3 w-3" />
                            <span>Evo2: {variant.evo2Result.prediction}</span>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      <div className="flex flex-col items-end gap-1">
                        {variant.variation_type
                          .toLowerCase()
                          .includes("single nucleotide") ? (
                          !variant.evo2Result ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 cursor-pointer border-border bg-background px-3 text-xs text-foreground hover:bg-accent hover:text-accent-foreground"
                              disabled={variant.isAnalyzing}
                              onClick={() => analyzeVariant(variant)}
                            >
                              {variant.isAnalyzing ? (
                                <>
                                  <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-primary"></span>
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Zap className="mr-1 inline-block h-3 w-3" />
                                  Analyze with Evo2
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 cursor-pointer border-green-200 bg-green-50 px-3 text-xs text-green-700 hover:bg-green-100 dark:border-green-800/40 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                              onClick={() => showComparison(variant)}
                            >
                              <BarChart2 className="mr-1 inline-block h-3 w-3" />
                              Compare Results
                            </Button>
                          )
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
            <Search className="mb-4 h-10 w-10 opacity-60" />
            <p className="text-sm leading-relaxed">
              No ClinVar variants found for this gene.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
