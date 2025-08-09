"use client";

import { fetchGeneDetails, fetchGeneSequence as apiFetchGeneSequence, type GeneBounds, type GeneDetailsFromSearch, type GeneFromSearch } from "~/utils/genome-api";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GeneInformation } from "./gene-information";
import { GeneSequence } from "./gene-sequence";

export default function GeneViewer({
    gene, 
    genomeId, 
    onClose
}: {
    gene: GeneFromSearch; 
    genomeId: string; 
    onClose: () => void;
}) {
    const [geneSequence, setGeneSequnce] = useState("");
    const [geneDetail, setGeneDetail] = useState<GeneDetailsFromSearch | null>(
        null,
    );

    const [geneBounds, setGeneBounds] = useState<GeneBounds | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const [startPosition, setStartPosition] = useState<string>("");
    const [endPosition, setEndPosition] = useState<string>("");
    const [isLoadingSequence, setIsLoadingSequence] = useState(false);

    const [actualRange, setActualRange] = useState<{start: number, end: number} | null>(null)


    const fetchGeneSequence = useCallback(async (start: number, end: number) => {
        try {
            setIsLoadingSequence(true);
            setError(null);


            const {sequence, actualRange: fetchedRange, error: apiError } = await apiFetchGeneSequence(gene.chrom, start, end, genomeId)
            
            setGeneSequnce(sequence)
            setActualRange(fetchedRange)

            if (apiError) {
                setError(apiError)
            }
            console.log(sequence)
        } catch (err) {
            setError("Failed to load sequence data")
        } finally {
            setIsLoadingSequence(false);
        }
    }, [gene.chrom, genomeId],)

    useEffect(() => {
        const initializeGeneData = async () => {
            setIsLoading(true);
            setError(null);
            setGeneDetail(null);
            setStartPosition("")
            setEndPosition("")
            
            if (!gene.gene_id) {
                setError("Gene ID is missing, cannot fetch details")
                setIsLoading(false)
                return;
            }

            try {
                const {geneDetails: fetchedDetail, geneBounds: fetchedGeneBound, initialRange: fetchedRange} = await fetchGeneDetails(gene.gene_id);
                setGeneDetail(fetchedDetail);
                setGeneBounds(fetchedGeneBound);

                if (fetchedRange) {
                    setStartPosition(String(fetchedRange.start))
                    setEndPosition(String(fetchedRange.end))
                    await fetchGeneSequence(fetchedRange.start, fetchedRange.end)
                }
                console.log(fetchedDetail)

            } catch {
                setError("Failed to load gene information please try again.")
            } finally {
                setIsLoading(false);
            }
        };

        initializeGeneData();
    }, [gene, genomeId])

    return ( 
    
    <div className="space-y-6">
        <Button 
            className="cursor=pinter text-[#3c4f3d] hover:bg-[#e9eeea]/70" 
            variant="ghost" 
            size="sm"
            onClick={onClose}
        >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to results
        </Button>
        <GeneSequence
            geneBounds={geneBounds}
            geneDetail={geneDetail}
            startPosition={startPosition}
            endPosition={endPosition}
            onStartPositionChange={setStartPosition}
            onEndPositionChange={setEndPosition}
            sequenceData={geneSequence}
            sequenceRange={actualRange}
            isLoading={isLoadingSequence}
            error={error}
            onSequenceLoadRequest={handleLoadSequence}
            onSequenceClick={handleSequenceClick}
            maxViewRange={10000}
        />
        <GeneInformation gene={gene} geneDetail={geneDetail} geneBounds={geneBounds}/>
    </div>

    );
}