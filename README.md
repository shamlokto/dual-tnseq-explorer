# Dual Tn-seq Explorer

Interactive web application for querying and visualizing genetic interaction data from dual transposon sequencing in *Streptococcus pneumoniae* D39.

**Citation:** Zik JJ, Price MN, Arkin AP, Deutschbauer AM, Sham LT. Dual transposon sequencing profiles the genetic interaction landscape in bacteria. *Science* 389, eadt7685 (2025). [DOI: 10.1126/science.adt7685](https://doi.org/10.1126/science.adt7685)

---

## Features

- **Home** — Summary statistics, gene search, and top 20 strongest negative genetic interactions
- **Gene Detail** — View all interaction partners for any gene, sortable and paginated
- **Gene Pair Detail** — Inspect the interaction metrics between any two genes with a visual strength gauge
- **Browse** — Explore all strong genetic interactions genome-wide with filtering and CSV export
- **Scatter Plot** — Interactive readRatio vs zStrains scatter plot for any query gene
- **GI Profile Correlation** — On-the-fly Pearson correlation of a gene's GI profile against all ~1,500 genes in the dataset, identifying functionally related genes

## Data

The app loads data from the [Figshare repository](https://doi.org/10.6084/m9.figshare.29382974.v1):

- `genepair_stats.tsv` — 894,694 gene pair interaction scores
- `genes.tab` — 1,984 gene annotations for *S. pneumoniae* D39
- `esstable` — Gene essentiality predictions

On first startup, the server imports all data into a local SQLite database (~140 MB) with indexed queries for fast access.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ 
- Data files from [Figshare](https://doi.org/10.6084/m9.figshare.29382974.v1)

### Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/dual-tnseq-explorer.git
cd dual-tnseq-explorer

# Install dependencies
npm install

# Place data files
# Download small.zip from Figshare and extract into ../dual_tnseq_data/small/
# The directory should contain: genepair_stats.tsv, genes.tab, esstable

# Start the development server
npm run dev
```

The server starts on port 5000. On first launch, it automatically imports the TSV data into SQLite (takes ~30 seconds).

### Production Build

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

## Architecture

- **Backend:** Express.js + SQLite (better-sqlite3) + Drizzle ORM
- **Frontend:** React + Tailwind CSS + shadcn/ui + TanStack Query
- **Data:** ~895K gene pair rows indexed in SQLite for fast server-side pagination and correlation computation

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/stats` | Summary statistics |
| `GET /api/genes/search?q=xxx` | Search genes by locus ID or description |
| `GET /api/gene/:locusId` | Gene details with essentiality |
| `GET /api/gene-pair/:gene1/:gene2` | Specific gene pair interaction |
| `GET /api/interactions/:locusId` | All interactions for a gene (paginated) |
| `GET /api/top-interactions` | Top interactions genome-wide |
| `GET /api/scatter/:locusId` | Scatter plot data (all partners) |
| `GET /api/correlations/:locusId` | GI profile correlation against all genes |

## License

MIT

## Acknowledgments

Data from Zik et al. (2025), produced at the National University of Singapore and Lawrence Berkeley National Laboratory. Processed data available at [Figshare](https://doi.org/10.6084/m9.figshare.29382974.v1).
