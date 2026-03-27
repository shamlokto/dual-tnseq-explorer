import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Search, ScatterChart, Dna, Download, ArrowUpDown } from "lucide-react";

// Color for z-score
function zColor(z: number): string {
  if (z <= -5) return "#dc2626";
  if (z <= -3) return "#f97316";
  if (z >= 5) return "#2563eb";
  if (z >= 3) return "#60a5fa";
  return "#6b7280";
}

function zBgColor(z: number): string {
  if (z <= -5) return "rgba(220,38,38,0.15)";
  if (z <= -3) return "rgba(249,115,22,0.15)";
  if (z >= 5) return "rgba(37,99,235,0.15)";
  if (z >= 3) return "rgba(96,165,250,0.15)";
  return "rgba(107,114,128,0.08)";
}

function corrColor(r: number): string {
  if (r >= 0.6) return "#dc2626";
  if (r >= 0.3) return "#f97316";
  if (r <= -0.3) return "#2563eb";
  if (r <= -0.15) return "#60a5fa";
  return "#9ca3af";
}

interface ScatterPoint {
  partnerId: string;
  partnerDesc: string;
  zStrains: number;
  readRatio: number;
  strainRatio: number;
  nStrains: number;
  nReads: number;
}

interface Correlation {
  gene: string;
  desc: string;
  r: number;
  nShared: number;
}

