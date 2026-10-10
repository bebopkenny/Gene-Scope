"use client";

import type { GLViewer } from "3dmol";
import { Box, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GeneFromSearch } from "~/utils/genome-api";
import {
  fetchPdb,
  fetchProteinConsequence,
  fetchProteinStructure,
  type ProteinConsequenceLookup,
  type ProteinStructureLookup,
} from "~/utils/protein-api";
import { GlossaryTerm } from "./glossary-term";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

// AlphaFold DB's confidence bands and colors, highest first
const PLDDT_BANDS = [
  { min: 90, label: "Very high (> 90)", color: "#0053d6" },
  { min: 70, label: "Confident (70 - 90)", color: "#65cbf3" },
  { min: 50, label: "Low (50 - 70)", color: "#ffdb13" },
  { min: 0, label: "Very low (< 50)", color: "#ff7d45" },
];

const VIEW_STYLES = [
  { id: "cartoon", label: "Cartoon" },
  { id: "stick", label: "Sticks" },
] as const;

type ViewStyle = (typeof VIEW_STYLES)[number]["id"];

// Stands apart from every pLDDT band color
const VARIANT_COLOR = "#d946ef";
// Ångströms of surrounding structure to keep in view around the variant residue
const VARIANT_ZOOM_RADIUS = 20;

// Smooth enough to look the same, and about half the work to draw for a long protein
const LARGE_PROTEIN_RESIDUES = 800;
const LARGE_PROTEIN_CARTOON_QUALITY = 5;

// Starts the lookups, the model download and 3Dmol itself before the viewer is on screen
export function preloadProteinStructure(geneId: string) {
  import("3dmol").catch(() => undefined);
  fetchProteinStructure(geneId)
    .then((lookup) => {
      if (lookup.status === "found") return fetchPdb(lookup.structure.pdbUrl);
    })
    .catch(() => undefined);
}

export interface SubmittedVariant {
  position: number;
  alternative: string;
}

interface HoveredResidue {
  name: string;
  number: number;
  plddt: number;
}

// AlphaFold stores each residue's pLDDT in the B-factor column
function plddtColor(atom: { b: number }) {
  return (PLDDT_BANDS.find((band) => atom.b >= band.min) ?? PLDDT_BANDS[3]!)
    .color;
}

