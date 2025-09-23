# Gene Scope

Gene Scope is a small project that uses the Evo2 model to check how likely DNA mutations are to cause disease. It has a Python backend for running predictions and a web app frontend for exploring genes and variants.

## Project Layout

- `evo2_backend` – FastAPI backend that connects to Evo2 and returns predictions  
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
- Lets you compare Evo2 results with ClinVar data  
- Genome assembly selector (for example hg38)  
- Search for genes or browse chromosomes  
- Web app built with Next.js, React, TypeScript, Tailwind, and Shadcn UI  
- Backend built with FastAPI and Python  

## Getting Started

### Backend
```bash
cd evo2_backend
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\Activate.ps1   # Windows PowerShell

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
