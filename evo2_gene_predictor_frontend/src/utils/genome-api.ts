export interface GenomeAssemblyFromSearch {
    id: string,
    name: string,
    sourceName: string,
    active: boolean,
}

export async function getAvailbleGenomes() {
    const apiUrl = "https://api.genome.ucsc.edu/list/ucscGenomes"
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error("Failed to fetch genome list from UCSC API");
    }

    const genomeData = await response.json()
    if (!genomeData.ucscGenomes) {
        console.log(genomeData)
        throw new Error("UCSC API error: missing ucscGenomes")
    }

    const genomes = genomeData.ucscGenomes;
    const structuredGenomes: Record<string, GenomeAssemblyFromSearch[]> = {};

    for (const genomeId in genomes) {
        const genomeinfo = genomes[genomeId];
        const organism = genomeinfo.organism || "Other";

        if (!structuredGenomes[organism]) structuredGenomes[organism] = [];
        structuredGenomes[organism].push({
            id: genomeId,
            name: genomeinfo.description || genomeId,
            sourceName: genomeinfo.sourceName || genomeId,
            active: !!genomeinfo.active, // 1 = true, 0 = false
        });
    }

    return { genomes: structuredGenomes };
}