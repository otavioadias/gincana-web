"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, CalendarRange, Medal, Trophy } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Card, PageHeading, Select } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";
import { queryKeys } from "@/lib/query-keys";
import { campaignService, rankingService } from "@/lib/services";
import type { RankingEntry } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

const podiumOrder = [1, 0, 2];

function TeamPhoto({ entry }: { entry: RankingEntry }) {
  if (entry.photoUrl) {
    return (
      // A URL do logo é assinada e temporária; não deve passar pelo otimizador do Next.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={entry.photoUrl} alt={`Logo da ${entry.name}`} />
    );
  }
  return <span>{entry.name.slice(0, 2).toUpperCase()}</span>;
}

export function RankingPage() {
  const { principal } = useSession();
  const [campaignId, setCampaignId] = useState("");
  const campaigns = useQuery({
    queryKey: queryKeys.tenant(null, "campaigns"),
    queryFn: campaignService.list,
  });
  const ranking = useQuery({
    queryKey: queryKeys.tenant(null, "ranking", campaignId),
    queryFn: () => rankingService.list(campaignId || undefined),
  });

  if (campaigns.isLoading || ranking.isLoading) return <LoadingState label="Montando a classificação…" />;
  if (campaigns.error || ranking.error) {
    return (
      <ErrorState
        error={campaigns.error ?? ranking.error}
        retry={() => void Promise.all([campaigns.refetch(), ranking.refetch()])}
      />
    );
  }

  const entries = ranking.data ?? [];
  const podium = entries.slice(0, 3);
  const currentTeam = entries.find((entry) => entry.organizationId === principal?.organizationId);
  const selectedCampaign = campaigns.data?.find((campaign) => campaign.id === campaignId);

  return (
    <>
      <PageHeading
        eyebrow="Impacto coletivo"
        title="Ranking da gincana"
        description="Classificação geral calculada pelo backend com os pontos aprovados de todas as equipes."
        action={(
          <Select
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            aria-label="Filtrar ranking por campanha"
          >
            <option value="">Todas as campanhas</option>
            {(campaigns.data ?? []).map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </Select>
        )}
      />

      <Card className="ranking-context">
        <CalendarRange />
        <div>
          <span>Classificação exibida</span>
          <strong>{selectedCampaign?.name ?? "Todas as campanhas"}</strong>
        </div>
        <div>
          <span>Equipes participantes</span>
          <strong>{entries.length}</strong>
        </div>
        {currentTeam ? (
          <div className="ranking-current-summary">
            <span>Sua equipe</span>
            <strong>{currentTeam.position}º lugar · {formatNumber(currentTeam.points)} pts</strong>
          </div>
        ) : null}
      </Card>

      {entries.length ? (
        <>
          <section className="ranking-podium" aria-label="Pódio da gincana">
            {podiumOrder.map((sourceIndex) => {
              const entry = podium[sourceIndex];
              if (!entry) return null;
              const current = entry.organizationId === principal?.organizationId;
              return (
                <Card
                  key={entry.organizationId}
                  className={`podium-card podium-position-${entry.position}${current ? " ranking-current-team" : ""}`}
                >
                  <div className="podium-medal">
                    {entry.position === 1 ? <Trophy /> : <Medal />}
                    <strong>{entry.position}º</strong>
                  </div>
                  <div className="ranking-team-photo"><TeamPhoto entry={entry} /></div>
                  <div>
                    <h2>{entry.name}</h2>
                    <span>@{entry.slug}</span>
                  </div>
                  <strong className="podium-points">{formatNumber(entry.points)} pts</strong>
                  {current ? <span className="ranking-you">Sua equipe</span> : null}
                </Card>
              );
            })}
          </section>

          <Card className="ranking-table-card">
            <div className="card-heading">
              <div><p className="eyebrow">Classificação completa</p><h3>Todas as equipes</h3></div>
              <Award />
            </div>
            <div className="ranking-table" role="table" aria-label="Classificação completa da gincana">
              <div className="ranking-table-head" role="row">
                <span>Posição</span><span>Equipe</span><span>Atualização</span><span>Pontos</span>
              </div>
              {entries.map((entry) => {
                const current = entry.organizationId === principal?.organizationId;
                return (
                  <div
                    key={entry.organizationId}
                    className={`ranking-row${current ? " ranking-current-team" : ""}`}
                    role="row"
                  >
                    <div className="ranking-position">
                      {entry.position <= 3 ? <Medal size={18} /> : null}
                      <strong>{entry.position}º</strong>
                    </div>
                    <div className="ranking-team">
                      <div className="ranking-team-photo"><TeamPhoto entry={entry} /></div>
                      <div>
                        <strong>{entry.name}</strong>
                        <span>@{entry.slug}{current ? " · Sua equipe" : ""}</span>
                      </div>
                    </div>
                    <span>{entry.lastUpdatedAt ? formatDate(entry.lastUpdatedAt) : "Sem registros"}</span>
                    <strong className="ranking-points">{formatNumber(entry.points)} pts</strong>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : (
        <EmptyState
          title="Nenhuma equipe no ranking"
          description="Ainda não há equipes ativas para o filtro selecionado."
        />
      )}
    </>
  );
}