export default function ScatterPlotPage() {
  const [, navigate] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [queryGene, setQueryGene] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ScatterPoint | null>(null);
  const [selectedCorr, setSelectedCorr] = useState<Set<string>>(new Set());
  const [corrSort, setCorrSort] = useState<"abs" | "pos" | "neg">("abs");
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Search genes
  const { data: searchResults } = useQuery<any[]>({
    queryKey: ["/api/genes/search", searchInput],
    queryFn: () => apiRequest("GET", `/api/genes/search?q=${encodeURIComponent(searchInput)}`).then(r => r.json()),
    enabled: searchInput.length >= 2,
  });

  // Scatter data
  const { data: scatterData, isLoading: scatterLoading } = useQuery<ScatterPoint[]>({
    queryKey: ["/api/scatter", queryGene],
    queryFn: () => apiRequest("GET", `/api/scatter/${queryGene}?minStrains=3`).then(r => r.json()),
    enabled: !!queryGene,
  });

  // Correlations
  const { data: corrData, isLoading: corrLoading } = useQuery<{ query: string; totalCompared: number; correlations: Correlation[] }>({
    queryKey: ["/api/correlations", queryGene],
    queryFn: () => apiRequest("GET", `/api/correlations/${queryGene}?top=50&minPartners=30`).then(r => r.json()),
    enabled: !!queryGene,
  });

  // Gene info
  const { data: geneInfo } = useQuery<any>({
    queryKey: ["/api/gene", queryGene],
    queryFn: () => apiRequest("GET", `/api/gene/${queryGene}`).then(r => r.json()),
    enabled: !!queryGene,
  });

  const handleSearch = useCallback((gene: string) => {
    setQueryGene(gene);
    setSearchInput(gene);
    setSelectedCorr(new Set());
  }, []);

  // Sort correlations
  const sortedCorrelations = useMemo(() => {
    if (!corrData?.correlations) return [];
    const arr = [...corrData.correlations];
    if (corrSort === "abs") arr.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    else if (corrSort === "pos") arr.sort((a, b) => b.r - a.r);
    else arr.sort((a, b) => a.r - b.r);
    return arr;
  }, [corrData, corrSort]);

  // SVG scatter plot dimensions
  const W = 680, H = 520;
  const margin = { top: 30, right: 20, bottom: 55, left: 65 };
  const pw = W - margin.left - margin.right;
  const ph = H - margin.top - margin.bottom;

  // Scales
  const xDomain = useMemo(() => {
    if (!scatterData || scatterData.length === 0) return [-10, 10];
    const zs = scatterData.map(d => d.zStrains);
    const min = Math.min(...zs, -5);
    const max = Math.max(...zs, 5);
    const pad = (max - min) * 0.05;
    return [min - pad, max + pad];
  }, [scatterData]);

  const yDomain = useMemo(() => {
    if (!scatterData || scatterData.length === 0) return [0, 3];
    const rs = scatterData.map(d => d.readRatio);
    const max = Math.min(Math.max(...rs, 2), 5); // cap at 5
    return [0, max * 1.05];
  }, [scatterData]);

  const xScale = useCallback((v: number) => margin.left + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * pw, [xDomain, pw]);
  const yScale = useCallback((v: number) => margin.top + ph - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * ph, [yDomain, ph]);

  // Highlighted gene set from correlation selection
  const highlightedGenes = selectedCorr;

  // Download SVG
  const downloadSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${queryGene}_scatter.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [queryGene]);

  // Mouse position for tooltip
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-page-title">
            <ScatterChart className="w-5 h-5 text-primary" />
            GI Scatter Plot & Correlation Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize genetic interactions and find genes with correlated GI profiles
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Enter a gene locus ID (e.g. SPD_0336) or keyword..."
              className="pl-10 font-mono"
              data-testid="input-gene-search"
            />
            {searchResults && searchResults.length > 0 && searchInput.length >= 2 && !queryGene?.startsWith(searchInput) && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.slice(0, 12).map((g: any) => (
                  <button
                    key={g.locusId}
                    className="w-full text-left px-4 py-2 hover:bg-accent text-sm flex items-center gap-3 border-b border-border/50 last:border-0"
                    onClick={() => handleSearch(g.locusId)}
                    data-testid={`search-result-${g.locusId}`}
                  >
                    <span className="font-mono font-medium text-primary">{g.locusId}</span>
                    <span className="text-muted-foreground truncate">{g.desc}</span>
                    {g.ess && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-auto">Essential</Badge>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!queryGene && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ScatterChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Search for a gene above to view its interaction scatter plot</p>
            <p className="text-xs mt-1">Try: SPD_0336 (PBP1a), SPD_0967 (MurZ), SPD_1925 (PBP1b)</p>
          </CardContent>
        </Card>
      )}

      {queryGene && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
          {/* Left: Scatter plot */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Dna className="w-4 h-4 text-primary" />
                    <Link href={`/gene/${queryGene}`} className="text-primary hover:underline font-mono">
                      {queryGene}
                    </Link>
                    {geneInfo && <span className="text-muted-foreground font-normal text-sm">— {geneInfo.desc}</span>}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {scatterData ? `${scatterData.length} interaction partners` : "Loading..."}
                    {" · "}readRatio vs zStrains
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadSVG} data-testid="button-download-svg">
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  SVG
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {scatterLoading ? (
                <Skeleton className="w-full h-[520px]" />
              ) : (
                <div className="relative">
                  <svg
                    ref={svgRef}
                    width={W}
                    height={H}
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full h-auto"
                    style={{ maxWidth: W }}
                    onMouseMove={(e) => {
                      const rect = (e.target as SVGElement).closest("svg")?.getBoundingClientRect();
                      if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                  >
                    {/* Background */}
                    <rect x={margin.left} y={margin.top} width={pw} height={ph} fill="var(--color-card, #1c1b19)" rx="4" />

                    {/* Grid lines */}
                    {[-5, -3, 0, 3, 5].filter(v => v >= xDomain[0] && v <= xDomain[1]).map(v => (
                      <g key={`xg-${v}`}>
                        <line x1={xScale(v)} y1={margin.top} x2={xScale(v)} y2={margin.top + ph}
                          stroke={v === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}
                          strokeWidth={v === 0 ? 1 : 0.5}
                          strokeDasharray={v === 0 ? "" : "4,4"} />
                      </g>
                    ))}
                    {[0.2, 0.5, 1.0, 1.5, 2.0].filter(v => v <= yDomain[1]).map(v => (
                      <g key={`yg-${v}`}>
                        <line x1={margin.left} y1={yScale(v)} x2={margin.left + pw} y2={yScale(v)}
                          stroke={v === 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}
                          strokeWidth={v === 1 ? 1 : 0.5}
                          strokeDasharray={v === 1 ? "" : "4,4"} />
                      </g>
                    ))}

                    {/* Threshold shading */}
                    {xScale(-3) > margin.left && (
                      <rect x={margin.left} y={margin.top} width={Math.max(0, xScale(-3) - margin.left)} height={ph}
                        fill="rgba(220,38,38,0.04)" />
                    )}
                    {xScale(3) < margin.left + pw && (
                      <rect x={xScale(3)} y={margin.top} width={Math.max(0, margin.left + pw - xScale(3))} height={ph}
                        fill="rgba(37,99,235,0.04)" />
                    )}

                    {/* Data points */}
                    {scatterData && scatterData.map((d, i) => {
                      const cx = xScale(d.zStrains);
                      const cy = yScale(Math.min(d.readRatio, yDomain[1]));
                      const isHighlighted = highlightedGenes.has(d.partnerId);
                      const isHovered = hoveredPoint?.partnerId === d.partnerId;
                      const r = isHighlighted ? 4.5 : isHovered ? 5 : 2.2;
                      const opacity = isHighlighted ? 1 : (highlightedGenes.size > 0 ? 0.15 : 0.5);
                      const color = isHighlighted ? "#22d3ee" : zColor(d.zStrains);

                      return (
                        <circle
                          key={i}
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill={color}
                          opacity={opacity}
                          stroke={isHighlighted ? "#fff" : "none"}
                          strokeWidth={isHighlighted ? 1 : 0}
                          style={{ cursor: "pointer", transition: "r 0.15s, opacity 0.15s" }}
                          onMouseEnter={() => setHoveredPoint(d)}
                          onMouseLeave={() => setHoveredPoint(null)}
                          onClick={() => navigate(`/pair/${queryGene}/${d.partnerId}`)}
                        />
                      );
                    })}

                    {/* Labels for highlighted points */}
                    {scatterData && scatterData.filter(d => highlightedGenes.has(d.partnerId)).map((d, i) => {
                      const cx = xScale(d.zStrains);
                      const cy = yScale(Math.min(d.readRatio, yDomain[1]));
                      return (
                        <text key={`label-${i}`} x={cx + 6} y={cy - 6}
                          fill="#22d3ee" fontSize="9" fontFamily="monospace" fontWeight="bold">
                          {d.partnerId}
                        </text>
                      );
                    })}

                    {/* X-axis ticks */}
                    {Array.from({ length: 11 }, (_, i) => {
                      const v = Math.round(xDomain[0]) + i * Math.ceil((xDomain[1] - xDomain[0]) / 10);
                      if (v > xDomain[1]) return null;
                      return (
                        <text key={`xt-${i}`} x={xScale(v)} y={H - margin.bottom + 18}
                          fill="var(--muted-foreground, #888)" fontSize="10" textAnchor="middle" fontFamily="monospace">
                          {v}
                        </text>
                      );
                    })}

                    {/* Y-axis ticks */}
                    {[0, 0.2, 0.5, 1.0, 1.5, 2.0, 3.0].filter(v => v <= yDomain[1]).map(v => (
                      <text key={`yt-${v}`} x={margin.left - 8} y={yScale(v) + 4}
                        fill="var(--muted-foreground, #888)" fontSize="10" textAnchor="end" fontFamily="monospace">
                        {v}
                      </text>
                    ))}

                    {/* Axis labels */}
                    <text x={margin.left + pw / 2} y={H - 8}
                      fill="var(--muted-foreground, #aaa)" fontSize="12" textAnchor="middle" fontWeight="600">
                      zStrains (← synthetic lethal | suppression →)
                    </text>
                    <text x={14} y={margin.top + ph / 2}
                      fill="var(--muted-foreground, #aaa)" fontSize="12" textAnchor="middle" fontWeight="600"
                      transform={`rotate(-90, 14, ${margin.top + ph / 2})`}>
                      readRatio (observed / expected)
                    </text>

                    {/* Threshold labels */}
                    {xScale(-3) > margin.left && (
                      <text x={xScale(-3)} y={margin.top - 5} fill="#f97316" fontSize="9" textAnchor="middle" opacity="0.6">
                        z = -3
                      </text>
                    )}
                    {xScale(3) < margin.left + pw && (
                      <text x={xScale(3)} y={margin.top - 5} fill="#60a5fa" fontSize="9" textAnchor="middle" opacity="0.6">
                        z = 3
                      </text>
                    )}
                  </svg>

                  {/* Tooltip */}
                  {hoveredPoint && (
                    <div
                      className="absolute pointer-events-none z-50 bg-popover/95 border border-border rounded-lg shadow-xl px-3 py-2 text-xs max-w-[260px]"
                      style={{
                        left: Math.min(mousePos.x + 12, W - 200),
                        top: mousePos.y - 70,
                      }}
                    >
                      <div className="font-mono font-bold text-primary">{hoveredPoint.partnerId}</div>
                      <div className="text-muted-foreground mb-1 truncate">{hoveredPoint.partnerDesc}</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                        <span className="text-muted-foreground">zStrains:</span>
                        <span className="font-mono" style={{ color: zColor(hoveredPoint.zStrains) }}>
                          {hoveredPoint.zStrains.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground">readRatio:</span>
                        <span className="font-mono">{hoveredPoint.readRatio.toFixed(4)}</span>
                        <span className="text-muted-foreground">nStrains:</span>
                        <span className="font-mono">{hoveredPoint.nStrains}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Legend */}
              <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> z ≤ -5</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> -5 &lt; z ≤ -3</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" /> neutral</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> 3 ≤ z &lt; 5</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> z ≥ 5</span>
                {highlightedGenes.size > 0 && (
                  <span className="flex items-center gap-1 ml-2"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-white inline-block" /> correlated</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right: Correlated genes panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  GI Profile Correlations
                </span>
                <div className="flex gap-1">
                  {(["abs", "pos", "neg"] as const).map(s => (
                    <Button key={s} variant={corrSort === s ? "default" : "outline"} size="sm"
                      className="h-6 text-[10px] px-2" onClick={() => setCorrSort(s)}>
                      {s === "abs" ? "|r|" : s === "pos" ? "+r" : "-r"}
                    </Button>
                  ))}
                </div>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Genes whose GI profile is most similar to {queryGene}. Click to highlight on plot.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {corrLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  <p className="text-xs text-center text-muted-foreground pt-2">Computing correlations across ~1,500 genes...</p>
                </div>
              ) : (
                <ScrollArea className="h-[560px]">
                  <div className="divide-y divide-border">
                    {sortedCorrelations.map((c, i) => {
                      const isSelected = selectedCorr.has(c.gene);
                      return (
                        <button
                          key={c.gene}
                          className={`w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors ${isSelected ? "bg-cyan-500/10" : ""}`}
                          onClick={() => {
                            const next = new Set(selectedCorr);
                            if (next.has(c.gene)) next.delete(c.gene);
                            else next.add(c.gene);
                            setSelectedCorr(next);
                          }}
                          data-testid={`corr-gene-${c.gene}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-medium text-primary">{c.gene}</span>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">{c.desc}</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-mono text-sm font-bold" style={{ color: corrColor(c.r) }}>
                                {c.r > 0 ? "+" : ""}{c.r.toFixed(3)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">{c.nShared} shared</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
              {corrData && (
                <div className="p-3 border-t border-border text-xs text-muted-foreground">
                  Compared against {corrData.totalCompared?.toLocaleString()} genes · Top 50 shown
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
