CREATE TABLE `essentiality` (
	`locusId` text PRIMARY KEY NOT NULL,
	`ess` integer
);
--> statement-breakpoint
CREATE TABLE `gene_pairs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`locusId1` text NOT NULL,
	`locusId2` text NOT NULL,
	`nStrains` integer,
	`expectStrainsAdj` real,
	`strainRatio` real,
	`zStrains` real,
	`nReads` integer,
	`expectReadsAdj` real,
	`readRatio` real
);
--> statement-breakpoint
CREATE INDEX `idx_locus_pair` ON `gene_pairs` (`locusId1`,`locusId2`);--> statement-breakpoint
CREATE INDEX `idx_locus1` ON `gene_pairs` (`locusId1`);--> statement-breakpoint
CREATE INDEX `idx_locus2` ON `gene_pairs` (`locusId2`);--> statement-breakpoint
CREATE INDEX `idx_zstrains` ON `gene_pairs` (`zStrains`);--> statement-breakpoint
CREATE TABLE `genes` (
	`locusId` text PRIMARY KEY NOT NULL,
	`sysName` text,
	`type` text,
	`scaffoldId` text,
	`begin` integer,
	`end` integer,
	`strand` text,
	`name` text,
	`desc` text
);
