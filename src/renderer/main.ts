import { brandMark, roadArt } from './core/brand';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import type { Context, Mutation, Route, View } from './core/context';
import { request } from './core/context';
import type { ApiCommands, Workspace } from '../shared/types';
import { escape } from './core/ui';
import { dashboardView, dayView, resetDashboardFilters, summaryView } from './screens/dashboard';
import { agendaView, resetAgendaFilters } from './screens/agenda';
import { instructorsView, resetPeopleFilters, studentsView } from './screens/people';
import { accessView } from './screens/access';
import { auditView, resetAuditFilters } from './screens/audit';
import { resetFleetFilters, vehiclesView } from './screens/fleet';
import { pendingView, reportsView, resetReportFilters } from './screens/reports';
import { showLesson } from './screens/lessons';
import { pending } from './core/queries';
import { createWorkspaceSync } from './core/workspace-sync';

const app = document.querySelector<HTMLElement>('#app')!;
const notifications = document.querySelector<HTMLElement>('#notifications')!;
const adminRoutes: Route[] = [
  'dashboard',
  'agenda',
  'students',
  'instructors',
  'access',
  'vehicles',
  'pending',
  'reports',
  'audit',
];
const instructorRoutes: Route[] = ['day', 'agenda', 'students', 'pending', 'summary'];
const adminNavigation: Route[] = ['dashboard', 'agenda', 'students', 'vehicles', 'pending'];
const instructorNavigation: Route[] = ['day', 'agenda', 'students', 'pending'];
const routeLabels: Record<Route, string> = {
  dashboard: 'Painel gerencial',
  day: 'Meu dia',
  agenda: 'Agenda',
  students: 'Alunos',
  instructors: 'Instrutores',
  access: 'Acessos',
  vehicles: 'Veículos e manutenção',
  pending: 'Relatórios de aula',
  reports: 'Relatórios gerenciais',
  audit: 'Auditoria',
  summary: 'Meu resumo',
};
const symbols: Record<Route, string> = {
  dashboard:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  day: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  agenda:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2"/>',
  students:
    '<circle cx="10" cy="8" r="3"/><path d="M4 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M17 5a3 3 0 0 1 0 6m3 9v-2a4 4 0 0 0-2-3.5"/>',
  instructors: '<circle cx="12" cy="8" r="3"/><path d="M5 20v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/>',
  access: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  vehicles: '<path d="M4 10l2-5h12l2 5m-17 0h18v8H3zm2 8v2m14-2v2M6 14h2m8 0h2"/>',
  pending: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h3"/>',
  reports: '<path d="M4 4v16h16M9 16v-4m5 4V8m5 8V5"/>',
  audit: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h3"/>',
  summary: '<path d="M4 4v16h16M9 16v-4m5 4V8m5 8V5"/>',
};
let context: Context | null = null;
let workspaceSync: ReturnType<typeof createWorkspaceSync> | null = null;
let dirtyForms = new WeakSet<HTMLFormElement>();
let notificationTimer: ReturnType<typeof setTimeout>;

// Filtros existem permanentemente nas telas. Só o preenchimento ainda não aplicado bloqueia a troca.
function markFormEdited(event: Event): void {
  const element = event.target;
  if (element instanceof HTMLElement) {
    const form = element.closest('form');
    if (form) dirtyForms.add(form);
  }
}
document.addEventListener('input', markFormEdited);
document.addEventListener('change', markFormEdited);

function isEditing(): boolean {
  if (document.querySelector('dialog[open]')) return true;
  if (document.activeElement instanceof HTMLElement && document.activeElement.closest('form'))
    return true;
  return [...app.querySelectorAll<HTMLFormElement>('form')].some((form) => dirtyForms.has(form));
}

