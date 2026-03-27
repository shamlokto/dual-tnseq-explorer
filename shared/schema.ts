import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const genes = sqliteTable("genes", {
  locusId: text("locusId").primaryKey(),
  sysName: text("sysName"),
  type: text("type"),
  scaffoldId: text("scaffoldId"),
  begin: integer("begin"),
  end: integer("end"),
  strand: text("strand"),
  name: text("name"),
  desc: text("desc"),
});

export const essentiality = sqliteTable("essentiality", {
  locusId: text("locusId").primaryKey(),
  ess: integer("ess", { mode: "boolean" }),
});

export const genePairs = sqliteTable("gene_pairs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  locusId1: text("locusId1").notNull(),
  locusId2: text("locusId2").notNull(),
  nStrains: integer("nStrains"),
  expectStrainsAdj: real("expectStrainsAdj"),
  strainRatio: real("strainRatio"),
  zStrains: real("zStrains"),
  nReads: integer("nReads"),
  expectReadsAdj: real("expectReadsAdj"),
  readRatio: real("readRatio"),
}, (table) => ({
  locusIdx: index("idx_locus_pair").on(table.locusId1, table.locusId2),
  locus1Idx: index("idx_locus1").on(table.locusId1),
  locus2Idx: index("idx_locus2").on(table.locusId2),
  zStrainsIdx: index("idx_zstrains").on(table.zStrains),
}));

export const insertGeneSchema = createInsertSchema(genes);
export const insertEssentialitySchema = createInsertSchema(essentiality);
export const insertGenePairSchema = createInsertSchema(genePairs).omit({ id: true });

export type Gene = typeof genes.$inferSelect;
export type Essentiality = typeof essentiality.$inferSelect;
export type GenePair = typeof genePairs.$inferSelect;
export type InsertGene = z.infer<typeof insertGeneSchema>;
export type InsertEssentiality = z.infer<typeof insertEssentialitySchema>;
export type InsertGenePair = z.infer<typeof insertGenePairSchema>;
