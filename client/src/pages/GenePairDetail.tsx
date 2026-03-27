import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Dna, ArrowRight } from "lucide-react";
import { getZScoreColor, getZScoreLabel, formatNumber } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

export default function GenePairDetail() {
  const [, params] = useRoute("/pair/:gene1/:gene2");
  const gene1 = params?.gene1 || "";
  const gene2 = params?.gene2 || "";

  const { data: pair, isLoading: pairLoading } = useQuery<any>({
    queryKey: ["/api/gene-pair", gene1, gene2],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/gene-pair/${gene1}/${gene2}`);
      return res.json();
    },
  });

  const { data: geneInfo1 } = useQuery<any>({
    queryKey: ["/api/gene", gene1],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/gene/${gene1}`);
      return res.json();
    },
  });

  const { data: geneInfo2 } = useQuery<any>({
    queryKey: ["/api/gene", gene2],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/gene/${gene2}`);
      return res.json();
    },
  });

  const zStrains = pair?.zStrains;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-3 flex items-center gap-3">
        <SidebarTrigger data-testid="button-sidebar-trigger" />
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">
            <span className="font-mono text-primary">{gene1}</span>
            <span className="mx-2 text-muted-foreground">×</span>
            <span className="font-mono text-primary">{gene2}</span>
          </h1>
          <p className="text-xs text-muted-foreground">Gene Pair Interaction</p>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {pairLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-64" />
          </div>
        ) : !pair ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground py-12">
              No interaction data found for {gene1} × {gene2}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Interaction strength banner */}
            <Card className="overflow-hidden">
              <div className={`h-1.5 ${
                zStrains < -5 ? "bg-red-500" :
                zStrains < -3 ? "bg-orange-500" :
                zStrains > 5 ? "bg-blue-600" :
                zStrains > 3 ? "bg-sky-400" :
                "bg-muted-foreground/30"
              }`} />
              <CardContent className="pt-6 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Interaction Strength</div>
                <div className={`text-3xl font-bold font-mono ${getZScoreColor(zStrains)}`} data-testid="text-pair-zscore">
                  z = {zStrains?.toFixed(3)}
                </div>
                <div className={`text-sm mt-1 ${getZScoreColor(zStrains)}`}>
                  {getZScoreLabel(zStrains)}
                </div>

                {/* Visual bar */}
                <div className="mt-4 max-w-md mx-auto">
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 rounded-full transition-all"
                      style={{
                        left: `${Math.max(0, Math.min(100, 50 + (zStrains / 20) * 50))}%`,
                        width: "4px",
                        backgroundColor: zStrains < -3 ? "hsl(0, 80%, 55%)" :
                                        zStrains > 3 ? "hsl(220, 80%, 55%)" :
                                        "hsl(var(--muted-foreground))",
                      }}
                    />
                    {/* Center marker */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-muted-foreground/30" />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>Synthetic lethal</span>
                    <span>Neutral</span>
                    <span>Suppression</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gene info cards side by side */}
            <div className="grid md:grid-cols-2 gap-4">
              <GeneInfoCard gene={geneInfo1} label="Gene 1" />
              <GeneInfoCard gene={geneInfo2} label="Gene 2" />
            </div>

            {/* Metrics grid */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Interaction Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <MetricBox label="zStrains" value={pair.zStrains?.toFixed(3)} color={getZScoreColor(pair.zStrains)} />
                  <MetricBox label="readRatio" value={pair.readRatio?.toFixed(4)} />
                  <MetricBox label="strainRatio" value={pair.strainRatio?.toFixed(4)} />
                  <MetricBox label="nStrains" value={pair.nStrains?.toLocaleString()} />
                  <MetricBox label="nReads" value={pair.nReads?.toLocaleString()} />
                  <MetricBox label="expectStrainsAdj" value={pair.expectStrainsAdj?.toFixed(2)} />
                  <MetricBox label="expectReadsAdj" value={pair.expectReadsAdj?.toFixed(2)} />
                </div>
              </CardContent>
            </Card>

            {/* Links to individual gene pages */}
            <div className="flex gap-4">
              <Link
                href={`/gene/${gene1}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
                data-testid="link-view-gene1"
              >
                <Dna className="w-4 h-4 text-primary" />
                View all interactions for <span className="font-mono text-primary">{gene1}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/gene/${gene2}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
                data-testid="link-view-gene2"
              >
                <Dna className="w-4 h-4 text-primary" />
                View all interactions for <span className="font-mono text-primary">{gene2}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GeneInfoCard({ gene, label }: { gene: any; label: string }) {
  if (!gene) return <Skeleton className="h-32" />;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
        <div className="flex items-center gap-2 mb-2">
          <Dna className="w-4 h-4 text-primary" />
          <Link href={`/gene/${gene.locusId}`} className="font-mono font-bold text-primary hover:underline" data-testid={`link-${label.toLowerCase().replace(/\s/g, '-')}-locus`}>
            {gene.locusId}
          </Link>

        </div>
        <p className="text-sm text-muted-foreground">{gene.desc || "No description"}</p>
        <div className="mt-2 text-xs text-muted-foreground">
          {gene.scaffoldId} : {gene.begin?.toLocaleString()}–{gene.end?.toLocaleString()} ({gene.strand})
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string | undefined; color?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground font-mono mb-1">{label}</div>
      <div className={`text-sm font-bold font-mono ${color || ""}`} data-testid={`text-metric-${label}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}
