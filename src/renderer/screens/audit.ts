import type { Context, View } from '../core/context';
import { isAdmin } from '../core/context';
import { auditDetails, escape, field, panel, textValue } from '../core/ui';

let query = '';
export function resetAuditFilters(): void {
  query = '';
}

export function auditView(ctx: Context): View {
  if (!isAdmin(ctx)) return { html: '<p>Acesso permitido somente ao dono.</p>', bind() {} };
  const w = ctx.workspace;
  const author = (id: string): string =>
    w.users.find((user) => user.id === id)?.name ?? 'Usuário indisponível';
  const entries = [...w.audit]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((entry) =>
      `${entry.entity} ${entry.entityId} ${entry.action} ${entry.justification} ${author(entry.authorId)} ${entry.before} ${entry.after}`
        .toLocaleLowerCase('pt-BR')
        .includes(query.toLocaleLowerCase('pt-BR')),
    );
  return {
    html:
      '<div class="page-heading"><div><p class="eyebrow">RELATÓRIOS</p><h1>Auditoria</h1><p>Autoria, justificativas e conteúdo anterior e posterior das alterações, incluindo registros excluídos.</p></div></div>' +
      `<section class="filter-panel"><form class="row g-3" data-audit-search>${field({ name: 'query', label: 'Pesquisar nome, entidade, ação ou justificativa', value: query, wide: true })}<div class="col-12"><button type="submit" class="btn btn-primary">Pesquisar</button></div></form></section>` +
      panel(
        `${entries.length} registros`,
        entries
          .map(
            (entry) =>
              `<section><h3 class="section-label">${escape(entry.entity)} · ${escape(entry.entityId)}</h3>${auditDetails([entry], author)}</section>`,
          )
          .join('') || '<p>Nenhum registro encontrado.</p>',
      ),
    bind(root) {
      root.querySelector('[data-audit-search]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        query = textValue(new FormData(event.currentTarget as HTMLFormElement), 'query');
        ctx.navigate('audit');
      });
    },
  };
}
