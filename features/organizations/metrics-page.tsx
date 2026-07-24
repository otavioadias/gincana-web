"use client";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, DatabaseZap } from "lucide-react";
import { Card, PageHeading } from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/states";
import { apiUrl } from "@/lib/api-client";
import { systemService } from "@/lib/services";
export function MetricsPage() {
  const health = useQuery({ queryKey: ["health"], queryFn: systemService.health, refetchInterval: 30_000 });
  if (health.isLoading) return <LoadingState />; if (health.error) return <ErrorState error={health.error} />;
  return <><PageHeading eyebrow="Operação técnica" title="Saúde da plataforma" description="Sinais técnicos públicos do gincana-api, sem expor dados de organizações." /><section className="metric-grid"><Card className="metric-card"><span className="metric-icon metric-green"><CheckCircle2 /></span><div><span>API</span><strong>Online</strong><small>{apiUrl()}</small></div></Card><Card className="metric-card"><span className="metric-icon metric-blue"><Activity /></span><div><span>Última verificação</span><strong>{new Date().toLocaleTimeString("pt-BR")}</strong><small>Atualização automática a cada 30s</small></div></Card><Card className="metric-card"><span className="metric-icon metric-amber"><DatabaseZap /></span><div><span>Resposta</span><strong>{String(health.data?.status ?? "ok")}</strong><small>Endpoint /health</small></div></Card></section><Card className="technical-json"><p className="eyebrow">Resposta técnica</p><pre>{JSON.stringify(health.data, null, 2)}</pre></Card></>;
}