export function ProteinStructure({
  gene,
  genomeId,
  variant,
}: {
  gene: GeneFromSearch;
  genomeId: string;
  variant: SubmittedVariant | null;
}) {
  const [lookup, setLookup] = useState<ProteinStructureLookup | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(gene.gene_id));
  const [isModelReady, setIsModelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewStyle, setViewStyle] = useState<ViewStyle>("cartoon");
  const [hovered, setHovered] = useState<HoveredResidue | null>(null);
  const [consequenceLookup, setConsequenceLookup] =
    useState<ProteinConsequenceLookup | null>(null);
  const [isLoadingConsequence, setIsLoadingConsequence] = useState(false);
  const [consequenceError, setConsequenceError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<GLViewer | null>(null);

  useEffect(() => {
    if (!gene.gene_id) return;
    let cancelled = false;

    const lookupStructure = async (geneId: string) => {
      setIsLoading(true);
      setError(null);
      setLookup(null);

      try {
        const result = await fetchProteinStructure(geneId);
        if (!cancelled) setLookup(result);
      } catch {
        if (!cancelled) setError("Failed to look up the protein structure");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void lookupStructure(gene.gene_id);
    return () => {
      cancelled = true;
    };
  }, [gene.gene_id]);

  const structure = lookup?.status === "found" ? lookup.structure : null;

  useEffect(() => {
    setConsequenceLookup(null);
    setConsequenceError(false);
    if (!variant) return;
    let cancelled = false;

    const lookupConsequence = async () => {
      setIsLoadingConsequence(true);

      try {
        const result = await fetchProteinConsequence({
          position: variant.position,
          alternative: variant.alternative,
          genomeId,
          chromosome: gene.chrom,
          geneSymbol: gene.symbol,
        });
        if (!cancelled) setConsequenceLookup(result);
      } catch {
        if (!cancelled) setConsequenceError(true);
      } finally {
        if (!cancelled) setIsLoadingConsequence(false);
      }
    };

    void lookupConsequence();
    return () => {
      cancelled = true;
    };
  }, [variant, genomeId, gene.chrom, gene.symbol]);

  const consequence =
    consequenceLookup?.status === "found"
      ? consequenceLookup.consequence
      : null;

  // Only mark the residue when the transcript's protein is the one that was modelled
  const variantResidue =
    structure &&
    consequence?.residue != null &&
    (consequence.accession ?? structure.accession) === structure.accession &&
    structure.sequence[consequence.residue - 1] ===
      consequence.referenceAminoAcid
      ? consequence.residue
      : null;
  const variantLabel =
    consequence?.proteinChange?.replace(/^p\./, "") ??
    `Residue ${variantResidue}`;

  const describeConsequence = () => {
    if (isLoadingConsequence) return "looking up its effect on the protein...";
    if (consequenceError)
      return "its effect on the protein could not be looked up.";
    if (consequenceLookup?.status === "unsupported-assembly") {
      return "protein effects can only be looked up for hg38 and hg19.";
    }
    if (consequenceLookup?.status === "no-transcript") {
      return `no ${gene.symbol} transcript covers this position.`;
    }
    if (!consequence) return null;

    if (consequence.residue === null) {
      return `${consequence.consequence}. It falls outside the coding sequence, so no residue is marked.`;
    }

    const change = consequence.proteinChange
      ? `${consequence.consequence}, ${consequence.proteinChange}.`
      : `${consequence.consequence}.`;
    return variantResidue !== null
      ? `${change} Residue ${variantResidue} is marked in the structure.`
      : `${change} The transcript's protein differs from the modelled sequence there, so no residue is marked.`;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!structure || !container) return;
    let cancelled = false;

    const loadModel = async () => {
      setIsLoading(true);

      try {
        const [$3Dmol, pdb] = await Promise.all([
          import("3dmol"),
          fetchPdb(structure.pdbUrl),
        ]);
        if (cancelled) return;

        const viewer = $3Dmol.createViewer(container, {
          // the default white still paints at zero alpha, which hid the card in dark mode
          backgroundColor: "black",
          backgroundAlpha: 0,
          hoverDuration: 100,
          ...(structure.residueCount > LARGE_PROTEIN_RESIDUES && {
            cartoonQuality: LARGE_PROTEIN_CARTOON_QUALITY,
          }),
        });
        viewer.addModel(pdb, "pdb");
        viewer.setHoverable(
          {},
          true,
          (atom: { resn: string; resi: number; b: number }) =>
            setHovered({ name: atom.resn, number: atom.resi, plddt: atom.b }),
          () => setHovered(null),
        );
        viewer.zoomTo();

        viewerRef.current = viewer;
        setIsModelReady(true);
      } catch {
        if (!cancelled) setError("Failed to load the 3D structure");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadModel();

    const resizeObserver = new ResizeObserver(() =>
      viewerRef.current?.resize(),
    );
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      viewerRef.current = null;
      setIsModelReady(false);
      setHovered(null);

      // 3Dmol has no dispose, so release the WebGL context by hand
      const canvas = container.querySelector("canvas");
      const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      container.replaceChildren();
    };
  }, [structure]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isModelReady || !viewer) return;

    viewer.setStyle(
      {},
      viewStyle === "cartoon"
        ? { cartoon: { colorfunc: plddtColor } }
        : { stick: { colorfunc: plddtColor, radius: 0.2 } },
    );

    viewer.removeAllLabels();
    if (variantResidue !== null) {
      viewer.addStyle(
        { resi: variantResidue },
        { sphere: { color: VARIANT_COLOR } },
      );

      const { x, y, z } =
        viewer.selectedAtoms({ resi: variantResidue, atom: "CA" })[0] ?? {};
      if (x != null && y != null && z != null) {
        viewer.addLabel(variantLabel, {
          position: { x, y, z },
          inFront: true,
          fontSize: 12,
          fontColor: "white",
          backgroundColor: VARIANT_COLOR,
          backgroundOpacity: 1,
        });
      }
    }
    viewer.render();
  }, [viewStyle, isModelReady, variantResidue, variantLabel]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isModelReady || !viewer || variantResidue === null) return;

    viewer.zoomTo(
      {
        within: {
          distance: VARIANT_ZOOM_RADIUS,
          sel: { resi: variantResidue },
        },
      },
      600,
    );
  }, [isModelReady, variantResidue]);

  return (
    <Card className="bg-card gap-0 border-none py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pt-4 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          Protein Structure
        </CardTitle>
        {structure && (
          <a
            href={structure.entryUrl}
            target="_blank"
            className="text-primary flex items-center text-sm hover:underline"
          >
            View in AlphaFold DB
            <ExternalLink className="ml-1 inline-block h-3 w-3" />
          </a>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-md border p-3 text-sm">
            {error}
          </div>
        )}

        {structure ? (
          <>
            <p className="text-muted-foreground mb-3 text-sm">
              <span className="text-foreground font-medium">
                {structure.proteinName}
              </span>{" "}
              · UniProt {structure.accession} ·{" "}
              {structure.residueCount.toLocaleString()} residues · mean{" "}
              <GlossaryTerm term="plddt">pLDDT</GlossaryTerm>{" "}
              {structure.meanPlddt.toFixed(1)}
            </p>

            {variant && (
              <div className="border-border bg-muted/40 text-foreground mb-3 rounded-md border p-3 text-sm leading-relaxed">
                <span className="text-muted-foreground">
                  Analyzed variant {variant.position.toLocaleString()} to{" "}
                  {variant.alternative}:
                </span>{" "}
                {describeConsequence()}
              </div>
            )}

            <div
              className="bg-muted/60 relative h-96 w-full overflow-hidden rounded-md"
              // Let the page scroll past the viewer; zooming needs Ctrl or a pinch
              onWheelCapture={(e) => {
                if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
              }}
            >
              <div ref={containerRef} className="absolute inset-0" />

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-muted-foreground/30 border-t-primary h-5 w-5 animate-spin rounded-full border-2"></div>
                </div>
              )}

              {isModelReady && (
                <div className="absolute top-2 right-2 flex gap-1">
                  {VIEW_STYLES.map((style) => (
                    <Button
                      key={style.id}
                      variant="outline"
                      size="sm"
                      className={`border-border hover:bg-accent hover:text-accent-foreground h-7 cursor-pointer px-3 text-xs ${viewStyle === style.id ? "bg-accent text-accent-foreground" : "bg-background text-foreground"}`}
                      onClick={() => setViewStyle(style.id)}
                    >
                      {style.label}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-7 cursor-pointer px-3 text-xs"
                    onClick={() => viewerRef.current?.zoomTo({}, 600)}
                  >
                    Reset view
                  </Button>
                </div>
              )}

              {hovered && (
                <div className="bg-primary text-primary-foreground pointer-events-none absolute top-2 left-2 rounded px-2 py-1 text-xs shadow-md">
                  {hovered.name} {hovered.number} · pLDDT{" "}
                  {hovered.plddt.toFixed(1)}
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <div className="flex flex-wrap items-center gap-4">
                {PLDDT_BANDS.map((band) => (
                  <div key={band.label} className="flex items-center gap-1">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: band.color }}
                    ></div>
                    <span className="text-muted-foreground text-xs">
                      {band.label}
                    </span>
                  </div>
                ))}
                {variantResidue !== null && (
                  <div className="flex items-center gap-1">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: VARIANT_COLOR }}
                    ></div>
                    <span className="text-muted-foreground text-xs">
                      Analyzed variant
                    </span>
                  </div>
                )}
              </div>
              <span className="text-muted-foreground text-xs">
                Drag to rotate · Ctrl + scroll to zoom
              </span>
            </div>

            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              <GlossaryTerm term="alphafold">AlphaFold</GlossaryTerm> prediction
              for the reference protein. Analyzing a coding variant marks the
              residue it changes, but the shape shown stays the reference one.
            </p>
          </>
        ) : isLoading ? (
          <div className="flex justify-center py-6">
            <div className="border-muted border-t-primary h-5 w-5 animate-spin rounded-full border-2"></div>
          </div>
        ) : (
          !error && (
            <div className="text-muted-foreground flex h-48 flex-col items-center justify-center text-center">
              <Box className="mb-4 h-10 w-10 opacity-60" />
              <p className="max-w-md text-sm leading-relaxed">
                {lookup?.status === "no-structure"
                  ? `AlphaFold DB has no prediction for UniProt ${lookup.accession}. Very large proteins are among those it leaves out.`
                  : "No reviewed UniProt protein is linked to this gene, which is common for pseudogenes and non-coding genes."}
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
