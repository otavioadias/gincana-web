"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Heart,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, PageHeading, Select } from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/states";
import { GoalProgress } from "@/components/goal-progress";
import { ActivityAvailabilityBadge, ActivityAvailabilityDetails } from "@/components/activity-limits";
import { GoalStatusBadge } from "@/components/goals";
import { StatusBadge } from "@/components/status-badge";
import { useSession } from "@/features/auth/session-provider";
import { activityService, campaignService, dashboardService, goalService, submissionService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { appRole } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";
import { useState } from "react";

export function DashboardPage() {
  const { principal } = useSession();
  const [campaignId, setCampaignId] = useState("");
  const tenant = principal?.organizationId ?? null;
  const campaigns = useQuery({
    queryKey: queryKeys.tenant(tenant, "campaigns"),
    queryFn: campaignService.list,
  });
  const summary = useQuery({
    queryKey: queryKeys.tenant(tenant, "dashboard-summary", campaignId),
    queryFn: () => dashboardService.summary(campaignId || undefined),
  });
  const byActivity = useQuery({
    queryKey: queryKeys.tenant(tenant, "dashboard-activity", campaignId),
    queryFn: () => dashboardService.byActivity(campaignId || undefined),
  });
  const submissions = useQuery({
    queryKey: queryKeys.tenant(tenant, "submissions-recent"),
    queryFn: () => submissionService.list(),
  });
  const activities = useQuery({
    queryKey: queryKeys.tenant(tenant, "activities", { campaignId, actionDate: new Date().toISOString().slice(0, 10) }),
    queryFn: () => activityService.list(campaignId || undefined, new Date().toISOString().slice(0, 10)),
  });
  const featuredGoal = summary.data?.goals?.[0];
  const featuredProgress = useQuery({
    queryKey: queryKeys.tenant(tenant, "goal-progress", featuredGoal?.id),
    queryFn: () => goalService.progress(featuredGoal!.id),
    enabled: Boolean(featuredGoal?.id),
  });

  if (summary.isLoading || byActivity.isLoading || activities.isLoading) return <LoadingState />;
  if (summary.error || byActivity.error || activities.error) {
    return <ErrorState error={summary.error ?? byActivity.error ?? activities.error} retry={() => void Promise.all([summary.refetch(), byActivity.refetch(), activities.refetch()])} />;
  }

  const data = summary.data!;
  const role = appRole(principal);
  const goal = featuredGoal;
  const recent = [...(submissions.data ?? [])].slice(0, 5);
  const blockedActivities = (activities.data ?? []).filter(
    (activity) => activity.availability?.available === false,
  );

  return (
    <>
      <PageHeading
        eyebrow="Impacto coletivo"
        title="O bem está acontecendo por aqui"
        description="Acompanhe os resultados da equipe sem transformar solidariedade em competição."
        action={
          <div className="heading-filters">
            <Select aria-label="Filtrar por campanha" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
              <option value="">Todas as campanhas</option>
              {(campaigns.data ?? []).map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name ?? "Campanha"}</option>)}
            </Select>
            {role !== "SUPER_ADMIN" ? <Link href="/submissions/new" className="button button-primary"><Sparkles size={17} /> Registrar ação</Link> : null}
          </div>
        }
      />

      <Card className="celebration-banner">
        <div className="celebration-icon"><Heart fill="currentColor" /></div>
        <div>
          <p className="eyebrow">Andamento completo da equipe</p>
          <h2>{formatNumber(data.totalPoints)} pontos registrados</h2>
          <p>{formatNumber(data.approvedPoints)} aprovados e {formatNumber(data.pendingPoints)} aguardando confirmação final.</p>
        </div>
        <div className="celebration-spark">✦</div>
      </Card>
      {data.disqualified ? (
        <Card className="disqualification-alert" role="alert">
          <CircleSlashIcon />
          <div><strong>Equipe desclassificada</strong><p>O backend identificou um ou mais meses encerrados sem a regularidade mínima exigida.</p></div>
        </Card>
      ) : null}

      <section className="metric-grid" aria-label="Indicadores principais">
        <Card className="metric-card">
          <span className="metric-icon metric-green"><Heart /></span>
          <div><span>Andamento geral</span><strong>{formatNumber(data.totalPoints)}</strong><small>{data.totalActions} ações aprovadas ou pendentes</small></div>
        </Card>
        <Card className="metric-card">
          <span className="metric-icon metric-green"><CheckCircle2 /></span>
          <div><span>Pontos aprovados</span><strong>{formatNumber(data.approvedPoints)}</strong><small>{data.approvedActions} ações validadas</small></div>
        </Card>
        <Card className="metric-card">
          <span className="metric-icon metric-amber"><Clock3 /></span>
          <div><span>Pontos em análise</span><strong>{formatNumber(data.pendingPoints)}</strong><small>{data.pendingActions} ações aguardando</small></div>
        </Card>
        <Card className="metric-card">
          <span className="metric-icon metric-blue"><Sparkles /></span>
          <div><span>Meu andamento</span><strong>{formatNumber(data.myTotalPoints)}</strong><small>{data.myApprovedActions} aprovadas · {data.myPendingActions} pendentes</small></div>
        </Card>
        <Card className="metric-card">
          <span className="metric-icon metric-blue"><Users /></span>
          <div><span>Participação ativa</span><strong>{data.activeParticipants}</strong><small>pessoas em ações aprovadas ou pendentes</small></div>
        </Card>
      </section>

      <section className="dashboard-grid">
        <Card className="chart-card chart-wide">
          <div className="card-heading">
            <div><p className="eyebrow">Regularidade</p><h3>Um ritmo que se mantém</h3></div>
            <span className="soft-label">Aprovadas + pendentes / mês</span>
          </div>
          {data.regularity?.length ? (
            <>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.regularity}>
                    <defs><linearGradient id="impactFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--team-primary)" stopOpacity={0.24}/><stop offset="95%" stopColor="var(--team-primary)" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7ece9" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="totalActions" stroke="var(--team-primary)" strokeWidth={3} fill="url(#impactFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="regularity-months">
                {data.regularity.map((month) => (
                  <div key={month.month} className={month.regular ? "regular" : "pending"}>
                    <strong>{month.month}</strong>
                    <span>{month.approvedActions} aprovadas · {month.pendingActions} pendentes</span>
                    <small>
                      {month.regular
                        ? "Regular"
                        : `Pendente${month.minimumActions ? ` · mínimo ${month.minimumActions}` : ""}`}
                    </small>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="chart-empty">Os meses aparecerão aqui após a primeira ação enviada.</div>}
        </Card>

        <Card className="goal-card">
          <div className="card-heading">
            <div><p className="eyebrow">Meta do time</p><h3>{goal?.type === "WEEKLY" ? "Esta semana" : "Este ciclo"}</h3></div>
            <TargetIcon />
          </div>
          {goal ? (
            <>
              <h4>{goal.title}</h4>
              {featuredProgress.data ? <GoalStatusBadge status={featuredProgress.data.status} /> : null}
              {featuredProgress.isLoading ? <p className="muted-copy">Carregando progresso oficial…</p> : null}
              {featuredProgress.data?.targets.points ? <GoalProgress label="Pontos" current={featuredProgress.data.achieved.points} target={featuredProgress.data.targets.points} /> : null}
              {featuredProgress.data?.targets.actions ? <GoalProgress label="Ações" current={featuredProgress.data.achieved.actions} target={featuredProgress.data.targets.actions} kind="ações" /> : null}
              {featuredProgress.data?.targets.participants ? <GoalProgress label="Participantes" current={featuredProgress.data.achieved.participants} target={featuredProgress.data.targets.participants} kind="participantes" /> : null}
              {featuredProgress.data?.targets.quantity ? <GoalProgress label="Quantidade" current={featuredProgress.data.achieved.quantity} target={featuredProgress.data.targets.quantity} kind={goal.unit ?? "unidades"} /> : null}
              <p className="supportive-copy">Sem pressão: a meta serve como direção para celebrar o avanço coletivo.</p>
            </>
          ) : <p className="muted-copy">Ainda não há uma meta configurada para esta campanha.</p>}
        </Card>

        <Card className="chart-card chart-wide">
          <div className="card-heading"><div><p className="eyebrow">Por atividade</p><h3>Onde o impacto acontece</h3></div></div>
          {(byActivity.data ?? []).length ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byActivity.data} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7ece9" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis type="category" dataKey="activityName" width={120} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip />
                  <Bar name="Aprovado" dataKey="approvedPoints" stackId="progress" fill="var(--team-primary)" barSize={18} />
                  <Bar name="Pendente" dataKey="pendingPoints" stackId="progress" fill="var(--team-secondary)" radius={[0, 8, 8, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="chart-empty">A distribuição será exibida quando houver ações enviadas.</div>}
        </Card>

        <Card className="recent-card">
          <div className="card-heading">
            <div><p className="eyebrow">Movimento recente</p><h3>Últimas ações</h3></div>
            <Link href="/submissions" className="text-link">Ver todas <ArrowUpRight size={14} /></Link>
          </div>
          <div className="recent-list">
            {recent.length ? recent.map((item) => (
              <Link key={item.id} href={`/submissions/${item.id}`} className="recent-item">
                <span className="recent-dot" />
                <div><strong>{item.activity?.name ?? "Ação solidária"}</strong><span>{formatDate(item.actionDate)} · {item.institutionName ?? "Instituição não informada"}</span></div>
                <StatusBadge status={item.status} />
              </Link>
            )) : <p className="muted-copy">Nenhuma ação registrada até o momento.</p>}
          </div>
        </Card>

        <Card className="recent-card">
          <div className="card-heading">
            <div><p className="eyebrow">Disponibilidade</p><h3>Ações bloqueadas</h3></div>
            <Link href="/activities" className="text-link">Ver atividades <ArrowUpRight size={14} /></Link>
          </div>
          <div className="blocked-activity-list">
            {blockedActivities.length ? blockedActivities.map((activity) => (
              <div key={activity.id}>
                <div><strong>{activity.name}</strong>{activity.availability ? <ActivityAvailabilityDetails availability={activity.availability} /> : null}</div>
                <ActivityAvailabilityBadge available={false} reason={activity.availability?.reason} />
              </div>
            )) : <p className="muted-copy">Nenhuma atividade bloqueada no filtro atual.</p>}
          </div>
        </Card>
      </section>
    </>
  );
}

function TargetIcon() {
  return <span className="metric-icon metric-green"><ArrowUpRight size={20} /></span>;
}

function CircleSlashIcon() {
  return <span aria-hidden>!</span>;
}
