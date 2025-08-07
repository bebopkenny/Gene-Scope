"use client";

import { fetchGeneDetails, type GeneBounds, type GeneDetailsFromSearch, type GeneFromSearch } from "~/utils/genome-api";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

export default function GeneViewer({
    gene, 
    genomeId, 
    onClose
}: {
    gene: GeneFromSearch; 
    genomeId: string; 
    onClose: () => void;
}) {
    const [geneDetail, setGeneDetail] = useState<GeneDetailsFromSearch | null>(
        null,
    );

    const [geneBounds, setGeneBounds] = useState<GeneBounds | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const [startPosition, setStartPosition] = useState<string>("");
    const [endPosition, setEndPosition] = useState<string>("");

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
                const {geneDetails, geneBounds, initialRange} = await fetchGeneDetails(gene.gene_id);
                setGeneDetail(geneDetails);
                setGeneBounds(geneBounds);

                if (initialRange) {
                    setStartPosition(String(initialRange.start))
                    setEndPosition(String(initialRange.end))
                }

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
    </div>

    );
}