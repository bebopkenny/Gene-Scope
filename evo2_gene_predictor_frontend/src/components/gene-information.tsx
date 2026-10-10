import type { GeneBounds, GeneDetailsFromSearch, GeneFromSearch } from "~/utils/genome-api"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { ExternalLink } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export function GeneInformation({gene, geneDetail, geneBounds, genomeId} : {gene: GeneFromSearch, geneDetail: GeneDetailsFromSearch | null, geneBounds: GeneBounds | null, genomeId: string})

{
    const summaryRef = useRef<HTMLParagraphElement>(null);
    const [showFullSummary, setShowFullSummary] = useState(false);
    const [summaryIsCut, setSummaryIsCut] = useState(false);

    // Offer "Show more" only when the three-line preview really hides text at this width
    useEffect(() => {
        const summary = summaryRef.current;
        if (!summary || showFullSummary) return;
        const measure = () => setSummaryIsCut(summary.scrollHeight > summary.clientHeight + 1);
        measure();
        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(summary);
        return () => resizeObserver.disconnect();
    }, [showFullSummary, geneDetail?.summary]);

    return (
    <Card className="gap-0 border-none bg-card py-0 shadow-sm">
        <CardHeader className="pt-4 pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
                Gene Information
            </CardTitle>
     </CardHeader>
     <CardContent className="pb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {gene.symbol}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{gene.name}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
                {gene.description && gene.description !== gene.name && (
                <div className="flex">
                    <span className="w-28 shrink-0 text-sm text-muted-foreground">
                        Description:
                    </span>
                    <span className="text-sm text-foreground">{gene.description}</span>
                </div>
                )}
                <div className="flex">
                    <span className="w-28 shrink-0 text-sm text-muted-foreground">
                        Chromosome:
                    </span>
                    <span className="text-sm text-foreground">{gene.chrom} ({genomeId})</span>
                </div>
                {geneBounds && (
                <div className="flex">
                    <span className="w-28 shrink-0 text-sm text-muted-foreground">
                        Position:
                    </span>
                    <span className="text-sm text-foreground">
                        {Math.min(geneBounds.min, geneBounds.max).toLocaleString()} -{" "}
                        {Math.max(geneBounds.min, geneBounds.max).toLocaleString()}{" "}(
                        {Math.abs(geneBounds.max - geneBounds.min + 1).toLocaleString()} bp)
                        {geneDetail?.genomicinfo?.[0]?.strand === "-" && " (reverse strand) "}
                    </span>
                </div>
                )}
                {gene.gene_id && (
                    <div className="flex">
                        <span className="w-28 shrink-0 text-sm text-muted-foreground">
                            Gene ID:
                        </span>
                        <span className="text-sm">
                            <a href={`https://www.ncbi.nlm.nih.gov/gene/${gene.gene_id}`} target="_blank" className="text-primary flex items-center hover:underline">
                                {gene.gene_id}
                                <ExternalLink className="ml-1 inline-block h-3 w-3" />
                            </a>
                        </span>
                    </div>
                )}
                {geneDetail?.organism && (
                    <div className="flex">
                        <span className="w-28 shrink-0 text-sm text-muted-foreground">Organism:</span>
                        <span className="text-sm text-foreground">{geneDetail.organism.scientificname} {geneDetail.organism.commonname && ` (${geneDetail.organism.commonname})`}</span>
                    </div>
                )}
            </div>
            {geneDetail?.summary && (
                <div>
                    <h3 className="mb-2 text-sm font-medium text-foreground">
                        Summary
                    </h3>
                    <p
                        ref={summaryRef}
                        id="gene-summary"
                        className={`text-sm leading-relaxed text-muted-foreground ${showFullSummary ? "" : "line-clamp-3"}`}
                    >
                        {geneDetail.summary}
                    </p>
                    {summaryIsCut && (
                        <Button
                            variant="link"
                            aria-expanded={showFullSummary}
                            aria-controls="gene-summary"
                            className="mt-1 h-auto cursor-pointer p-0 text-sm text-primary hover:text-primary/80"
                            onClick={() => setShowFullSummary((shown) => !shown)}
                        >
                            {showFullSummary ? "Show less" : "Show more"}
                        </Button>
                    )}
                </div>
            )}
        </div>
     </CardContent>
    </Card>

    )
}
