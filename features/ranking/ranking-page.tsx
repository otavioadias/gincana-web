"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Award,
  CalendarRange,
  Medal,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Card, PageHeading, Select } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";
import { ApiError, translateApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  campaignService,
  organizationService,
  rankingService,
} from "@/lib/services";
import {
  appRole,
  type MemberRankingEntry,
  type RankingEntry,
} from "@/lib/types";
import { formatDate, formatNumber, initials } from "@/lib/utils";

type RankingTab = "team" | "general";
const podiumOrder = [1, 0, 2];

function rankingError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Selecione uma equipe ativa para consultar o ranking interno.";
    if (error.status === 401) return "Sua sessão expirou. Entre novamente para acessar o ranking.";
    if (error.status === 403) return "Seu perfil não tem permissão para consultar este ranking.";
  }
  return translateApiError(error, "Não foi possível carregar o ranking.");
}

function RankingError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={new Error(rankingError(error))} retry={retry} />;
}

function TeamPhoto({ entry }: { entry: RankingEntry }) {
  if (entry.photoUrl) {
    return (
      // A URL do logo é assinada e temporária; não deve passar pelo otimizador do Next.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={entry.photoUrl} alt={`Logo da ${entry.name}`} />
    );
  }
  return <span>{initials(entry.name)}</span>;
}

function MemberAvatar({ entry }: { entry: MemberRankingEntry }) {
  return <span>{initials(entry.name)}</span>;
}