function applySyncedWorkspace(ctx: Context, workspace: Workspace): void {
  const x = window.scrollX,
    y = window.scrollY;
  const scrolls = [...app.querySelectorAll<HTMLElement>('.table-responsive, .panel, nav')].map(
    (element) => element.scrollLeft,
  );
  const active = document.activeElement;
  const focusAttribute = active
    ? [...active.attributes].find((attribute) => attribute.name.startsWith('data-'))
    : undefined;
  const focusedId = active?.id;
  ctx.workspace = workspace;
  render();
  app.querySelectorAll<HTMLElement>('.table-responsive, .panel, nav').forEach((element, index) => {
    element.scrollLeft = scrolls[index] || 0;
  });
  if (focusAttribute)
    app
      .querySelector<HTMLElement>(`[${focusAttribute.name}="${CSS.escape(focusAttribute.value)}"]`)
      ?.focus({ preventScroll: true });
  else if (focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
  window.scrollTo(x, y);
}
function notify(message: string): void {
  clearTimeout(notificationTimer);
  notifications.innerHTML = `<div class="app-notification"><span>${escape(message)}</span><button type="button" aria-label="Fechar mensagem">×</button></div>`;
  notifications.querySelector('button')!.addEventListener('click', () => {
    notifications.innerHTML = '';
  });
  notificationTimer = setTimeout(() => {
    notifications.innerHTML = '';
  }, 7000);
}
function start(workspace: Workspace): void {
  workspaceSync?.stop();
  dirtyForms = new WeakSet<HTMLFormElement>();
  resetAgendaFilters();
  resetDashboardFilters();
  resetFleetFilters();
  resetPeopleFilters();
  resetReportFilters();
  resetAuditFilters();
  let saving = false;
  const ctx: Context = {
    workspace,
    route: workspace.user.role === 'admin' ? 'dashboard' : 'day',
    navigate(route) {
      if (context !== ctx) return;
      const allowed = ctx.workspace.user.role === 'admin' ? adminRoutes : instructorRoutes;
      if (!allowed.includes(route)) return;
      // Navegar ou aplicar filtros é uma ação explícita; o formulário anterior já pode sair da tela.
      dirtyForms = new WeakSet<HTMLFormElement>();
      ctx.route = route;
      render();
      void sync.refresh().catch(() => {});
    },
    async reload() {
      const result = await sync.refresh();
      if (context !== ctx || result === 'skipped') return;
      notify(
        result === 'deferred'
          ? 'Consulta concluída. A tela será atualizada ao concluir ou fechar o formulário.'
          : 'Dados atualizados.',
      );
    },
    async save<K extends Mutation>(command: K, payload: ApiCommands[K]['input']) {
      if (context !== ctx) return;
      saving = true;
      sync.invalidate();
      try {
        const workspace = await request(command, payload);
        if (context !== ctx) return;
        sync.accept(workspace);
        ctx.workspace = workspace;
        dirtyForms = new WeakSet<HTMLFormElement>();
        render();
        // O usuário concluiu o envio. As fichas antigas também fecham após a confirmação do banco.
        document
          .querySelectorAll<HTMLDialogElement>('dialog')
          .forEach((element) => element.close());
        document.querySelector<HTMLElement>('#main-content')?.focus({ preventScroll: true });
        notify(
          command === 'report.save' && ctx.workspace.user.role === 'instructor'
            ? 'Relatório enviado e disponível para o administrador.'
            : 'Alterações salvas com sucesso.',
        );
      } finally {
        saving = false;
      }
    },
    showLesson(id) {
      if (context === ctx) showLesson(ctx, id);
    },
    notify,
  };
  const sync = createWorkspaceSync({
    initialWorkspace: workspace,
    read: () => request('workspace.get', undefined),
    apply: (fresh) => applySyncedWorkspace(ctx, fresh),
    canApply: () => !saving && !isEditing(),
    isCurrent: () => context === ctx,
    isVisible: () => document.visibilityState === 'visible',
    windowEvents: window,
    documentEvents: document,
  });
  context = ctx;
  workspaceSync = sync;
  render();
  sync.start();
}
function render(): void {
  if (!context) return;
  const ctx = context,
    admin = ctx.workspace.user.role === 'admin',
    routes = admin ? adminNavigation : instructorNavigation;
  const screens: Record<Route, (ctx: Context) => View> = {
    dashboard: dashboardView,
    day: dayView,
    agenda: agendaView,
    students: studentsView,
    instructors: instructorsView,
    access: accessView,
    vehicles: vehiclesView,
    pending: pendingView,
    reports: reportsView,
    audit: auditView,
    summary: summaryView,
  };
  const view = screens[ctx.route](ctx);
  const group =
    admin && ['students', 'instructors', 'access'].includes(ctx.route)
      ? (['students', 'instructors', 'access'] as const)
      : admin && ['pending', 'reports', 'audit'].includes(ctx.route)
        ? (['pending', 'reports', 'audit'] as const)
        : !admin && ['day', 'summary'].includes(ctx.route)
          ? (['day', 'summary'] as const)
          : null;
  const selectedRoute = group ? group[0] : ctx.route;
  const sections = group
    ? `<nav class="section-nav" aria-label="Seções desta área">${group
        .map(
          (route) =>
            `<button type="button" data-route="${route}" ${ctx.route === route ? 'aria-current="page"' : ''}>${route === 'pending' ? 'Aulas e pendências' : route === 'reports' ? 'Indicadores' : routeLabels[route]}</button>`,
        )
        .join('')}</nav>`
    : '';
  const menu = routes
    .map(
      (route) => `
    <button type="button" class="nav-item ${selectedRoute === route ? 'active' : ''}"
      ${selectedRoute === route ? (ctx.route === route && !group ? 'aria-current="page"' : 'aria-current="true"') : ''} data-route="${route}">
      <svg class="nav-symbol" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${symbols[route]}</svg>
      <span>${admin && route === 'students' ? 'Cadastros' : route === 'pending' ? 'Relatórios' : route === 'vehicles' ? 'Frota' : route === 'dashboard' ? 'Visão geral' : !admin && route === 'students' ? 'Meus alunos' : routeLabels[route]}</span>
      ${route === 'pending' ? `<span class="nav-count">${ctx.workspace.lessons.filter((l) => pending(ctx.workspace, l)).length}</span>` : ''}
    </button>`,
    )
    .join('');
  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar" aria-label="Menu principal">
        <a class="brand" href="#" data-home>
          ${brandMark}
          <span>Autoescola</span>
        </a>
        <nav aria-label="Áreas do aplicativo">${menu}</nav><div class="nav-map" aria-hidden="true">${roadArt}</div>
      </aside>
      <div class="workspace">
        <header class="topbar">
          <div class="breadcrumb-label">${admin ? 'Administração' : 'Instrutor'} <span aria-hidden="true">/</span> <strong>${escape(routeLabels[ctx.route])}</strong></div>
          <div class="topbar-actions">
            <button type="button" class="refresh-button" data-refresh title="Atualizar dados do banco" aria-label="Atualizar dados">↻</button>
            <div class="profile-avatar" aria-hidden="true">${escape(ctx.workspace.user.name.slice(0, 1).toUpperCase())}</div>
            <div class="profile-name"><strong>${escape(ctx.workspace.user.name)}</strong><small>${admin ? 'Dono / administrador' : 'Instrutor / professor'}</small></div>
            <button type="button" class="btn btn-sm btn-outline-secondary" data-logout>Sair</button>
          </div>
        </header>
        <main id="main-content" tabindex="-1">${sections}${view.html}</main>
      </div>
    </div>`;
  app.querySelectorAll<HTMLElement>('[data-route]').forEach((b) =>
    b.addEventListener('click', () => {
      ctx.navigate(b.dataset.route as Route);
      document.querySelector<HTMLElement>('#main-content')?.focus({ preventScroll: true });
    }),
  );
  app.querySelector('[data-home]')!.addEventListener('click', (e) => {
    e.preventDefault();
    ctx.navigate(admin ? 'dashboard' : 'day');
  });
  app.querySelector('[data-logout]')!.addEventListener('click', async () => {
    const button = app.querySelector<HTMLButtonElement>('[data-logout]')!;
    button.disabled = true;
    const sync = workspaceSync;
    sync?.stop();
    try {
      await request('auth.logout', undefined);
      if (context !== ctx) return;
      document.querySelectorAll<HTMLDialogElement>('dialog').forEach((d) => d.close());
      context = null;
      workspaceSync = null;
      dirtyForms = new WeakSet<HTMLFormElement>();
      notifications.innerHTML = '';
      renderLogin();
    } catch (error) {
      if (context !== ctx) return;
      sync?.start();
      notify(error instanceof Error ? error.message : 'Não foi possível sair. Tente novamente.');
      button.disabled = false;
    }
  });
  app.querySelector('[data-refresh]')!.addEventListener('click', async () => {
    const button = app.querySelector<HTMLButtonElement>('[data-refresh]')!;
    button.disabled = true;
    button.classList.add('loading');
    try {
      await ctx.reload();
    } catch (error) {
      if (context === ctx)
        notify(error instanceof Error ? error.message : 'Não foi possível atualizar os dados.');
    } finally {
      button.disabled = false;
      button.classList.remove('loading');
    }
  });
  view.bind(document.querySelector<HTMLElement>('#main-content')!);
}
function renderLogin(): void {
  app.innerHTML = `<main class="login-shell" id="main-content"><div class="login-scene"><div class="login-cover" aria-hidden="true">${roadArt}</div><div class="login-box">
    <div class="brand login-brand">${brandMark}<span>Autoescola</span></div>
    <h1>Entrar</h1><p class="login-description">Use a conta fornecida pela autoescola.</p>
    <form id="login-form">
      <div class="mb-3"><label class="form-label" for="login-user">Usuário</label><input id="login-user" name="login" class="form-control form-control-lg" autocomplete="username" required></div>
      <div class="mb-3"><label class="form-label" for="login-password">Senha</label><div class="password-wrap"><input id="login-password" name="password" class="form-control form-control-lg" type="password" autocomplete="current-password" required><button type="button" class="password-toggle" aria-label="Mostrar senha" aria-pressed="false">Mostrar</button></div></div>
      <div class="login-error alert alert-danger" role="alert" hidden></div><button class="btn btn-primary btn-lg w-100 mt-2" type="submit">Entrar <span aria-hidden="true">→</span></button>
    </form>
  </div></div></main>`;
  const form = app.querySelector<HTMLFormElement>('#login-form')!;
  app.querySelector('.password-toggle')!.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLButtonElement,
      input = form.elements.namedItem('password') as HTMLInputElement,
      visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    button.textContent = visible ? 'Ocultar' : 'Mostrar';
    button.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
    button.setAttribute('aria-pressed', String(visible));
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!,
      error = form.querySelector<HTMLElement>('.login-error')!;
    const data = new FormData(form);
    error.hidden = true;
    button.disabled = true;
    button.textContent = 'Entrando…';
    try {
      start(
        await request('auth.login', {
          login: String(data.get('login') || '').trim(),
          password: String(data.get('password') || ''),
        }),
      );
    } catch (e) {
      error.hidden = false;
      error.textContent =
        e instanceof Error
          ? e.message
          : 'Não foi possível entrar. Confira os dados e tente novamente.';
      error.tabIndex = -1;
      error.focus();
    } finally {
      button.disabled = false;
      button.innerHTML = 'Entrar <span aria-hidden="true">→</span>';
    }
  });
}
renderLogin();
