import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, ArrowUpDown, ChevronLeft, ChevronRight, Dna, Filter } from "lucide-react";
import { getZScoreColor, formatNumber } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

export default function GeneDetail() {
  const [, params] = useRoute("/gene/:locusId");
  const locusId = params?.locusId || "";

  const [sort, setSort] = useState("zStrains");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(0);
  const [minZ, setMinZ] = useState("");
  const [maxZ, setMaxZ] = useState("");
  const [minStrains, setMinStrains] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 50;

  const { data: gene, isLoading: geneLoading } = useQuery<any>({
    queryKey: ["/api/gene", locusId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/gene/${locusId}`);
      return res.json();
    },
  });

  const queryParams = new URLSearchParams({
    sort, order, limit: String(pageSize), offset: String(page * pageSize),
    ...(minZ ? { minZ } : {}),
    ...(maxZ ? { maxZ } : {}),
    ...(minStrains ? { minStrains } : {}),
  });

  const { data: interactions, isLoading: interLoading } = useQuery<any>({
    queryKey: ["/api/interactions", locusId, sort, order, page, minZ, maxZ, minStrains],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/interactions/${locusId}?${queryParams}`);
      return res.json();
    },
  });

  const totalPages = interactions ? Math.ceil(interactions.total / pageSize) : 0;

  const handleSort = (col: string) => {
    if (sort === col) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(col);
      setOrder(col === "zStrains" ? "asc" : "desc");
    }
    setPage(0);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-3 flex items-center gap-3">
        <SidebarTrigger data-testid="button-sidebar-trigger" />
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold font-mono" data-testid="text-gene-id">{locusId}</h1>
          <p className="text-xs text-muted-foreground">Gene Detail</p>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Gene info card */}
        {geneLoading ? (
          <Skeleton className="h-32" />
        ) : gene ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-6">
                <div className="flex-1 min-w-64">
                  <div className="flex items-center gap-3 mb-3">
                    <Dna className="w-5 h-5 text-primary" />
                    <span className="font-mono text-lg font-bold text-primary" data-testid="text-gene-locus">{gene.locusId}</span>

                  </div>
                  <p className="text-sm mb-3" data-testid="text-gene-desc">{gene.desc || "No description available"}</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-muted-foreground">
                    <span>System name: <span className="font-mono text-foreground">{gene.sysName}</span></span>
                    <span>Scaffold: <span className="font-mono text-foreground">{gene.scaffoldId}</span></span>
                    <span>Position: <span className="font-mono text-foreground">{gene.begin?.toLocaleString()}–{gene.end?.toLocaleString()}</span></span>
                    <span>Strand: <span className="font-mono text-foreground">{gene.strand}</span></span>
                  </div>
                </div>

                {/* Interaction summary */}
                <div className="flex gap-4">
                  <SummaryBox label="Total Partners" value={interactions?.total} />
                  <SummaryBox label="Strong Neg (z ≤ -3)" value={
                    interactions?.data ? "—" : "—"
                  } note="See filter" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Gene not found: {locusId}
            </CardContent>
          </Card>
        )}

        {/* Interactions table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">All Interactions</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {interactions?.total?.toLocaleString() || 0} total pairs
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                >
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  Filters
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Min z:</label>
                  <Input
                    type="number"
                    value={minZ}
                    onChange={(e) => { setMinZ(e.target.value); setPage(0); }}
                    className="w-24 h-8 text-xs font-mono"
                    placeholder="-10"
                    data-testid="input-min-z"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Max z:</label>
                  <Input
                    type="number"
                    value={maxZ}
                    onChange={(e) => { setMaxZ(e.target.value); setPage(0); }}
                    className="w-24 h-8 text-xs font-mono"
                    placeholder="10"
                    data-testid="input-max-z"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Min strains:</label>
                  <Input
                    type="number"
                    value={minStrains}
                    onChange={(e) => { setMinStrains(e.target.value); setPage(0); }}
                    className="w-24 h-8 text-xs font-mono"
                    placeholder="0"
                    data-testid="input-min-strains"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setMinZ(""); setMaxZ(""); setMinStrains(""); setPage(0); }}>
                  Clear
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {interLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHead label="Partner Gene" col="partnerId" current={sort} order={order} onSort={handleSort} />
                        <TableHead className="text-xs">Description</TableHead>
                        <SortableHead label="zStrains" col="zStrains" current={sort} order={order} onSort={handleSort} />
                        <SortableHead label="readRatio" col="readRatio" current={sort} order={order} onSort={handleSort} />
                        <SortableHead label="nStrains" col="nStrains" current={sort} order={order} onSort={handleSort} />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interactions?.data?.map((row: any) => (
                        <TableRow key={row.partnerId || `${row.locusId1}-${row.locusId2}`}>
                          <TableCell>
                            <Link href={`/pair/${locusId}/${row.partnerId}`} className="locus-link" data-testid={`link-partner-${row.partnerId}`}>
                              {row.partnerId}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-60">
                            {row.partnerDesc || "—"}
                          </TableCell>
                          <TableCell className={`font-mono text-sm text-right ${getZScoreColor(row.zStrains)}`}>
                            {row.zStrains?.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-right">
                            {row.readRatio?.toFixed(4)}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-right">
                            {row.nStrains}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!interactions?.data || interactions.data.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                            No interactions found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline" size="sm"
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SortableHead({ label, col, current, order, onSort }: {
  label: string; col: string; current: string; order: string; onSort: (col: string) => void;
}) {
  return (
    <TableHead
      className="text-xs cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${current === col ? "text-primary" : "text-muted-foreground/40"}`} />
        {current === col && (
          <span className="text-primary text-[10px]">{order === "asc" ? "↑" : "↓"}</span>
        )}
      </div>
    </TableHead>
  );
}

function SummaryBox({ label, value, note }: { label: string; value: any; note?: string }) {
  return (
    <div className="text-center px-4 py-3 rounded-lg bg-muted/50 min-w-24">
      <div className="text-lg font-bold font-mono" data-testid={`text-summary-${label.toLowerCase().replace(/\s/g, '-')}`}>
        {value !== undefined ? (typeof value === "number" ? value.toLocaleString() : value) : "—"}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