function GeneralRanking({
  entries,
  currentOrganizationId,
}: {
  entries: RankingEntry[];
  currentOrganizationId?: string | null;
}) {
  const podium = entries.slice(0, 3);
  if (!entries.length) {
    return (
      <EmptyState
        title="Nenhuma equipe no ranking"
        description="Ainda não há equipes ativas para o filtro selecionado."
      />
    );
  }
  return (
    <>
      <section className="ranking-podium" aria-label="Pódio da gincana">
        {podiumOrder.map((sourceIndex) => {
          const entry = podium[sourceIndex];
          if (!entry) return null;
          const current = entry.organizationId === currentOrganizationId;
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
            const current = entry.organizationId === currentOrganizationId;
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
  );
}

function MemberRanking({
  entries,
  currentUserId,
  teamName,
}: {
  entries: MemberRankingEntry[];
  currentUserId?: string;
  teamName: string;
}) {
  const currentMember = entries.find((entry) => entry.userId === currentUserId);
  if (!entries.length) {
    return (
      <EmptyState
        title="Nenhum integrante no ranking"
        description="Não há integrantes ativos para a equipe e campanha selecionadas."
      />
    );
  }
  return (
    <>
      <Card className="member-ranking-summary">
        <Users />
        <div><span>Equipe</span><strong>{teamName}</strong></div>
        <div><span>Integrantes ativos</span><strong>{entries.length}</strong></div>
        {currentMember ? (
          <div className="ranking-current-summary">
            <span>Sua posição</span>
            <strong>{currentMember.position}º · {formatNumber(currentMember.points)} pts</strong>
          </div>
        ) : null}
      </Card>
      <Card className="ranking-table-card">
        <div className="card-heading">
          <div><p className="eyebrow">Desempenho individual</p><h3>Ranking da equipe</h3></div>
          <UserRound />
        </div>
        <div className="member-ranking-table" role="table" aria-label={`Ranking interno da ${teamName}`}>
          <div className="member-ranking-head" role="row">
            <span>Posição</span><span>Integrante</span><span>Ações aprovadas</span><span>Atualização</span><span>Pontos</span>
          </div>
          {entries.map((entry) => {
            const current = entry.userId === currentUserId;
            return (
              <div
                key={entry.membershipId}
                className={`member-ranking-row${current ? " ranking-current-member" : ""}`}
                role="row"
              >
                <div className="ranking-position">
                  {entry.position <= 3 ? <Medal size={18} /> : null}
                  <strong>{entry.position}º</strong>
                </div>
                <div className="ranking-team">
                  <div className="member-ranking-avatar"><MemberAvatar entry={entry} /></div>
                  <div>
                    <strong>{entry.name}</strong>
                    <span>{current ? "Você" : "Integrante da equipe"}</span>
                  </div>
                </div>
                <strong className="member-approved-actions">{entry.approvedActions}</strong>
                <span>{entry.lastUpdatedAt ? formatDate(entry.lastUpdatedAt) : "Sem registros"}</span>
                <strong className="ranking-points">{formatNumber(entry.points)} pts</strong>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

export function RankingPage() {
  const { principal } = useSession();
  const role = appRole(principal);
  const isAdmin = role === "SUPER_ADMIN";
  const [tab, setTab] = useState<RankingTab>("team");
  const [campaignId, setCampaignId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const campaigns = useQuery({
    queryKey: queryKeys.tenant(null, "campaigns"),
    queryFn: campaignService.list,
  });
  const organizations = useQuery({
    queryKey: queryKeys.tenant(null, "ranking-organizations"),
    queryFn: organizationService.list,
    enabled: isAdmin,
  });
  const members = useQuery({
    queryKey: queryKeys.tenant(
      isAdmin ? organizationId || null : principal?.organizationId ?? null,
      "member-ranking",
      { campaignId },
    ),
    queryFn: () => rankingService.members(
      campaignId || undefined,
      isAdmin ? organizationId : undefined,
    ),
    enabled: tab === "team" && Boolean(principal) && (!isAdmin || Boolean(organizationId)),
  });
  const general = useQuery({
    queryKey: queryKeys.tenant(null, "ranking", campaignId),
    queryFn: () => rankingService.list(campaignId || undefined),
    enabled: tab === "general",
  });

  if (campaigns.isLoading || (isAdmin && organizations.isLoading)) {
    return <LoadingState label="Preparando o ranking…" />;
  }
  const setupError = campaigns.error ?? organizations.error;
  if (setupError) {
    return (
      <RankingError
        error={setupError}
        retry={() => void Promise.all([campaigns.refetch(), organizations.refetch()])}
      />
    );
  }

  const activeOrganizations = (organizations.data ?? []).filter(
    (organization) => organization.status === "ACTIVE",
  );
  const selectedCampaign = campaigns.data?.find((campaign) => campaign.id === campaignId);
  const generalEntries = general.data ?? [];
  const currentTeam = generalEntries.find(
    (entry) => entry.organizationId === principal?.organizationId,
  );

  return (
    <>
      <PageHeading
        eyebrow="Impacto coletivo"
        title="Ranking da gincana"
        description="Acompanhe o desempenho individual da sua equipe e a classificação geral oficial."
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

      <div className="ranking-tabs" role="tablist" aria-label="Visões do ranking">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "team"}
          className={tab === "team" ? "active" : ""}
          onClick={() => setTab("team")}
        >
          <Users size={17} /> Minha equipe
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "general"}
          className={tab === "general" ? "active" : ""}
          onClick={() => setTab("general")}
        >
          <Trophy size={17} /> Ranking geral
        </button>
      </div>

      <Card className="ranking-context">
        <CalendarRange />
        <div>
          <span>Campanha</span>
          <strong>{selectedCampaign?.name ?? "Todas as campanhas"}</strong>
        </div>
        <div>
          <span>Visão atual</span>
          <strong>{tab === "team" ? "Minha equipe" : "Ranking geral"}</strong>
        </div>
        {tab === "general" && currentTeam ? (
          <div className="ranking-current-summary">
            <span>Sua equipe</span>
            <strong>{currentTeam.position}º lugar · {formatNumber(currentTeam.points)} pts</strong>
          </div>
        ) : (
          <div>
            <span>Fonte da pontuação</span>
            <strong>Backend oficial</strong>
          </div>
        )}
      </Card>

      {tab === "team" ? (
        <>
          {isAdmin ? (
            <Card className="admin-ranking-team-picker">
              <ShieldCheck />
              <div>
                <strong>Selecione uma equipe ativa</strong>
                <span>A seleção será mantida ao alternar entre as abas.</span>
              </div>
              <Select
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                aria-label="Selecionar equipe para o ranking interno"
              >
                <option value="">Selecione uma equipe</option>
                {activeOrganizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </Select>
            </Card>
          ) : null}
          {isAdmin && !organizationId ? (
            <EmptyState
              title="Escolha uma equipe"
              description="A seleção é obrigatória para administradores consultarem o ranking interno."
            />
          ) : members.isLoading ? (
            <LoadingState label="Carregando o ranking da equipe…" />
          ) : members.error ? (
            <RankingError error={members.error} retry={() => void members.refetch()} />
          ) : members.data ? (
            <MemberRanking
              entries={members.data.ranking}
              currentUserId={isAdmin ? undefined : principal?.userId}
              teamName={members.data.team.name}
            />
          ) : null}
        </>
      ) : general.isLoading ? (
        <LoadingState label="Carregando o ranking geral…" />
      ) : general.error ? (
        <RankingError error={general.error} retry={() => void general.refetch()} />
      ) : (
        <GeneralRanking
          entries={generalEntries}
          currentOrganizationId={principal?.organizationId}
        />
      )}
    </>
  );
}
