"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { GoalStatusBadge } from "@/components/goals";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button, Card, PageHeading, Select } from "@/components/ui";
import { queryKeys } from "@/lib/query-keys";
import { adminDashboardService, campaignService } from "@/lib/services";
import { formatNumber } from "@/lib/utils";

export function AdminDashboardPage() {
  const [campaignId, setCampaignId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const campaigns = useQuery({
    queryKey: queryKeys.tenant(null, "campaigns"),
    queryFn: campaignService.list,
  });
  const teams = useQuery({
    queryKey: queryKeys.tenant(null, "admin-team-dashboard", campaignId),
    queryFn: () => adminDashboardService.list(campaignId || undefined),
  });
  const detail = useQuery({
    queryKey: queryKeys.tenant(null, "admin-team-dashboard-detail", {
      selectedTeamId,
      campaignId,
    }),
    queryFn: () => adminDashboardService.get(selectedTeamId, campaignId || undefined),
    enabled: Boolean(selectedTeamId),
  });

  const totals = useMemo(
    () => (teams.data ?? []).reduce(
      (result, team) => ({
        approvedPoints: result.approvedPoints + team.approvedPoints,
        pendingActions: result.pendingActions + team.pendingActions,
        disqualified: result.disqualified + Number(team.disqualified),
      }),
      { approvedPoints: 0, pendingActions: 0, disqualified: 0 },
    ),
    [teams.data],
  );

  if (campaigns.isLoading || teams.isLoading) return <LoadingState />;
  if (campaigns.error || teams.error) {
    return (
      <ErrorState
        error={campaigns.error ?? teams.error}
        retry={() => void Promise.all([campaigns.refetch(), teams.refetch()])}
      />
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="Administração da plataforma"
        title="Painel das equipes"
        description="Compare resultados, acompanhe pendências e identifique equipes desclassificadas pelo backend."
        action={(
          <Select
            value={campaignId}
            onChange={(event) => {
              setCampaignId(event.target.value);
              setSelectedTeamId("");
            }}
            aria-label="Filtrar painel por campanha"
          >
            <option value="">Campanha mais recente</option>
            {(campaigns.data ?? []).map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </Select>
        )}
      />
      <section className="metric-grid">
        <Card className="metric-card">
          <span className="metric-icon metric-blue"><Users /></span>
          <div><span>Equipes</span><strong>{teams.data?.length ?? 0}</strong><small>no painel atual</small></div>
        </Card>
        <Card className="metric-card">
          <span className="metric-icon metric-green"><Trophy /></span>
          <div><span>Pontos aprovados</span><strong>{formatNumber(totals.approvedPoints)}</strong><small>somatório oficial</small></div>
        </Card>
        <Card className="metric-card">
          <span className="metric-icon metric-amber"><ClipboardCheck /></span>
          <div><span>Ações pendentes</span><strong>{totals.pendingActions}</strong><small>{totals.disqualified} desclassificada(s)</small></div>
        </Card>
      </section>

      {(teams.data ?? []).length ? (
        <div className="admin-team-grid">
          {teams.data!.map((team) => (
            <Card key={team.team.id} className="admin-team-card">
              <div className="admin-team-heading">
                <div>
                  <p className="eyebrow">{team.team.slug}</p>
                  <h3>{team.team.name}</h3>
                </div>
                <span className={`availability ${team.disqualified ? "unavailable" : "available"}`}>
                  {team.disqualified ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                  {team.disqualified ? "Desclassificada" : "Regular"}
                </span>
              </div>
              <dl className="admin-team-facts">
                <div><dt>Pontos aprovados</dt><dd>{formatNumber(team.approvedPoints)}</dd></div>
                <div><dt>Ações aprovadas</dt><dd>{team.approvedActions}</dd></div>
                <div><dt>Pendentes</dt><dd>{team.pendingActions}</dd></div>
                <div><dt>Participantes</dt><dd>{team.activeParticipants}</dd></div>
              </dl>
              <Button type="button" variant="secondary" onClick={() => setSelectedTeamId(team.team.id)}>
                Ver acompanhamento <ChevronRight size={16} />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma equipe no painel"
          description="Crie uma equipe ou escolha outra campanha para visualizar os resultados."
        />
      )}

      {selectedTeamId ? (
        <div className="drawer-backdrop" onMouseDown={() => setSelectedTeamId("")}>
          <aside className="validation-drawer admin-team-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <p className="eyebrow">Acompanhamento oficial</p>
                <h2>{detail.data?.team.name ?? "Equipe"}</h2>
              </div>
              <button className="icon-button" onClick={() => setSelectedTeamId("")} aria-label="Fechar">
                <X />
              </button>
            </div>
            <div className="drawer-body">
              {detail.isLoading ? <LoadingState label="Carregando equipe…" /> : null}
              {detail.error ? <ErrorState error={detail.error} retry={() => void detail.refetch()} /> : null}
              {detail.data ? (
                <>
                  <div className="drawer-facts">
                    <div><span>Pontos</span><strong>{formatNumber(detail.data.approvedPoints)}</strong></div>
                    <div><span>Ações</span><strong>{detail.data.approvedActions}</strong></div>
                    <div><span>Participantes</span><strong>{detail.data.activeParticipants}</strong></div>
                  </div>
                  <Card className={detail.data.disqualified ? "admin-alert-card" : "admin-success-card"}>
                    {detail.data.disqualified ? <AlertTriangle /> : <CheckCircle2 />}
                    <div>
                      <strong>{detail.data.disqualified ? "Equipe desclassificada" : "Equipe regular"}</strong>
                      <p>Condição retornada diretamente pelo painel administrativo do backend.</p>
                    </div>
                  </Card>
                  <div>
                    <p className="drawer-label">Regularidade mensal</p>
                    <div className="regularity-list">
                      {detail.data.regularity.map((month) => (
                        <div key={month.month}>
                          <span>{month.month}</span>
                          <strong>{month.totalActions} / {month.minimumActions ?? 0} ações</strong>
                          <span className={`availability ${month.regular ? "available" : "unavailable"}`}>
                            {month.regular ? "Regular" : "Abaixo da meta"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="drawer-label">Metas</p>
                    <div className="admin-goal-list">
                      {detail.data.goals.map((goal) => (
                        <Card key={goal.id}>
                          <div><strong>{goal.title ?? "Meta"}</strong><span>{goal.type}</span></div>
                          {goal.progress ? (
                            <div>
                              <strong>{goal.progress.overallPercentage}%</strong>
                              <GoalStatusBadge status={goal.progress.status} />
                            </div>
                          ) : null}
                        </Card>
                      ))}
                      {!detail.data.goals.length ? <p className="muted-copy">Nenhuma meta para o filtro atual.</p> : null}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
