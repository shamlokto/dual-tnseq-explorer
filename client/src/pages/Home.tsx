import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Dna, GitBranch, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getZScoreColor, formatNumber } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/stats"],
  });

  const { data: topNeg, isLoading: topNegLoading } = useQuery<any>({
    queryKey: ["/api/top-interactions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/top-interactions?type=negative&limit=20");
      return res.json();
    },
  });

  const { data: searchResults } = useQuery<any[]>({
    queryKey: ["/api/genes/search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await apiRequest("GET", `/api/genes/search?q=${encodeURIComponent(searchQuery)}`);
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const { data: status } = useQuery<any>({
    queryKey: ["/api/status"],
    refetchInterval: (query) => {
      if (query.state.data?.ready) return false;
      return 2000;
    },
  });

  const isReady = status?.ready;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center gap-3">
        <SidebarTrigger data-testid="button-sidebar-trigger" />
        <div>
          <h1 className="text-lg font-semibold" data-testid="text-page-title">Dual Tn-seq Explorer</h1>
          <p className="text-xs text-muted-foreground">S. pneumoniae D39 Genetic Interaction Atlas</p>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto space-y-8">
        {/* Loading indicator */}
        {!isReady && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">Importing data...</p>
                <p className="text-xs text-muted-foreground">Loading ~895K gene pair interactions. This takes a moment on first startup.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hero section */}
        <div className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Dna className="w-3.5 h-3.5" />
            Dual Transposon Sequencing
          </div>
          <h2 className="text-xl font-bold" data-testid="text-hero-heading">
            S. pneumoniae D39 Genetic Interaction Atlas
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Query ~895,000 gene pair interaction scores from dual Tn-seq profiling.
            <span className="block mt-1 italic text-xs">
              Zik et al., Science 389, eadt7685 (2025)
            </span>
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Genes"
            value={stats?.totalGenes}
            loading={statsLoading}
            icon={<Dna className="w-4 h-4" />}
          />
          <StatCard
            title="Gene Pairs"
            value={stats?.totalPairs}
            loading={statsLoading}
            icon={<GitBranch className="w-4 h-4" />}
          />
          <StatCard
            title="Strong Negative GIs"
            value={stats?.strongNegative}
            loading={statsLoading}
            icon={<TrendingDown className="w-4 h-4" />}
            accent="text-red-500"
            subtitle="z ≤ -3"
          />
          <StatCard
            title="Strong Positive GIs"
            value={stats?.strongPositive}
            loading={statsLoading}
            icon={<TrendingUp className="w-4 h-4" />}
            accent="text-blue-500"
            subtitle="z ≥ 3"
          />
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by gene locus ID (e.g. SPD_0336) or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 font-mono text-sm"
                data-testid="input-search"
              />
            </div>

            {/* Search results dropdown */}
            {searchResults && searchResults.length > 0 && (
              <div className="mt-3 border rounded-lg overflow-hidden" data-testid="search-results">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Locus ID</TableHead>
                      <TableHead className="text-xs">Description</TableHead>

                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.slice(0, 10).map((gene: any) => (
                      <TableRow
                        key={gene.locusId}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => { navigate(`/gene/${gene.locusId}`); setSearchQuery(""); }}
                      >
                        <TableCell className="font-mono text-sm text-primary" data-testid={`link-gene-${gene.locusId}`}>
                          {gene.locusId}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-xs">{gene.desc || "—"}</TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Negative GIs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Top 20 Strongest Negative Genetic Interactions
            </CardTitle>
            <p className="text-xs text-muted-foreground">Synthetic sick/lethal pairs ranked by z-score (most negative first)</p>
          </CardHeader>
          <CardContent>
            {topNegLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Rank</TableHead>
                      <TableHead className="text-xs">Gene 1</TableHead>
                      <TableHead className="text-xs">Gene 2</TableHead>
                      <TableHead className="text-xs text-right">zStrains</TableHead>
                      <TableHead className="text-xs text-right">readRatio</TableHead>
                      <TableHead className="text-xs text-right">nStrains</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topNeg?.data?.map((pair: any, i: number) => (
                      <TableRow key={`${pair.locusId1}-${pair.locusId2}`}>
                        <TableCell className="text-xs text-muted-foreground w-12">{i + 1}</TableCell>
                        <TableCell>
                          <Link href={`/gene/${pair.locusId1}`} className="locus-link" data-testid={`link-topneg-gene1-${i}`}>
                            {pair.locusId1}
                          </Link>
                          <div className="text-xs text-muted-foreground truncate max-w-40">{pair.desc1 || ""}</div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/gene/${pair.locusId2}`} className="locus-link" data-testid={`link-topneg-gene2-${i}`}>
                            {pair.locusId2}
                          </Link>
                          <div className="text-xs text-muted-foreground truncate max-w-40">{pair.desc2 || ""}</div>
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${getZScoreColor(pair.zStrains)}`} data-testid={`text-zscore-${i}`}>
                          {pair.zStrains?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {pair.readRatio?.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {pair.nStrains}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, loading, icon, accent, subtitle }: {
  title: string; value: any; loading: boolean; icon: any; accent?: string; subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-xs font-medium">{title}</span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className={`text-xl font-bold font-mono ${accent || ""}`} data-testid={`text-stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
            {value !== undefined ? Number(value).toLocaleString() : "—"}
          </div>
        )}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
