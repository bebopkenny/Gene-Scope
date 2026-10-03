export interface ProteinStructure {
  accession: string;
  proteinName: string;
  residueCount: number;
  meanPlddt: number;
  pdbUrl: string;
  entryUrl: string;
}

export type ProteinStructureLookup =
  | { status: "found"; structure: ProteinStructure }
  // No reviewed UniProt protein for the gene (pseudogenes, non-coding genes)
  | { status: "no-protein" }
  // The protein exists but AlphaFold DB has no prediction for it
  | { status: "no-structure"; accession: string };

interface AlphaFoldPrediction {
  entryId: string;
  uniprotDescription: string;
  uniprotStart: number;
  uniprotEnd: number;
  globalMetricValue: number;
  pdbUrl: string;
}

async function fetchUniprotAccession(geneId: string): Promise<string | null> {
  const params = new URLSearchParams({
    query: `(xref:geneid-${geneId}) AND (reviewed:true)`,
    fields: "accession",
    format: "json",
    size: "1",
  });
  const response = await fetch(
    `https://rest.uniprot.org/uniprotkb/search?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error("UniProt lookup failed: " + response.statusText);
  }

  const data = (await response.json()) as {
    results?: { primaryAccession: string }[];
  };
  return data.results?.[0]?.primaryAccession ?? null;
}

export async function fetchProteinStructure(
  geneId: string,
): Promise<ProteinStructureLookup> {
  const accession = await fetchUniprotAccession(geneId);
  if (!accession) return { status: "no-protein" };

  const response = await fetch(
    `https://alphafold.ebi.ac.uk/api/prediction/${accession}`,
  );
  if (response.status === 404) return { status: "no-structure", accession };
  if (!response.ok) {
    throw new Error("AlphaFold lookup failed: " + response.statusText);
  }

  // Isoforms come back alongside the canonical sequence, which is entry F1
  const predictions = (await response.json()) as AlphaFoldPrediction[];
  const prediction =
    predictions.find((p) => p.entryId === `AF-${accession}-F1`) ??
    predictions[0];
  if (!prediction) return { status: "no-structure", accession };

  return {
    status: "found",
    structure: {
      accession,
      proteinName: prediction.uniprotDescription,
      residueCount: prediction.uniprotEnd - prediction.uniprotStart + 1,
      meanPlddt: prediction.globalMetricValue,
      pdbUrl: prediction.pdbUrl,
      entryUrl: `https://alphafold.ebi.ac.uk/entry/${accession}`,
    },
  };
}

export async function fetchPdb(pdbUrl: string): Promise<string> {
  const response = await fetch(pdbUrl);
  if (!response.ok) {
    throw new Error("Failed to download structure: " + response.statusText);
  }
  return response.text();
}
