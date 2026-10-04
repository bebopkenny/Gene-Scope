export interface ProteinStructure {
  accession: string;
  proteinName: string;
  residueCount: number;
  meanPlddt: number;
  // One-letter amino acids, starting at residue 1
  sequence: string;
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
  sequence: string;
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
      sequence: prediction.sequence,
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

export interface ProteinConsequence {
  // Sequence Ontology terms in plain words, e.g. "missense variant"
  consequence: string;
  // HGVS protein change such as "p.Cys61Gly", null when no residue is affected
  proteinChange: string | null;
  residue: number | null;
  referenceAminoAcid: string | null;
  // UniProt accession of the protein the transcript encodes
  accession: string | null;
}

export type ProteinConsequenceLookup =
  | { status: "found"; consequence: ProteinConsequence }
  | { status: "unsupported-assembly" }
  // No transcript of the gene covers the position
  | { status: "no-transcript" };

// Ensembl serves each human assembly from its own host
const ENSEMBL_SERVERS: Record<string, string> = {
  hg38: "https://rest.ensembl.org",
  hg19: "https://grch37.rest.ensembl.org",
};

// Ensembl can time out the first time it sees a variant, then answer a retry at once
async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
  try {
    const response = await fetch(url);
    if (response.status < 500 || retries === 0) return response;
  } catch (err) {
    if (retries === 0) throw err;
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  return fetchWithRetry(url, retries - 1);
}

interface VepTranscriptConsequence {
  gene_symbol?: string;
  canonical?: number;
  consequence_terms: string[];
  protein_start?: number;
  amino_acids?: string;
  hgvsp?: string;
  swissprot?: string[];
}

export async function fetchProteinConsequence({
  position,
  alternative,
  genomeId,
  chromosome,
  geneSymbol,
}: {
  position: number;
  alternative: string;
  genomeId: string;
  chromosome: string;
  geneSymbol: string;
}): Promise<ProteinConsequenceLookup> {
  const server = ENSEMBL_SERVERS[genomeId];
  if (!server) return { status: "unsupported-assembly" };

  // The alternative base is given on the forward strand, hence the ":1"
  const region = `${chromosome.replace(/^chr/i, "")}:${position}-${position}:1/${alternative}`;
  const params = new URLSearchParams({
    "content-type": "application/json",
    canonical: "1",
    hgvs: "1",
    uniprot: "1",
  });
  const response = await fetchWithRetry(
    `${server}/vep/human/region/${region}?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error("Ensembl VEP lookup failed: " + response.statusText);
  }

  const data = (await response.json()) as {
    transcript_consequences?: VepTranscriptConsequence[];
  }[];
  const transcript = data[0]?.transcript_consequences?.find(
    (t) => t.canonical === 1 && t.gene_symbol === geneSymbol,
  );
  if (!transcript) return { status: "no-transcript" };

  const proteinChange = transcript.hgvsp?.split(":")[1];

  return {
    status: "found",
    consequence: {
      consequence: transcript.consequence_terms
        .map((term) => term.replaceAll("_", " "))
        .join(", "),
      proteinChange: proteinChange ? decodeURIComponent(proteinChange) : null,
      residue: transcript.protein_start ?? null,
      referenceAminoAcid: transcript.amino_acids?.split("/")[0] ?? null,
      accession: transcript.swissprot?.[0]?.split(".")[0] ?? null,
    },
  };
}
