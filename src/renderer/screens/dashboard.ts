import { planningStrip, bindPlanning, reminders, bindReminders } from './day-cards';
import type { Context, View } from '../core/context';
import {
  instructorName,
  lessonHeaders,
  lessonRows,
  maintenanceRows,
  maintenanceState,
  pending,
  sortedLessons,
  statusBadge,
  reportBadge,
  studentName,
  typeLabel,
  vehicleName,
} from '../core/queries';
import {
  action,
  bindLessons,
  date,
  datetime,
  dialog,
  empty,
  escape,
  field,
  monthEnd,
  monthStart,
  now,
  panel,
  shiftDate,
  table,
  td,
  time,
  today,
} from '../core/ui';
import { bindPlans, mileageGaps } from './fleet';
import { editLesson, editReport } from './lessons';

let from = monthStart(),
  to = monthEnd();
export function resetDashboardFilters(): void {
  from = monthStart();
  to = monthEnd();
}
export function dashboardView(ctx: Context): View {
  const w = ctx.workspace;
  const period = w.lessons.filter(
    (l) => l.start.slice(0, 10) >= from && l.start.slice(0, 10) <= to,
  );
  const completed = period.filter((l) => l.status === 'completed');
  const daily = w.lessons.filter((l) => l.start.startsWith(today()) && l.status !== 'cancelled');
  const dayRows = sortedLessons(daily).map((lesson) =>
    td(
      `<strong class="agenda-hour">${escape(time(lesson.start))}</strong><span class="cell-sub">até ${escape(time(lesson.end))}</span>`,
      `<strong>${escape(studentName(w, lesson.studentId))}</strong><span class="cell-sub">${escape(typeLabel(lesson.type))} · ${escape(instructorName(w, lesson.instructorId))}</span>${lesson.vehicleId ? `<span class="cell-sub">${escape(vehicleName(w, lesson.vehicleId))}</span>` : ''}`,
      `<div class="day-status">${statusBadge(lesson)}${reportBadge(w, lesson)}</div>`,
      action('Ver aula', `data-lesson="${escape(lesson.id)}"`),
    ),
  );
  const cancelled = w.lessons.filter(
    (l) =>
      l.status === 'cancelled' &&
      l.cancelledAt &&
      l.cancelledAt.slice(0, 10) >= from &&
      l.cancelledAt.slice(0, 10) <= to,
  );
  const active = w.students.filter((s) => s.active),
    outstanding = w.lessons.filter((l) => pending(w, l));
  const plans = w.maintenancePlans.filter(
    (p) => p.active && maintenanceState(w, p).label !== 'Em dia',
  );
  const unavailable = w.lessons.filter(
    (l) =>
      l.status === 'scheduled' &&
      l.start >= now() &&
      (w.vehicles.some((v) => v.id === l.vehicleId && v.status !== 'available') ||
        w.instructors.some(
          (i) =>
            i.id === l.instructorId &&
            (!i.active ||
              !i.availability.some(
                (slot) =>
                  slot.weekday === new Date(l.start).getDay() &&
                  slot.start <= time(l.start) &&
                  slot.end >= time(l.end),
              )),
        ) ||
        w.students.some((s) => s.id === l.studentId && !s.active)),
  );
  const mileageAlerts = w.vehicles.filter((v) => mileageGaps(ctx, v).length);
  const months: { key: string; count: number }[] = [];
  let current = from.slice(0, 7);
  while (current <= to.slice(0, 7) && months.length < 36) {
    months.push({
      key: current,
      count: completed.filter((l) => l.start.startsWith(current)).length,
    });
    const [year, month] = current.split('-').map(Number);
    current = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
  }
  const max = Math.max(1, ...months.map((m) => m.count));
  return {
    html: `<div class="page-heading"><div><h1>Painel gerencial</h1><p class="workspace-date">${escape(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</p></div>${action('＋ Agendar aula', 'data-new-lesson', true)}</div>
    ${planningStrip(ctx)}
    <div class="operation-grid">
      <div>${panel('Agenda de hoje', table(['Horário', 'Aula', 'Situação', 'Ações'], dayRows, 'Agenda do dia'), action('Abrir agenda', 'data-agenda'))}</div>
      <div>${panel('Precisa de atenção', `<div class="notice-stack"><button type="button" class="notice-card" data-pending><span class="notice-number">${outstanding.length}</span><strong>Relatórios pendentes</strong><span aria-hidden="true">→</span></button><button type="button" class="notice-card" data-vehicles><span class="notice-number">${plans.length}</span><strong>Avisos de manutenção</strong><span aria-hidden="true">→</span></button>${unavailable.length ? `<button type="button" class="notice-card notice-warning" data-reorganize><span class="notice-number">${unavailable.length}</span><strong>Aulas a reorganizar</strong><span aria-hidden="true">→</span></button>` : ''}${mileageAlerts.length ? `<p class="small m-2">${mileageAlerts.length} veículo(s) com lacunas de hodômetro.</p>` : ''}</div>`)}</div>
    </div>
    ${reminders(ctx)}
    <section class="period-dashboard"><div class="period-heading"><h2>Resumo do período</h2><details class="period-filter"><summary>${date(from)} a ${date(to)}</summary>
    <form id="dashboard-filters" class="row g-3 align-items-end">${field({ name: 'from', label: 'Início', type: 'date', value: from, required: true })}${field({ name: 'to', label: 'Fim', type: 'date', value: to, required: true })}<div class="col-12"><button class="btn btn-primary btn-sm" type="submit">Atualizar indicadores</button></div></form></details></div>
    <div class="metric-grid">${metric('Aulas realizadas', completed.length, 'No período', 'completed', 'teal')}${metric('Aulas de hoje', daily.length, 'Na agenda', 'today', 'blue')}${metric('Alunos ativos', active.length, 'Nos cadastros', 'students', 'purple')}${metric('Cancelamentos', cancelled.length, 'Registrados no período', 'cancelled', 'orange')}</div></section>
    ${panel('Aulas realizadas por mês', months.length ? `<div class="chart" role="img" aria-label="Quantidade de aulas realizadas por mês no período selecionado">${months.map((m) => `<div class="chart-item"><span>${escape(`${m.key.slice(5)}/${m.key.slice(0, 4)}`)}</span><div class="chart-track"><div class="chart-bar" style="width:${(m.count / max) * 100}%"></div></div><strong>${m.count}</strong></div>`).join('')}</div>` : empty('Não há meses no período selecionado.'))}
    ${plans.length ? panel('Manutenções que merecem atenção', table(['Veículo', 'Serviço', 'Limite', 'Margem', 'Situação', 'Ações'], maintenanceRows(w, plans), 'Avisos de manutenção')) : ''}`,
    bind(root) {
      bindPlanning(root);
      bindReminders(ctx, root);
      root.querySelector('#dashboard-filters')!.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget as HTMLFormElement);
        const a = String(f.get('from')),
          b = String(f.get('to'));
        if (a > b) {
          ctx.notify('A data final deve ser igual ou posterior à inicial.');
          return;
        }
        from = a;
        to = b;
        ctx.navigate('dashboard');
      });
      root.querySelector('[data-new-lesson]')!.addEventListener('click', () => editLesson(ctx));
      root.querySelector('[data-agenda]')!.addEventListener('click', () => ctx.navigate('agenda'));
      root
        .querySelector('[data-reorganize]')
        ?.addEventListener('click', () => ctx.navigate('agenda'));
      root
        .querySelector('[data-pending]')!
        .addEventListener('click', () => ctx.navigate('pending'));
      root
        .querySelector('[data-vehicles]')!
        .addEventListener('click', () => ctx.navigate('vehicles'));
      root.querySelectorAll<HTMLElement>('[data-metric]').forEach((b) =>
        b.addEventListener('click', () => {
          if (b.dataset.metric === 'students') {
            ctx.navigate('students');
            return;
          }
          const records =
            b.dataset.metric === 'today'
              ? daily
              : b.dataset.metric === 'cancelled'
                ? cancelled
                : completed;
          const modal = dialog(
            b.dataset.metric === 'today'
              ? 'Aulas de hoje'
              : b.dataset.metric === 'cancelled'
                ? 'Cancelamentos registrados no período'
                : 'Aulas realizadas no período',
            table(lessonHeaders, lessonRows(w, records), 'Registros do indicador'),
          );
          bindLessons(modal.element, ctx.showLesson);
        }),
      );
      bindLessons(root, ctx.showLesson);
      bindPlans(root, ctx);
    },
  };
}
function metric(label: string, value: number, detail: string, key: string, tone: string): string {
  return `<button type="button" class="metric-card metric-${tone}" data-metric="${key}"><span class="metric-label">${escape(label)}</span><strong>${value}</strong><span class="metric-detail">${escape(detail)}<span aria-hidden="true">›</span></span></button>`;
}
export function dayView(ctx: Context): View {
  const w = ctx.workspace,
    own = sortedLessons(w.lessons),
    current = now();
  const daily = own.filter((l) => l.start.startsWith(today()) && l.status !== 'cancelled');
  const next = own.find((l) => l.status === 'scheduled' && l.end >= current);
  const outstanding = own.filter((l) => pending(w, l));
  const completed = daily.filter((l) => l.status === 'completed').length;
  const planned = daily.filter((l) => l.status === 'scheduled').length;
  return {
    html: `<div class="page-heading"><div><p class="eyebrow">ROTINA DO INSTRUTOR</p><h1>Meu dia</h1><p>${escape(new Date(`${today()}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p></div>${action('Ver minha agenda', 'data-agenda')}</div>
    ${planningStrip(ctx)}
    <div class="instructor-top"><section class="next-lesson"><p class="eyebrow">SUA PRÓXIMA AULA</p>${next ? `<h2>${escape(studentName(w, next.studentId))}</h2><p class="next-time">${escape(date(next.start))} · ${escape(time(next.start))}–${escape(time(next.end))}</p><p>${escape(typeLabel(next.type))} · ${escape(vehicleName(w, next.vehicleId))}</p>${action('Ver aula', `data-lesson="${escape(next.id)}"`, true)}` : '<h2>Tudo em dia por aqui.</h2><p>Você não tem próximas aulas agendadas.</p>'}</section><div class="personal-metrics"><div><strong>${completed}</strong><span>realizadas hoje</span></div><div><strong>${planned}</strong><span>ainda previstas hoje</span></div><button type="button" data-pending><strong>${outstanding.length}</strong><span>relatórios pendentes →</span></button></div></div>
    ${
      outstanding.length
        ? panel(
            'Relatórios que precisam de você',
            `<p class="panel-description">Inclui aulas anteriores. Informar a realização não dispensa o envio do relatório.</p>${table(
              ['Data e horário', 'Aluno', 'Situação', 'Ação'],
              outstanding
                .slice(0, 6)
                .map(
                  (l) =>
                    `<tr><td>${escape(datetime(l.start))}</td><td>${escape(studentName(w, l.studentId))}</td><td>${l.status === 'scheduled' ? 'Ocorrência ainda não informada' : l.status === 'completed' ? 'Realizada · relatório pendente' : 'Falta · relatório pendente'}</td><td>${action('Preencher relatório', `data-report="${escape(l.id)}"`, true)}</td></tr>`,
                ),
              'Relatórios pendentes',
            )}`,
            action('Ver todas as pendências', 'data-all-pending'),
          )
        : panel(
            'Relatórios pendentes',
            empty('Nenhum relatório pendente. Seus registros estão em dia.'),
          )
    }
    ${panel('Aulas de hoje', table(lessonHeaders, lessonRows(w, daily), 'Minhas aulas do dia'))}`,
    bind(root) {
      bindPlanning(root);
      root.querySelector('[data-agenda]')!.addEventListener('click', () => ctx.navigate('agenda'));
      root
        .querySelector('[data-reorganize]')
        ?.addEventListener('click', () => ctx.navigate('agenda'));
      root
        .querySelector('[data-pending]')!
        .addEventListener('click', () => ctx.navigate('pending'));
      root
        .querySelector('[data-all-pending]')
        ?.addEventListener('click', () => ctx.navigate('pending'));
      root.querySelectorAll<HTMLElement>('[data-report]').forEach((b) =>
        b.addEventListener('click', () => {
          const l = w.lessons.find((l) => l.id === b.dataset.report);
          if (l) editReport(ctx, l);
        }),
      );
      bindLessons(root, ctx.showLesson);
    },
  };
}
export function summaryView(ctx: Context): View {
  const w = ctx.workspace,
    d = new Date(`${today()}T12:00:00`),
    week = shiftDate(today(), -(d.getDay() + 6) % 7);
  const weekly = w.lessons.filter(
    (l) =>
      l.status === 'completed' &&
      l.start.slice(0, 10) >= week &&
      l.start.slice(0, 10) <= shiftDate(week, 6),
  );
  const monthly = w.lessons.filter(
    (l) => l.status === 'completed' && l.start.startsWith(today().slice(0, 7)),
  );
  const outstanding = w.lessons.filter((l) => pending(w, l));
  return {
    html: `<div class="page-heading"><div><p class="eyebrow">ACOMPANHAMENTO PESSOAL</p><h1>Meu resumo</h1><p>Seus números com acesso aos registros que compõem cada total.</p></div></div><div class="metric-grid personal-grid">${metric('Realizadas na semana', weekly.length, `${date(week)} a ${date(shiftDate(week, 6))}`, 'week', 'teal')}${metric('Realizadas no mês', monthly.length, `${date(monthStart())} a ${date(monthEnd())}`, 'month', 'blue')}${metric('Relatórios pendentes', outstanding.length, 'Todo o histórico', 'pending', 'orange')}</div>${panel('Aulas realizadas no mês', table(lessonHeaders, lessonRows(w, monthly), 'Aulas do resumo mensal'))}`,
    bind(root) {
      root.querySelectorAll<HTMLElement>('[data-metric]').forEach((b) =>
        b.addEventListener('click', () => {
          if (b.dataset.metric === 'pending') {
            ctx.navigate('pending');
            return;
          }
          const modal = dialog(
            b.dataset.metric === 'week' ? 'Aulas realizadas na semana' : 'Aulas realizadas no mês',
            table(lessonHeaders, lessonRows(w, b.dataset.metric === 'week' ? weekly : monthly)),
          );
          bindLessons(modal.element, ctx.showLesson);
        }),
      );
      bindLessons(root, ctx.showLesson);
    },
  };
}
