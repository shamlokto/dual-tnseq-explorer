import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChevronLeft, ChevronRight, Download, Database } from "lucide-react";
import { getZScoreColor } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

export default function Browse() {
  const [type, setType] = useState("negative");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/top-interactions", type, page],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/top-interactions?type=${type}&limit=${pageSize}&offset=${page * pageSize}`);
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handleExportCSV = () => {
    if (!data?.data) return;
    const headers = ["locusId1", "locusId2", "zStrains", "readRatio", "strainRatio", "nStrains", "nReads", "desc1", "desc2"];
    const rows = data.data.map((row: any) =>
      headers.map(h => {
        const val = row[h];
        if (typeof val === "string" && val.includes(",")) return `"${val}"`;
        return val ?? "";
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `genetic_interactions_${type}_page${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-3 flex items-center gap-3">
        <SidebarTrigger data-testid="button-sidebar-trigger" />
        <div>
          <h1 className="text-lg font-semibold" data-testid="text-page-title">Browse Interactions</h1>
          <p className="text-xs text-muted-foreground">Explore strong genetic interactions genome-wide</p>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Controls */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Interaction type:</label>
                <Select value={type} onValueChange={(v) => { setType(v); setPage(0); }}>
                  <SelectTrigger className="w-48 h-8 text-sm" data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negative">Negative (z ≤ -3)</SelectItem>
                    <SelectItem value="positive">Positive (z ≥ 3)</SelectItem>
                    <SelectItem value="all">All strong (|z| ≥ 3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1" />

              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data?.data} data-testid="button-export-csv">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />
                {type === "negative" ? "Negative" : type === "positive" ? "Positive" : "All Strong"} Genetic Interactions
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {data?.total?.toLocaleString() || 0} total
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-12">#</TableHead>
                        <TableHead className="text-xs">Gene 1</TableHead>
                        <TableHead className="text-xs">Gene 2</TableHead>
                        <TableHead className="text-xs text-right">zStrains</TableHead>
                        <TableHead className="text-xs text-right">readRatio</TableHead>
                        <TableHead className="text-xs text-right">strainRatio</TableHead>
                        <TableHead className="text-xs text-right">nStrains</TableHead>
                        <TableHead className="text-xs text-right">nReads</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data?.map((row: any, i: number) => (
                        <TableRow key={row.id || `${row.locusId1}-${row.locusId2}`}>
                          <TableCell className="text-xs text-muted-foreground">
                            {page * pageSize + i + 1}
                          </TableCell>
                          <TableCell>
                            <Link href={`/gene/${row.locusId1}`} className="locus-link" data-testid={`link-browse-gene1-${i}`}>
                              {row.locusId1}
                            </Link>
                            <div className="text-xs text-muted-foreground truncate max-w-32">{row.desc1 || ""}</div>
                          </TableCell>
                          <TableCell>
                            <Link href={`/gene/${row.locusId2}`} className="locus-link" data-testid={`link-browse-gene2-${i}`}>
                              {row.locusId2}
                            </Link>
                            <div className="text-xs text-muted-foreground truncate max-w-32">{row.desc2 || ""}</div>
                          </TableCell>
                          <TableCell className={`font-mono text-sm text-right ${getZScoreColor(row.zStrains)}`}>
                            {row.zStrains?.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-right">{row.readRatio?.toFixed(4)}</TableCell>
                          <TableCell className="font-mono text-sm text-right">{row.strainRatio?.toFixed(4)}</TableCell>
                          <TableCell className="font-mono text-sm text-right">{row.nStrains}</TableCell>
                          <TableCell className="font-mono text-sm text-right">{row.nReads?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {(!data?.data || data.data.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
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
                      Page {page + 1} of {totalPages.toLocaleString()} ({data?.total?.toLocaleString()} results)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline" size="sm"
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                        data-testid="button-next-page"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
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
