import {
  genes, essentiality, genePairs,
  type Gene, type Essentiality, type GenePair,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, or, like, sql, and, gte, lte, asc, desc } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

export const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = OFF");
sqlite.pragma("cache_size = -64000"); // 64MB

export const db = drizzle(sqlite);

let importComplete = false;

export function isImportComplete(): boolean {
  return importComplete;
}

export async function importData(): Promise<void> {
  // Check if data already exists
  const geneCount = db.select({ count: sql<number>`count(*)` }).from(genes).get();
  if (geneCount && geneCount.count > 0) {
    console.log("Data already imported, skipping...");
    importComplete = true;
    return;
  }

  console.log("Starting data import...");
  const dataDir = path.resolve("../dual_tnseq_data/small");

  // Import genes
  console.log("Importing genes...");
  const genesFile = fs.readFileSync(path.join(dataDir, "genes.tab"), "utf-8");
  const genesLines = genesFile.trim().split("\n");
  const genesHeader = genesLines[0].split("\t");
  
  const geneRows: any[] = [];
  for (let i = 1; i < genesLines.length; i++) {
    const cols = genesLines[i].split("\t");
    geneRows.push({
      locusId: cols[0],
      sysName: cols[1],
      type: cols[2],
      scaffoldId: cols[3],
      begin: parseInt(cols[4]) || 0,
      end: parseInt(cols[5]) || 0,
      strand: cols[6],
      name: cols[7] || null,
      desc: cols[8] || null,
    });
  }
  
  // Batch insert genes
  for (let i = 0; i < geneRows.length; i += 500) {
    const batch = geneRows.slice(i, i + 500);
    db.insert(genes).values(batch).run();
  }
  console.log(`Imported ${geneRows.length} genes`);

  // Import essentiality
  console.log("Importing essentiality...");
  const essFile = fs.readFileSync(path.join(dataDir, "esstable"), "utf-8");
  const essLines = essFile.trim().split("\n");
  
  const essRows: any[] = [];
  for (let i = 1; i < essLines.length; i++) {
    const cols = essLines[i].split("\t");
    essRows.push({
      locusId: cols[0],
      ess: cols[21] === "TRUE",
    });
  }
  
  for (let i = 0; i < essRows.length; i += 500) {
    const batch = essRows.slice(i, i + 500);
    db.insert(essentiality).values(batch).run();
  }
  console.log(`Imported ${essRows.length} essentiality records`);

  // Import gene pairs (large file - use raw SQL for speed)
  console.log("Importing gene pairs (this may take a moment)...");
  const pairsFile = fs.readFileSync(path.join(dataDir, "genepair_stats.tsv"), "utf-8");
  const pairsLines = pairsFile.split("\n");
  
  const insertStmt = sqlite.prepare(
    `INSERT INTO gene_pairs (locusId1, locusId2, nStrains, expectStrainsAdj, strainRatio, zStrains, nReads, expectReadsAdj, readRatio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMany = sqlite.transaction((rows: string[][]) => {
    for (const cols of rows) {
      insertStmt.run(
        cols[0], cols[1],
        parseInt(cols[2]) || 0,
        parseFloat(cols[3]) || 0,
        parseFloat(cols[4]) || 0,
        parseFloat(cols[5]) || 0,
        parseInt(cols[6]) || 0,
        parseFloat(cols[7]) || 0,
        parseFloat(cols[8]) || 0,
      );
    }
  });

  let batch: string[][] = [];
  let totalInserted = 0;
  
  for (let i = 1; i < pairsLines.length; i++) {
    const line = pairsLines[i].trim();
    if (!line) continue;
    const cols = line.split("\t");
    if (cols.length < 9) continue;
    batch.push(cols);
    
    if (batch.length >= 5000) {
      insertMany(batch);
      totalInserted += batch.length;
      if (totalInserted % 100000 === 0) {
        console.log(`  ...inserted ${totalInserted} gene pairs`);
      }
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    insertMany(batch);
    totalInserted += batch.length;
  }
  
  console.log(`Imported ${totalInserted} gene pairs`);
  importComplete = true;
  console.log("Data import complete!");
}

export interface IStorage {
  getAllGenes(): Gene[];
  searchGenes(query: string): (Gene & { ess?: boolean })[];
  getGene(locusId: string): (Gene & { ess?: boolean }) | undefined;
  getGenePair(gene1: string, gene2: string): GenePair | undefined;
  getInteractions(locusId: string, sort: string, order: string, limit: number, offset: number, minZ?: number, maxZ?: number, minStrains?: number): { data: any[], total: number };
  getTopInteractions(type: string, limit: number, offset: number): { data: any[], total: number };
  getStats(): { totalGenes: number, totalPairs: number, strongNegative: number, strongPositive: number };
}

export class DatabaseStorage implements IStorage {
  getAllGenes(): Gene[] {
    return db.select().from(genes).all();
  }

  searchGenes(query: string): (Gene & { ess?: boolean })[] {
    const q = `%${query}%`;
    const results = sqlite.prepare(`
      SELECT g.*, e.ess 
      FROM genes g
      LEFT JOIN essentiality e ON g.locusId = e.locusId
      WHERE g.locusId LIKE ? OR g."desc" LIKE ? OR g.sysName LIKE ? OR g.name LIKE ?
      LIMIT 50
    `).all(q, q, q, q) as any[];
    return results;
  }

  getGene(locusId: string): (Gene & { ess?: boolean }) | undefined {
    const result = sqlite.prepare(`
      SELECT g.*, e.ess 
      FROM genes g
      LEFT JOIN essentiality e ON g.locusId = e.locusId
      WHERE g.locusId = ?
    `).get(locusId) as any;
    return result || undefined;
  }

  getGenePair(gene1: string, gene2: string): GenePair | undefined {
    const result = sqlite.prepare(`
      SELECT * FROM gene_pairs 
      WHERE (locusId1 = ? AND locusId2 = ?) OR (locusId1 = ? AND locusId2 = ?)
    `).get(gene1, gene2, gene2, gene1) as GenePair | undefined;
    return result;
  }

  getInteractions(locusId: string, sort: string = "zStrains", order: string = "asc", limit: number = 50, offset: number = 0, minZ?: number, maxZ?: number, minStrains?: number): { data: any[], total: number } {
    const validSorts = ["zStrains", "readRatio", "nStrains", "strainRatio", "nReads"];
    const sortCol = validSorts.includes(sort) ? sort : "zStrains";
    const sortOrder = order === "desc" ? "DESC" : "ASC";
    
    let whereClause = "(gp.locusId1 = ? OR gp.locusId2 = ?)";
    const params: any[] = [locusId, locusId];
    
    if (minZ !== undefined && !isNaN(minZ)) {
      whereClause += " AND gp.zStrains >= ?";
      params.push(minZ);
    }
    if (maxZ !== undefined && !isNaN(maxZ)) {
      whereClause += " AND gp.zStrains <= ?";
      params.push(maxZ);
    }
    if (minStrains !== undefined && !isNaN(minStrains)) {
      whereClause += " AND gp.nStrains >= ?";
      params.push(minStrains);
    }

    const countResult = sqlite.prepare(`
      SELECT count(*) as total FROM gene_pairs gp WHERE ${whereClause}
    `).get(...params) as any;

    const data = sqlite.prepare(`
      SELECT gp.*,
        CASE WHEN gp.locusId1 = ? THEN gp.locusId2 ELSE gp.locusId1 END as partnerId,
        g."desc" as partnerDesc
      FROM gene_pairs gp
      LEFT JOIN genes g ON g.locusId = (CASE WHEN gp.locusId1 = ? THEN gp.locusId2 ELSE gp.locusId1 END)
      WHERE ${whereClause}
      ORDER BY gp.${sortCol} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(locusId, locusId, ...params, limit, offset) as any[];

    return { data, total: countResult.total };
  }

  getTopInteractions(type: string = "negative", limit: number = 100, offset: number = 0): { data: any[], total: number } {
    let whereClause: string;
    let orderClause: string;

    if (type === "negative") {
      whereClause = "gp.zStrains <= -3";
      orderClause = "gp.zStrains ASC";
    } else if (type === "positive") {
      whereClause = "gp.zStrains >= 3";
      orderClause = "gp.zStrains DESC";
    } else {
      whereClause = "(gp.zStrains <= -3 OR gp.zStrains >= 3)";
      orderClause = "ABS(gp.zStrains) DESC";
    }

    const countResult = sqlite.prepare(`
      SELECT count(*) as total FROM gene_pairs gp WHERE ${whereClause}
    `).get() as any;

    const data = sqlite.prepare(`
      SELECT gp.*,
        g1."desc" as desc1,
        g2."desc" as desc2
      FROM gene_pairs gp
      LEFT JOIN genes g1 ON g1.locusId = gp.locusId1
      LEFT JOIN genes g2 ON g2.locusId = gp.locusId2
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `).all(limit, offset) as any[];

    return { data, total: countResult.total };
  }

  getStats(): { totalGenes: number, totalPairs: number, strongNegative: number, strongPositive: number } {
    const totalGenes = (sqlite.prepare("SELECT count(*) as c FROM genes").get() as any).c;
    const totalPairs = (sqlite.prepare("SELECT count(*) as c FROM gene_pairs").get() as any).c;
    const strongNegative = (sqlite.prepare("SELECT count(*) as c FROM gene_pairs WHERE zStrains <= -3").get() as any).c;
    const strongPositive = (sqlite.prepare("SELECT count(*) as c FROM gene_pairs WHERE zStrains >= 3").get() as any).c;
    return { totalGenes, totalPairs, strongNegative, strongPositive };
  }
}

export const storage = new DatabaseStorage();
