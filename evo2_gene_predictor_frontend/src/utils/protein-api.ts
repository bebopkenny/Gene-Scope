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

// Requests are shared, so work started before the viewer is on screen is not repeated
function shared<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  let pending = cache.get(key);
  if (!pending) {
    pending = load();
    cache.set(key, pending);
    // Forget failures so the next attempt asks again
    pending.catch(() => cache.delete(key));
  }
  return pending;
}

const structureLookups = new Map<string, Promise<ProteinStructureLookup>>();
const pdbDownloads = new Map<string, Promise<string>>();

export function fetchProteinStructure(
  geneId: string,
): Promise<ProteinStructureLookup> {
  return shared(structureLookups, geneId, () => lookUpProteinStructure(geneId));
}

async function lookUpProteinStructure(
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

export function fetchPdb(pdbUrl: string): Promise<string> {
  return shared(pdbDownloads, pdbUrl, () => downloadPdb(pdbUrl));
}

async function downloadPdb(pdbUrl: string): Promise<string> {
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
  // What other tools say about the same change, null where a tool has no score
  sift: PredictorCall | null;
  polyphen: PredictorCall | null;
  alphaMissense: PredictorCall | null;
  // CADD's scaled score, which comes without a category
  caddPhred: number | null;
}

export interface PredictorCall {
  // The tool's own wording, e.g. "probably damaging"
  prediction: string;
  score: number;
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
export async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
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
  sift_prediction?: string;
  sift_score?: number;
  polyphen_prediction?: string;
  polyphen_score?: number;
  cadd_phred?: number;
  alphamissense?: { am_class?: string; am_pathogenicity?: number };
}

function predictorCall(
  prediction: string | undefined,
  score: number | undefined,
): PredictorCall | null {
  if (prediction === undefined || score === undefined) return null;
  return { prediction: prediction.replaceAll("_", " "), score };
}

interface VariantQuery {
  position: number;
  alternative: string;
  genomeId: string;
  chromosome: string;
  geneSymbol: string;
}

const consequenceLookups = new Map<string, Promise<ProteinConsequenceLookup>>();

export function fetchProteinConsequence(
  variant: VariantQuery,
): Promise<ProteinConsequenceLookup> {
  const { genomeId, chromosome, position, alternative, geneSymbol } = variant;
  return shared(
    consequenceLookups,
    [genomeId, chromosome, position, alternative, geneSymbol].join(":"),
    () => lookUpProteinConsequence(variant),
  );
}

async function lookUpProteinConsequence({
  position,
  alternative,
  genomeId,
  chromosome,
  geneSymbol,
}: VariantQuery): Promise<ProteinConsequenceLookup> {
  const server = ENSEMBL_SERVERS[genomeId];
  if (!server) return { status: "unsupported-assembly" };

  // The alternative base is given on the forward strand, hence the ":1"
  const region = `${chromosome.replace(/^chr/i, "")}:${position}-${position}:1/${alternative}`;
  const params = new URLSearchParams({
    "content-type": "application/json",
    canonical: "1",
    hgvs: "1",
    uniprot: "1",
    AlphaMissense: "1",
    CADD: "1",
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
      sift: predictorCall(transcript.sift_prediction, transcript.sift_score),
      polyphen: predictorCall(
        transcript.polyphen_prediction,
        transcript.polyphen_score,
      ),
      alphaMissense: predictorCall(
        transcript.alphamissense?.am_class,
        transcript.alphamissense?.am_pathogenicity,
      ),
      caddPhred: transcript.cadd_phred ?? null,
    },
  };
}
