import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, importData, isImportComplete, sqlite } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Trigger data import on startup
  importData().catch(err => console.error("Data import failed:", err));

  // Status endpoint
  app.get("/api/status", (_req, res) => {
    res.json({ ready: isImportComplete() });
  });

  // Stats endpoint
  app.get("/api/stats", (_req, res) => {
    if (!isImportComplete()) return res.json({ loading: true });
    const stats = storage.getStats();
    res.json(stats);
  });

  // List all genes
  app.get("/api/genes", (_req, res) => {
    if (!isImportComplete()) return res.json([]);
    const allGenes = storage.getAllGenes();
    res.json(allGenes);
  });

  // Search genes
  app.get("/api/genes/search", (req, res) => {
    if (!isImportComplete()) return res.json([]);
    const q = (req.query.q as string) || "";
    if (q.length < 2) return res.json([]);
    const results = storage.searchGenes(q);
    res.json(results);
  });

  // Gene detail
  app.get("/api/gene/:locusId", (req, res) => {
    if (!isImportComplete()) return res.status(503).json({ error: "Data still loading" });
    const gene = storage.getGene(req.params.locusId);
    if (!gene) return res.status(404).json({ error: "Gene not found" });
    res.json(gene);
  });

  // Gene pair detail
  app.get("/api/gene-pair/:gene1/:gene2", (req, res) => {
    if (!isImportComplete()) return res.status(503).json({ error: "Data still loading" });
    const pair = storage.getGenePair(req.params.gene1, req.params.gene2);
    if (!pair) return res.status(404).json({ error: "Gene pair not found" });
    res.json(pair);
  });

  // Interactions for a gene
  app.get("/api/interactions/:locusId", (req, res) => {
    if (!isImportComplete()) return res.status(503).json({ error: "Data still loading" });
    const { sort = "zStrains", order = "asc", limit = "50", offset = "0", minZ, maxZ, minStrains } = req.query;
    const result = storage.getInteractions(
      req.params.locusId,
      sort as string,
      order as string,
      Math.min(parseInt(limit as string) || 50, 500),
      parseInt(offset as string) || 0,
      minZ !== undefined ? parseFloat(minZ as string) : undefined,
      maxZ !== undefined ? parseFloat(maxZ as string) : undefined,
      minStrains !== undefined ? parseInt(minStrains as string) : undefined,
    );
    res.json(result);
  });

  // Top interactions genome-wide
  app.get("/api/top-interactions", (req, res) => {
    if (!isImportComplete()) return res.json({ data: [], total: 0 });
    const { type = "negative", limit = "100", offset = "0" } = req.query;
    const result = storage.getTopInteractions(
      type as string,
      Math.min(parseInt(limit as string) || 100, 500),
      parseInt(offset as string) || 0,
    );
    res.json(result);
  });

  // ============================================================
  // Scatter plot data for a gene (all partners with scores)
  // ============================================================
  app.get("/api/scatter/:locusId", (req, res) => {
    if (!isImportComplete()) return res.status(503).json({ error: "Data still loading" });
    const locusId = req.params.locusId;
    const minStrains = parseInt(req.query.minStrains as string) || 5;

    const data = sqlite.prepare(`
      SELECT 
        CASE WHEN gp.locusId1 = ? THEN gp.locusId2 ELSE gp.locusId1 END as partnerId,
        g."desc" as partnerDesc,
        gp.zStrains,
        gp.readRatio,
        gp.strainRatio,
        gp.nStrains,
        gp.nReads
      FROM gene_pairs gp
      LEFT JOIN genes g ON g.locusId = (CASE WHEN gp.locusId1 = ? THEN gp.locusId2 ELSE gp.locusId1 END)
      WHERE (gp.locusId1 = ? OR gp.locusId2 = ?) AND gp.nStrains >= ?
      ORDER BY gp.zStrains ASC
    `).all(locusId, locusId, locusId, locusId, minStrains) as any[];

    res.json(data);
  });

  // ============================================================
  // GI profile correlation for a gene against all others
  // ============================================================
  app.get("/api/correlations/:locusId", (req, res) => {
    if (!isImportComplete()) return res.status(503).json({ error: "Data still loading" });
    const locusId = req.params.locusId;
    const minPartners = parseInt(req.query.minPartners as string) || 30;
    const topN = parseInt(req.query.top as string) || 50;

    const queryProfile = new Map<string, number>();
    const qRows = sqlite.prepare(`
      SELECT 
        CASE WHEN locusId1 = ? THEN locusId2 ELSE locusId1 END as partner,
        zStrains
      FROM gene_pairs
      WHERE (locusId1 = ? OR locusId2 = ?) AND nStrains >= 5
    `).all(locusId, locusId, locusId) as any[];

    for (const row of qRows) {
      queryProfile.set(row.partner, row.zStrains);
    }

    if (queryProfile.size < 20) {
      return res.json({ query: locusId, correlations: [], message: "Insufficient interaction data" });
    }

    const allGenesList = sqlite.prepare(`
      SELECT DISTINCT locusId1 as g FROM gene_pairs WHERE nStrains >= 5
      UNION
      SELECT DISTINCT locusId2 as g FROM gene_pairs WHERE nStrains >= 5
    `).all() as any[];

    const allGenes = allGenesList.map((r: any) => r.g).filter((g: string) => g !== locusId);

    const correlations: { gene: string; desc: string; r: number; nShared: number }[] = [];

    const stmt = sqlite.prepare(`
      SELECT 
        CASE WHEN locusId1 = ? THEN locusId2 ELSE locusId1 END as partner,
        zStrains
      FROM gene_pairs
      WHERE (locusId1 = ? OR locusId2 = ?) AND nStrains >= 5
    `);

    for (const g of allGenes) {
      const rows = stmt.all(g, g, g) as any[];
      const sharedX: number[] = [];
      const sharedY: number[] = [];
      
      for (const row of rows) {
        const qz = queryProfile.get(row.partner);
        if (qz !== undefined && row.partner !== locusId) {
          sharedX.push(qz);
          sharedY.push(row.zStrains);
        }
      }

      if (sharedX.length < minPartners) continue;

      const n = sharedX.length;
      const sumX = sharedX.reduce((a, b) => a + b, 0);
      const sumY = sharedY.reduce((a, b) => a + b, 0);
      const sumXY = sharedX.reduce((a, x, i) => a + x * sharedY[i], 0);
      const sumX2 = sharedX.reduce((a, x) => a + x * x, 0);
      const sumY2 = sharedY.reduce((a, y) => a + y * y, 0);

      const num = n * sumXY - sumX * sumY;
      const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      
      if (den === 0) continue;
      const r = num / den;

      correlations.push({ gene: g, desc: "", r: Math.round(r * 10000) / 10000, nShared: n });
    }

    correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    const topCorrelations = correlations.slice(0, topN);
    for (const c of topCorrelations) {
      const gInfo = sqlite.prepare(`SELECT "desc" FROM genes WHERE locusId = ?`).get(c.gene) as any;
      c.desc = gInfo?.desc || "unknown";
    }

    res.json({ 
      query: locusId, 
      totalCompared: allGenes.length,
      correlations: topCorrelations 
    });
  });

  return httpServer;
}
