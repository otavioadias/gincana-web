"use client";

import {
  Activity,
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Flag,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  Send,
  Settings,
  Target,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { useTeamBrand } from "@/components/team-brand-provider";
import { LoadingState, PermissionState } from "@/components/states";
import { useSession } from "@/features/auth/session-provider";
import { appRole, type AppRole } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { canAccessPath } from "@/lib/access";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  { href: "/create-team", label: "Criar equipe", icon: Building2, roles: ["LEADER_SETUP"] },
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard, roles: ["MANAGER", "MEMBER"] },
  { href: "/activities", label: "Atividades", icon: Activity, roles: ["MANAGER", "MEMBER"] },
  { href: "/submissions", label: "Ações da equipe", icon: Send, roles: ["MEMBER", "MANAGER"] },
  { href: "/validations", label: "Validações", icon: ClipboardCheck, roles: ["VALIDATOR"] },
  { href: "/members", label: "Equipe", icon: Users, roles: ["MANAGER"] },
  { href: "/campaigns", label: "Campanhas", icon: Flag, roles: ["MANAGER"] },
  { href: "/goals", label: "Metas", icon: Target, roles: ["MANAGER"] },
  { href: "/settings", label: "Identidade", icon: Settings, roles: ["MANAGER", "MEMBER"] },
  { href: "/admin/organizations", label: "Equipes", icon: Building2, roles: ["SUPER_ADMIN"] },
  { href: "/admin/metrics", label: "Saúde da plataforma", icon: BarChart3, roles: ["SUPER_ADMIN"] },
];

function roleLabel(role: AppRole | null) {
  return (
    {
      SUPER_ADMIN: "Super admin",
      VALIDATOR: "Validador da plataforma",
      LEADER_SETUP: "Líder sem equipe",
      MANAGER: "Líder da equipe",
      MEMBER: "Participante",
    } as Record<string, string>
  )[role ?? ""] ?? "Conta";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { principal, loading, logout } = useSession();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const brand = useTeamBrand();
  const role = appRole(principal);
  const items = useMemo(() => navItems.filter((item) => role && item.roles.includes(role)), [role]);
  const allowed = role ? canAccessPath(role, pathname) : false;

  if (loading) return <LoadingState label="Preparando seu espaço…" />;
  if (!principal || !role) return null;

  return (
    <div className={cn("app-shell", collapsed && "sidebar-collapsed")}>
      <aside className={cn("sidebar", open && "sidebar-open")}>
        <div className="brand">
          <span className="brand-mark">
            {brand.logoUrl ? (
              // A URL é assinada e temporária; não passa pelo cache/otimizador do Next.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt="" />
            ) : (
              <HeartHandshake />
            )}
          </span>
          <div className="brand-copy">
            <strong>{brand.name ?? "Gincana"}</strong>
            <span>{brand.name ? "Gincana Solidária" : "Solidária"}</span>
          </div>
          <button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-caption">Sua jornada</div>
        <nav aria-label="Navegação principal">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("nav-link", active && "active")} title={collapsed ? item.label : undefined}>
                <Icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="collapse-button" onClick={() => setCollapsed((value) => !value)}>
            <PanelLeftClose size={18} />
            <span>Recolher menu</span>
          </button>
        </div>
      </aside>
      {open ? <button className="sidebar-backdrop" onClick={() => setOpen(false)} aria-label="Fechar menu" /> : null}
      <div className="app-main">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <div className="topbar-context">
            <span className="pulse-dot" />
            <span>{role === "SUPER_ADMIN" || role === "VALIDATOR" ? "Plataforma" : role === "LEADER_SETUP" ? "Primeiro acesso" : brand.name ?? "Equipe conectada"}</span>
          </div>
          <div className="profile-menu">
            <span className="avatar">{initials(principal.email)}</span>
            <div>
              <strong>{principal.email.split("@")[0]}</strong>
              <span>{roleLabel(role)}</span>
            </div>
            <ChevronDown size={16} />
          </div>
          <Button variant="ghost" onClick={() => void logout()} className="logout-button">
            <LogOut size={17} />
            <span>Sair</span>
          </Button>
        </header>
        <main className="page-container">{allowed ? children : <PermissionState />}</main>
      </div>
    </div>
  );
}
