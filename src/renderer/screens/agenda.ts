import { request } from '../core/context';
import { showStudent } from './people';
import { examTypes, examResults } from './exams';
import type { Context, View } from '../core/context';
import { isAdmin } from '../core/context';
import {
  instructorName,
  lessonHeaders,
  lessonRows,
  reportLabel,
  sortedLessons,
  statusBadge,
  studentName,
  typeLabel,
  vehicleName,
} from '../core/queries';
import {
  action,
  bindLessons,
  date,
  escape,
  field,
  options,
  panel,
  shiftDate,
  table,
  time,
  today,
} from '../core/ui';
import { editLesson } from './lessons';

let anchor = today(),
  mode = 'week',
  instructor = '',
  vehicle = '',
  until = '';
export function resetAgendaFilters(): void {
  anchor = today();
  mode = 'week';
  instructor = '';
  vehicle = '';
  until = '';
}
export function agendaView(ctx: Context): View {
  const w = ctx.workspace;
  const d = new Date(`${anchor}T12:00:00`);
  const start =
    mode === 'day'
      ? anchor
      : mode === 'week'
        ? shiftDate(anchor, -(d.getDay() + 6) % 7)
        : `${anchor.slice(0, 7)}-01`;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const end =
    until ||
    (mode === 'day'
      ? anchor
      : mode === 'week'
        ? shiftDate(start, 6)
        : `${anchor.slice(0, 7)}-${last}`);
  const lessons = sortedLessons(
    w.lessons.filter(
      (l) =>
        l.start.slice(0, 10) >= start &&
        l.start.slice(0, 10) <= end &&
        (!isAdmin(ctx) || !instructor || l.instructorId === instructor) &&
        (!vehicle || l.vehicleId === vehicle),
    ),
  );
  const exams = w.exams
    .filter((exam) => exam.startsAt.slice(0, 10) >= start && exam.startsAt.slice(0, 10) <= end)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const examList = exams
    .map(
      (
        exam,
      ) => `<li><button class="exam-agenda-link" type="button" data-exam-student="${escape(exam.studentId)}">
    <time>${escape(date(exam.startsAt.slice(0, 10)))} · ${escape(time(exam.startsAt))}</time>
    <strong>${escape(studentName(w, exam.studentId))}</strong><span>${examTypes[exam.type]} · ${examResults[exam.result]}</span></button></li>`,
    )
    .join('');
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end && days.length < 92) {
    days.push(cursor);
    cursor = shiftDate(cursor, 1);
  }
  const monthHeadings =
    mode === 'month'
      ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
          .map((day) => `<div class="calendar-weekday">${day}</div>`)
          .join('')
      : '';
  const monthOffset = mode === 'month' ? (new Date(`${start}T12:00:00`).getDay() + 6) % 7 : 0;
  const monthPadding = Array.from(
    { length: monthOffset },
    () => '<div class="calendar-day calendar-padding" aria-hidden="true"></div>',
  ).join('');
  const content =
    mode === 'day' || until
      ? `<div class="agenda-holidays" data-holiday-range role="status"></div>${table(lessonHeaders, lessonRows(w, lessons), 'Agenda de aulas')}`
      : `<div class="calendar-grid calendar-${mode}">${monthHeadings}${monthPadding}${days
          .map((day) => {
            const daily = lessons.filter((l) => l.start.startsWith(day));
            const weekday = new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', {
              weekday: 'short',
            });
            return `<section class="calendar-day ${day === today() ? 'calendar-today' : ''}">
              <h3><span>${escape(weekday)}</span><strong>${escape(date(day).slice(0, 5))}</strong>
                ${isAdmin(ctx) ? `<button type="button" class="calendar-add" data-add-day="${day}" aria-label="Agendar aula em ${escape(date(day))}">+</button>` : ''}</h3>
              <p class="calendar-holiday" data-holiday-date="${day}" hidden></p>
              ${daily.map((l) => `<button type="button" class="calendar-lesson kind-${l.type} lesson-${l.status}" data-lesson="${escape(l.id)}"><strong>${escape(time(l.start))}–${escape(time(l.end))}</strong><span>${escape(studentName(w, l.studentId))}</span><small>${escape(typeLabel(l.type))} · ${escape(instructorName(w, l.instructorId))}</small>${statusBadge(l)}</button>`).join('')}
              ${exams
                .filter((exam) => exam.startsAt.startsWith(day))
                .map(
                  (exam) =>
                    `<button type="button" class="calendar-lesson calendar-exam" data-exam-student="${escape(exam.studentId)}"><strong>${escape(time(exam.startsAt))} · Exame</strong><span>${escape(studentName(w, exam.studentId))}</span><small>${examTypes[exam.type]} · ${examResults[exam.result]}</small></button>`,
                )
                .join('')}
              ${!daily.length && !exams.some((exam) => exam.startsAt.startsWith(day)) ? '<p class="calendar-empty">Sem agendamentos</p>' : ''}</section>`;
          })
          .join('')}</div>`;
  return {
    html: `<div class="page-heading"><div><h1>${isAdmin(ctx) ? 'Agenda geral' : 'Minha agenda'}</h1></div>${isAdmin(ctx) ? action('＋ Agendar aula', 'data-new-lesson', true) : ''}</div>
    <div class="holiday-banner"><span class="holiday-icon" aria-hidden="true">◇</span><div><strong>Próximo feriado nacional</strong><span data-next-holiday role="status">Consultando calendário…</span></div><small>BrasilAPI</small></div>
    <div class="agenda-toolbar">
      <div class="agenda-period">${action('‹', 'data-previous aria-label="Período anterior"')}${action('›', 'data-next aria-label="Próximo período"')}<strong>${date(start)}${end !== start ? ` a ${date(end)}` : ''}</strong>${action('Hoje', 'data-today')}</div>
      <div class="segmented" role="group" aria-label="Visualização">${[
        ['day', 'Dia'],
        ['week', 'Semana'],
        ['month', 'Mês'],
      ]
        .map(
          ([value, label]) =>
            `<button type="button" data-mode="${value}" aria-pressed="${mode === value}">${label}</button>`,
        )
        .join('')}</div>
    </div>
    <details class="agenda-filters"${instructor || vehicle || until ? ' open' : ''}><summary>Filtros e data</summary><form class="row g-3 p-3" id="agenda-filters">
    ${field({ name: 'anchor', label: 'Ir para data', type: 'date', value: anchor, required: true })}
    ${isAdmin(ctx) ? field({ name: 'instructor', label: 'Instrutor', options: options(w.instructors, instructor, 'Todos os instrutores') }) : ''}
    ${field({
      name: 'vehicle',
      label: 'Veículo',
      options: options(
        w.vehicles.map((v) => ({ id: v.id, name: `${v.plate} · ${v.model}` })),
        vehicle,
        'Todos os veículos',
      ),
    })}
    ${field({ name: 'until', label: 'Fim do período personalizado', type: 'date', value: until })}
    <div class="col-12"><button class="btn btn-primary" type="submit">Aplicar filtros</button></div></form></details>
    ${panel(`${lessons.length} aula(s) no período`, content, '<span class="holiday-status" data-holiday-status role="status"></span>')}
    ${examList && (mode === 'day' || until) ? panel('Exames no período', `<ul class="agenda-exam-list">${examList}</ul>`) : ''}`,
    bind(root) {
      root.querySelector('#agenda-filters')!.addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement,
          data = new FormData(form);
        const selected = String(data.get('anchor')),
          selectedMode = mode,
          selectedUntil = String(data.get('until') || '');
        const weekday = new Date(`${selected}T12:00:00`).getDay();
        const selectedStart =
          selectedMode === 'month'
            ? `${selected.slice(0, 7)}-01`
            : selectedMode === 'week'
              ? shiftDate(selected, -(weekday + 6) % 7)
              : selected;
        if (selectedUntil && selectedUntil < selectedStart) {
          let error = form.querySelector<HTMLElement>('.agenda-error');
          if (!error) {
            error = document.createElement('p');
            error.className = 'agenda-error col-12 text-danger';
            error.setAttribute('role', 'alert');
            error.tabIndex = -1;
            form.append(error);
          }
          error.textContent = `O término personalizado deve ser igual ou posterior ao início da visualização (${date(selectedStart)}).`;
          error.focus();
          return;
        }
        anchor = selected;
        mode = selectedMode;
        instructor = isAdmin(ctx) ? String(data.get('instructor') || '') : '';
        vehicle = String(data.get('vehicle') || '');
        until = selectedUntil;
        ctx.navigate('agenda');
      });
      root.querySelector('[data-today]')!.addEventListener('click', () => {
        anchor = today();
        until = '';
        ctx.navigate('agenda');
      });
      root.querySelector('[data-previous]')!.addEventListener('click', () => move(-1));
      root.querySelector('[data-next]')!.addEventListener('click', () => move(1));
      function move(amount: number): void {
        if (mode === 'month') {
          const next = new Date(d.getFullYear(), d.getMonth() + amount, 1, 12);
          anchor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
        } else anchor = shiftDate(anchor, amount * (mode === 'day' ? 1 : 7));
        until = '';
        ctx.navigate('agenda');
      }
      const selectedDay = anchor;
      root
        .querySelector('[data-new-lesson]')
        ?.addEventListener('click', () => editLesson(ctx, undefined, selectedDay));
      root
        .querySelectorAll<HTMLButtonElement>('[data-add-day]')
        .forEach((button) =>
          button.addEventListener('click', () => editLesson(ctx, undefined, button.dataset.addDay)),
        );
      root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) =>
        button.addEventListener('click', () => {
          mode = button.dataset.mode!;
          until = '';
          ctx.navigate('agenda');
        }),
      );
      root
        .querySelectorAll<HTMLButtonElement>('[data-exam-student]')
        .forEach((button) =>
          button.addEventListener('click', () => showStudent(ctx, button.dataset.examStudent!)),
        );
      const years = [
        ...new Set([start.slice(0, 4), end.slice(0, 4), ...days.map((day) => day.slice(0, 4))]),
      ];
      const status = root.querySelector<HTMLElement>('[data-holiday-status]')!;
      status.textContent = 'Consultando feriados…';
      void Promise.allSettled(
        years.map((year) => request('holidays.list', { year: Number(year) })),
      ).then((results) => {
        if (!status.isConnected) return;
        const failed = results.some((result) => result.status === 'rejected');
        status.textContent = failed
          ? 'Alguns feriados indisponíveis'
          : 'Feriados nacionais · BrasilAPI';
        const holidays = results.flatMap((result) =>
          result.status === 'fulfilled' ? result.value : [],
        );
        const nextLabel = root.querySelector<HTMLElement>('[data-next-holiday]')!;
        const pick = (items: { date: string; name: string }[]) =>
          items.filter((h) => h.date >= anchor).sort((a, b) => a.date.localeCompare(b.date))[0];
        const showNext = (h?: { date: string; name: string }) => {
          nextLabel.textContent = h
            ? `${date(h.date)} · ${h.name}`
            : 'Sem feriado informado para o período.';
        };
        const next = pick(holidays);
        if (failed) nextLabel.textContent = 'Calendário indisponível no momento.';
        else if (next) showNext(next);
        else
          void request('holidays.list', { year: Number(anchor.slice(0, 4)) + 1 })
            .then((items) => showNext(pick(items)))
            .catch(() => {
              nextLabel.textContent = 'Calendário indisponível no momento.';
            });
        const byDay = new Map(holidays.map((holiday) => [holiday.date, holiday.name]));
        root.querySelectorAll<HTMLElement>('[data-holiday-date]').forEach((label) => {
          const holiday = byDay.get(label.dataset.holidayDate!);
          if (!holiday) return;
          label.textContent = holiday;
          label.hidden = false;
        });
        const range = root.querySelector('[data-holiday-range]');
        if (range)
          range.textContent = holidays
            .filter((holiday) => holiday.date >= start && holiday.date <= end)
            .map((holiday) => `${date(holiday.date)} · ${holiday.name}`)
            .join('  |  ');
      });
      bindLessons(root, ctx.showLesson);
    },
  };
}
