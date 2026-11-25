import type { Lesson, Movement } from '../../shared/types';
import type { Context, View } from '../core/context';
import { isAdmin } from '../core/context';
import {
  type Filters,
  authorName,
  instructorName,
  lessonHeaders,
  lessonRows,
  maintenanceRows,
  matches,
  pending,
  progress,
  sortedLessons,
  studentName,
  typeLabel,
  vehicleName,
} from '../core/queries';
import {
  action,
  bindLessons,
  date,
  datetime,
  escape,
  field,
  monthEnd,
  monthStart,
  number,
  options,
  panel,
  table,
  td,
  textValue,
} from '../core/ui';
import { bindPlans } from './fleet';
import { editReport, showReport } from './lessons';
import { showStudent } from './people';

let pendingFilters: Filters = {
  from: '',
  to: '',
  student: '',
  instructor: '',
  vehicle: '',
  type: '',
};
let filters: Filters = {
  from: monthStart(),
  to: monthEnd(),
  student: '',
  instructor: '',
  vehicle: '',
  type: '',
};
let kind = 'monthly';
export function resetReportFilters(): void {
  pendingFilters = { from: '', to: '', student: '', instructor: '', vehicle: '', type: '' };
  filters = {
    from: monthStart(),
    to: monthEnd(),
    student: '',
    instructor: '',
    vehicle: '',
    type: '',
  };
  kind = 'monthly';
}
export function pendingView(ctx: Context): View {
  const w = ctx.workspace;
  const all = w.lessons.filter((l) => pending(w, l)),
    lessons = all.filter((l) => matches(l, pendingFilters));
  const delivered = w.lessons.filter(
    (l) => w.reports.some((r) => r.lessonId === l.id) && matches(l, pendingFilters),
  );
  return {
    html: `<div class="page-heading"><div><p class="eyebrow">REGISTRO DAS AULAS</p><h1>Relatórios de aula</h1><p>Pendências e consultas, com presença e documentação acompanhadas separadamente.</p></div></div><div class="notice-inline"><strong>${all.length}</strong><span>relatórios pendentes em todo o histórico ${isAdmin(ctx) ? 'da autoescola' : 'das suas aulas'}.</span></div>${filterForm(ctx, pendingFilters, 'pending-filters', false)}
    ${panel(
      `Pendentes no filtro · ${lessons.length}`,
      table(
        ['Aula', 'Aluno', 'Instrutor', 'Ocorrência', 'Ações'],
        sortedLessons(lessons).map((l) =>
          td(
            escape(datetime(l.start)),
            escape(studentName(w, l.studentId)),
            escape(instructorName(w, l.instructorId)),
            l.status === 'scheduled'
              ? 'Ocorrência ainda não informada'
              : l.status === 'completed'
                ? 'Realizada · relatório pendente'
                : 'Falta · relatório pendente',
            `${action('Ver aula', `data-lesson="${escape(l.id)}"`)} ${!isAdmin(ctx) ? action('Preencher relatório', `data-report="${escape(l.id)}"`, true) : ''}`,
          ),
        ),
        'Relatórios pendentes',
      ),
    )}
    ${panel(
      `Relatórios enviados no filtro · ${delivered.length}`,
      table(
        ['Aula', 'Aluno', 'Instrutor', 'Enviado em', 'Autor / correção', 'Ações'],
        sortedLessons(delivered).map((l) => {
          const r = w.reports.find((r) => r.lessonId === l.id)!;
          return td(
            escape(datetime(l.start)),
            escape(studentName(w, l.studentId)),
            escape(instructorName(w, l.instructorId)),
            escape(datetime(r.submittedAt)),
            `${escape(authorName(w, r.authorId))}<span class="cell-sub">${r.updatedAt ? `Corrigido em ${escape(datetime(r.updatedAt))}` : 'Sem correção posterior'}</span>`,
            action('Consultar relatório', `data-sent="${escape(l.id)}"`),
          );
        }),
        'Relatórios enviados',
      ),
    )}
    <p class="page-footnote">Os filtros de período consideram a data prevista da aula. Abrir um formulário não remove a pendência.</p>`,
    bind(root) {
      bindFilter(root, 'pending-filters', (f) => {
        pendingFilters = f;
        ctx.navigate('pending');
      });
      root.querySelectorAll<HTMLElement>('[data-report]').forEach((b) =>
        b.addEventListener('click', () => {
          const l = w.lessons.find((l) => l.id === b.dataset.report);
          if (l) editReport(ctx, l);
        }),
      );
      root
        .querySelectorAll<HTMLElement>('[data-sent]')
        .forEach((b) => b.addEventListener('click', () => showReport(ctx, b.dataset.sent!)));
      bindLessons(root, ctx.showLesson);
    },
  };
}
function filterForm(ctx: Context, f: Filters, id: string, reportKind: boolean): string {
  const w = ctx.workspace;
  return `<section class="filter-panel"><form id="${id}" class="row g-3">${
    reportKind
      ? field({
          name: 'kind',
          label: 'Consulta',
          options: [
            ['monthly', 'Aulas realizadas por mês'],
            ['instructors', 'Aulas por instrutor'],
            ['students', 'Aulas por aluno'],
            ['absence', 'Faltas e cancelamentos'],
            ['progress', 'Progresso dos alunos'],
            ['pending', 'Relatórios pendentes'],
            ['mileage', 'Quilômetros por veículo e aula'],
            ['maintenance', 'Situação das manutenções'],
          ]
            .map(
              ([value, label]) =>
                `<option value="${value}" ${kind === value ? 'selected' : ''}>${label}</option>`,
            )
            .join(''),
          wide: true,
        })
      : ''
  }${field({ name: 'from', label: 'Data inicial da aula / movimento', type: 'date', value: f.from })}${field({ name: 'to', label: 'Data final da aula / movimento', type: 'date', value: f.to })}${field({ name: 'student', label: 'Aluno', options: options(w.students, f.student, 'Todos os alunos') })}${isAdmin(ctx) ? field({ name: 'instructor', label: 'Instrutor', options: options(w.instructors, f.instructor, 'Todos os instrutores') }) : ''}${field(
    {
      name: 'vehicle',
      label: 'Veículo',
      options: options(
        w.vehicles.map((v) => ({ id: v.id, name: `${v.plate} · ${v.model}` })),
        f.vehicle,
        'Todos os veículos',
      ),
    },
  )}${field({ name: 'type', label: 'Tipo de aula', options: `<option value="">Todos os tipos</option><option value="theory" ${f.type === 'theory' ? 'selected' : ''}>Teórica</option><option value="practice" ${f.type === 'practice' ? 'selected' : ''}>Prática</option>` })}<div class="col-12 d-flex gap-2"><button class="btn btn-primary" type="submit">Consultar</button><button class="btn btn-outline-secondary" type="button" data-clear>Limpar filtros</button></div><div class="filter-error col-12" role="alert" hidden></div></form></section>`;
}
function bindFilter(
  root: HTMLElement,
  id: string,
  apply: (f: Filters, data: FormData) => void,
): void {
  const form = root.querySelector<HTMLFormElement>(`#${id}`)!;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const f: Filters = {
      from: textValue(data, 'from'),
      to: textValue(data, 'to'),
      student: textValue(data, 'student'),
      instructor: textValue(data, 'instructor'),
      vehicle: textValue(data, 'vehicle'),
      type: textValue(data, 'type'),
    };
    if (f.from && f.to && f.from > f.to) {
      const e = form.querySelector<HTMLElement>('.filter-error')!;
      e.hidden = false;
      e.classList.add('text-danger');
      e.textContent = 'A data final deve ser igual ou posterior à inicial.';
      return;
    }
    apply(f, data);
  });
  form
    .querySelector('[data-clear]')!
    .addEventListener('click', () =>
      apply(
        { from: '', to: '', student: '', instructor: '', vehicle: '', type: '' },
        new FormData(form),
      ),
    );
}
export function reportsView(ctx: Context): View {
  const w = ctx.workspace,
    lessons = sortedLessons(w.lessons.filter((l) => matches(l, filters)));
  let content = '',
    records = lessons;
  if (kind === 'monthly' || kind === 'instructors' || kind === 'students') {
    records = lessons.filter((l) => (kind === 'monthly' ? l.status === 'completed' : true));
    const groups = new Map<string, Lesson[]>();
    records.forEach((l) => {
      const key =
        kind === 'monthly'
          ? l.start.slice(0, 7)
          : kind === 'instructors'
            ? l.instructorId
            : l.studentId;
      groups.set(key, [...(groups.get(key) || []), l]);
    });
    content = panel(
      kind === 'monthly'
        ? 'Realizadas por mês'
        : kind === 'instructors'
          ? 'Aulas por instrutor'
          : 'Aulas por aluno',
      table(
        [
          kind === 'monthly' ? 'Mês' : kind === 'instructors' ? 'Instrutor' : 'Aluno',
          'Total',
          'Realizadas',
          'Agendadas',
          'Faltas',
          'Canceladas',
        ],
        [...groups.entries()].map(([id, group]) =>
          td(
            escape(
              kind === 'monthly'
                ? `${id.slice(5)}/${id.slice(0, 4)}`
                : kind === 'instructors'
                  ? instructorName(w, id)
                  : studentName(w, id),
            ),
            String(group.length),
            String(group.filter((l) => l.status === 'completed').length),
            String(group.filter((l) => l.status === 'scheduled').length),
            String(group.filter((l) => l.status === 'absent').length),
            String(group.filter((l) => l.status === 'cancelled').length),
          ),
        ),
        'Totais agrupados',
      ),
    );
  } else if (kind === 'absence')
    records = lessons.filter((l) => l.status === 'absent' || l.status === 'cancelled');
  else if (kind === 'pending') records = lessons.filter((l) => pending(w, l));
  else if (kind === 'progress') {
    const students = w.students.filter(
      (s) =>
        (!filters.student || s.id === filters.student) &&
        (!(filters.instructor || filters.vehicle) || lessons.some((l) => l.studentId === s.id)),
    );
    const rows: string[] = [];
    students.forEach((s) =>
      (['theory', 'practice'] as const)
        .filter((type) => !filters.type || filters.type === type)
        .forEach((type) => {
          const p = progress(w, s.id, type);
          rows.push(
            td(
              escape(s.name),
              typeLabel(type),
              String(p.required),
              String(
                lessons.filter(
                  (l) => l.studentId === s.id && l.type === type && l.status === 'completed',
                ).length,
              ),
              String(p.completed),
              String(p.remaining),
              action('Ver ficha', `data-student="${escape(s.id)}"`),
            ),
          );
        }),
    );
    content = panel(
      'Progresso por tipo de aula',
      `<p class="panel-description">As metas e o progresso total são acumulados de toda a formação. A coluna do período usa os filtros acima.</p>${table(['Aluno', 'Tipo', 'Necessárias', 'Realizadas no filtro', 'Realizadas total', 'Restantes total', 'Ações'], rows, 'Progresso dos alunos')}`,
    );
  } else if (kind === 'mileage') {
    const movements = w.movements.filter(
      (m) =>
        (!filters.from || m.at.slice(0, 10) >= filters.from) &&
        (!filters.to || m.at.slice(0, 10) <= filters.to) &&
        (!filters.vehicle || m.vehicleId === filters.vehicle) &&
        (!(filters.student || filters.instructor || filters.type) ||
          w.lessons.some(
            (l) =>
              l.id === m.lessonId &&
              matches({ ...l, vehicleId: m.vehicleId }, { ...filters, from: '', to: '' }),
          )),
    );
    const groups = new Map<string, Movement[]>();
    movements.forEach((m) => groups.set(m.vehicleId, [...(groups.get(m.vehicleId) || []), m]));
    content =
      panel(
        'Distâncias por veículo',
        `<p class="panel-description">O período considera a data do movimento. Filtros de aluno, instrutor e tipo consideram apenas movimentos de aula. Distância percorrida e hodômetro atual têm significados diferentes.</p>${table(
          [
            'Veículo',
            'Distância em aulas',
            'Distância externa / ajustes',
            'Total registrado no filtro',
            'Hodômetro atual',
          ],
          [...groups.entries()].map(([id, group]) => {
            const total = (origin?: string): number =>
              group
                .filter((m) => !origin || m.origin === origin)
                .reduce((sum, m) => sum + m.odometerEnd - m.odometerStart, 0);
            return td(
              escape(vehicleName(w, id)),
              `${number(total('lesson'))} km`,
              `${number(total() - total('lesson'))} km`,
              `${number(total())} km`,
              `${number(w.vehicles.find((v) => v.id === id)?.currentOdometer || 0)} km`,
            );
          }),
          'Quilômetros por veículo',
        )}`,
      ) +
      panel(
        'Movimentos que compõem os totais',
        table(
          [
            'Data',
            'Veículo',
            'Origem',
            'Aula / justificativa',
            'Inicial → final',
            'Distância',
            'Ações',
          ],
          movements
            .sort((a, b) => a.at.localeCompare(b.at) || a.odometerStart - b.odometerStart)
            .map((m) => {
              const l = w.lessons.find((l) => l.id === m.lessonId);
              return td(
                escape(datetime(m.at)),
                escape(vehicleName(w, m.vehicleId)),
                m.origin === 'lesson' ? 'Aula' : m.origin === 'external' ? 'Externo' : 'Ajuste',
                l
                  ? `${escape(studentName(w, l.studentId))} · ${escape(instructorName(w, l.instructorId))}`
                  : escape(m.justification),
                `${number(m.odometerStart)} → ${number(m.odometerEnd)} km`,
                `${number(m.odometerEnd - m.odometerStart)} km`,
                l ? action('Ver aula', `data-lesson="${escape(l.id)}"`) : '—',
              );
            }),
          'Movimentos detalhados',
        ),
      );
  } else if (kind === 'maintenance') {
    const ids = new Set(lessons.map((l) => l.vehicleId));
    const plans = w.maintenancePlans.filter(
      (p) =>
        p.active &&
        (!filters.vehicle || p.vehicleId === filters.vehicle) &&
        (!(filters.student || filters.instructor || filters.type) || ids.has(p.vehicleId)),
    );
    const performed = w.maintenanceRecords.filter(
      (r) =>
        (!filters.from || r.date.slice(0, 10) >= filters.from) &&
        (!filters.to || r.date.slice(0, 10) <= filters.to) &&
        (!filters.vehicle || r.vehicleId === filters.vehicle) &&
        (!(filters.student || filters.instructor || filters.type) || ids.has(r.vehicleId)),
    );
    content =
      panel(
        'Situação atual das manutenções',
        `<p class="panel-description">${plans.length} programações ativas. A situação é atual, sem corte por data. Os filtros de aula limitam aos veículos encontrados nas aulas do período.</p>${table(['Veículo', 'Serviço', 'Limite', 'Margem', 'Situação', 'Ações'], maintenanceRows(w, plans), 'Situação das manutenções')}`,
      ) +
      panel(
        `Serviços realizados no período · ${performed.length}`,
        table(
          ['Data', 'Veículo', 'Serviço', 'Hodômetro', 'Observações'],
          performed.map((r) =>
            td(
              escape(date(r.date)),
              escape(vehicleName(w, r.vehicleId)),
              escape(r.service),
              `${number(r.odometer)} km`,
              escape(r.notes),
            ),
          ),
          'Manutenções realizadas',
        ),
      );
  }
  const showRecords = !['mileage', 'maintenance'].includes(kind);
  return {
    html: `<div class="page-heading"><div><p class="eyebrow">CONSULTAS GERENCIAIS</p><h1>Relatórios</h1><p>Totais rastreáveis, filtros claros e acesso aos registros.</p></div></div>${filterForm(ctx, filters, 'report-filters', true)}${showRecords ? `<div class="query-summary"><strong>${records.length}</strong><span>aulas no resultado · ${records.filter((l) => l.status === 'completed').length} realizadas · ${records.filter((l) => pending(w, l)).length} relatórios pendentes</span></div>` : ''}${content}${showRecords ? panel('Aulas que compõem o resultado', table(lessonHeaders, lessonRows(w, records), 'Registros detalhados do relatório')) : ''}<p class="page-footnote">As consultas de aulas usam a data prevista da aula. Cancelamentos permanecem no histórico. Nenhum total presume presença pelo fim do horário.</p>`,
    bind(root) {
      bindFilter(root, 'report-filters', (f, data) => {
        filters = f;
        kind = textValue(data, 'kind') || kind;
        ctx.navigate('reports');
      });
      root
        .querySelectorAll<HTMLElement>('[data-student]')
        .forEach((b) => b.addEventListener('click', () => showStudent(ctx, b.dataset.student!)));
      bindLessons(root, ctx.showLesson);
      bindPlans(root, ctx);
    },
  };
}
