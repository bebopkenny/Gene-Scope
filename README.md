# Gene Scope

Gene Scope is a project that uses the Evo2 model to check how likely DNA mutations are to cause disease. It has a Python backend for running predictions and a web app frontend for exploring genes and variants.

Live demo: https://bebopkenny.github.io/Gene-Scope/

## Project Layout

- `evo2_backend` – Modal app that runs Evo2 on a GPU and exposes FastAPI endpoints  
- `evo2_gene_predictor_frontend` – Next.js frontend for the user interface  
- `requirements.txt` – Python dependencies for the backend  

## What It Does

You can search for a gene (for example BRCA1), look at its reference sequence, and try out different single nucleotide variants. The backend uses Evo2 to predict whether a variant is more likely to be pathogenic or benign. If known ClinVar classifications are available, you can compare them with Evo2 predictions.

## Evo2 Model

Evo2 is a large open model trained on DNA sequences. It can predict the functional impact of genetic variation and also generate realistic sequences.  
- Evo2 GitHub: https://github.com/ArcInstitute/evo2  
- Evo2 Paper: https://www.biorxiv.org/content/10.1101/2025.02.18.638918v1.full  

## Features

- Predicts pathogenic or benign outcomes for single nucleotide variants  
- Shows prediction confidence  
- Lets you compare Evo2 results with ClinVar data, including ClinVar's review status stars  
- Evo2 likelihood track that scores every base in the loaded sequence window  
- 3D protein structure viewer (AlphaFold) colored by confidence, with the analyzed variant's residue marked  
- Plain-English tooltips for the genomics terms used in the app  
- "How to use" guide in the header that walks through the app in five steps  
- Genome assembly selector (for example hg38)  
- Search for genes or browse chromosomes  
- Web app built with Next.js, React, TypeScript, Tailwind, and Shadcn UI  
- 3D graphics with three.js (react-three-fiber) and 3Dmol.js  
- Backend built with Modal, FastAPI and Python  

## Getting Started

### Backend

The backend runs on [Modal](https://modal.com), which provides the GPU. Evo2 itself is installed inside the Modal image, so it does not need to be installed locally.

```bash
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\Activate.ps1   # Windows PowerShell

pip install -r requirements.txt
modal setup                 # one-time login

cd evo2_backend
modal run main.py           # runs one example variant against a temporary deployment
modal deploy main.py        # deploys the endpoints and prints their URLs
```

Deploying creates two endpoints, each with its own URL:

- `analyze_single_variant` – scores one variant  
- `score_region` – scores every base in a region (used by the likelihood track)  

### Frontend

Create `evo2_gene_predictor_frontend/.env` with the URL of the deployed `analyze_single_variant` endpoint:

```bash
NEXT_PUBLIC_ANALYZE_SINGLE_VARIANT_BASE_URL="<analyze_single_variant URL printed by modal deploy>"
```

The `score_region` URL is worked out from it by swapping `analyze-single-variant` for `score-region`. If your URLs do not follow that pattern, set `NEXT_PUBLIC_SCORE_REGION_URL` as well.

```bash
cd evo2_gene_predictor_frontend
npm install
npm run dev
```

## Quick API example

### Analyze a variant

POST to the `analyze_single_variant` URL. The position is 1-based and the alternative base is on the forward strand.

```bash
curl -X POST "$ANALYZE_SINGLE_VARIANT_URL" \
  -H "Content-Type: application/json" \
  -d '{"variant_position":43119628,"alternative":"G","genome":"hg38","chromosome":"chr17"}'
```

Python
```python
import requests

payload = {
    "variant_position": 43119628,
    "alternative": "G",
    "genome": "hg38",
    "chromosome": "chr17",
}
resp = requests.post(ANALYZE_SINGLE_VARIANT_URL, json=payload)
print(resp.status_code)
print(resp.json())
```

Response shape (values here are placeholders)
```json
{
  "position": 43119628,
  "reference": "A",
  "alternative": "G",
  "delta_score": -0.0025,
  "prediction": "Likely pathogenic",
  "classification_confidence": 0.7
}
```

### Score a region

POST to the `score_region` URL. `start` and `end` are 1-based and inclusive, and a region can be at most 10,000 bp.

```bash
curl -X POST "$SCORE_REGION_URL" \
  -H "Content-Type: application/json" \
  -d '{"start":43044295,"end":43045294,"genome":"hg38","chromosome":"chr17"}'
```

Response shape (values here are placeholders)
```json
{
  "start": 43044295,
  "end": 43045294,
  "scores": [-0.1021, -1.8734, -0.0456]
}
```

Each score is the log likelihood Evo2 gives that reference base, given the DNA before it on the forward strand. A score is `null` only when nothing comes before the base.

## Data Sources

- Genome assemblies and sequences: [UCSC Genome Browser API](https://api.genome.ucsc.edu)  
- Gene search, gene details and known variants: NCBI (Clinical Tables, E-utilities, [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/))  
- Protein lookup: [UniProt](https://www.uniprot.org)  
- Protein structures: [AlphaFold Protein Structure Database](https://alphafold.ebi.ac.uk) (CC BY 4.0)  
- Protein effect of a variant: [Ensembl VEP](https://rest.ensembl.org) (hg38 and hg19 only)  

## Disclaimer

This project is for learning and research only. Do not use it for medical decisions. Do not upload private or identifiable genomic data. Predictions are experimental and may be incorrect.
