import { forecastPanel, bindForecast } from '../core/weather';
import type { Lesson, SaveLesson, SaveReport } from '../../shared/types';
import type { Context } from '../core/context';
import { isAdmin, request } from '../core/context';
import {
  authorName,
  instructorName,
  progressCards,
  reportBadge,
  statusBadge,
  studentName,
  typeLabel,
  vehicleName,
} from '../core/queries';
import {
  action,
  auditDetails,
  bindLessons,
  confirmAction,
  confirmRemoval,
  shiftDate,
  dateInput,
  datetime,
  dialog,
  escape,
  field,
  formDialog,
  now,
  number,
  numericValue,
  options,
  panel,
  textValue,
  today,
} from '../core/ui';

export function editLesson(ctx: Context, lesson?: Lesson, day = today()): void {
  const w = ctx.workspace;
  const students = w.students.filter((s) => s.active || s.id === lesson?.studentId);
  const instructors = w.instructors.filter((i) => i.active || i.id === lesson?.instructorId);
  const vehicles = w.vehicles
    .filter((v) => v.status === 'available' || v.id === lesson?.vehicleId)
    .map((v) => ({
      id: v.id,
      name: `${v.plate} · ${v.model} · ${v.category}${v.status !== 'available' ? ' (indisponível)' : ''}`,
    }));
  formDialog(
    lesson ? 'Editar ou remarcar aula' : 'Agendar aula',
    [
      field({
        name: 'studentId',
        label: 'Aluno',
        required: true,
        options: options(students, lesson?.studentId),
      }),
      field({
        name: 'instructorId',
        label: 'Instrutor',
        required: true,
        options: options(instructors, lesson?.instructorId),
      }),
      field({
        name: 'type',
        label: 'Tipo da aula',
        required: true,
        options: `<option value="theory" ${lesson?.type === 'theory' ? 'selected' : ''}>Teórica</option><option value="practice" ${!lesson || lesson.type === 'practice' ? 'selected' : ''}>Prática</option>`,
      }),
      field({
        name: 'category',
        label: 'Categoria',
        value: lesson?.category,
        required: true,
        help: 'Informe a categoria do acompanhamento do aluno.',
      }),
      field({
        name: 'start',
        label: 'Início',
        type: 'datetime-local',
        required: true,
        value: lesson ? dateInput(lesson.start) : `${day}T08:00`,
      }),
      field({
        name: 'end',
        label: 'Término',
        type: 'datetime-local',
        required: true,
        value: lesson ? dateInput(lesson.end) : `${day}T09:00`,
        help: 'A duração é informada para cada aula.',
      }),
      forecastPanel,
      field({
        name: 'vehicleId',
        label: 'Veículo',
        options: options(vehicles, lesson?.vehicleId || '', 'Sem veículo'),
        wide: true,
        help: 'Obrigatório para a aula prática. Aulas teóricas podem ocorrer sem veículo.',
      }),
      field({
        name: 'notes',
        label: 'Observações do agendamento',
        type: 'textarea',
        value: lesson?.notes,
        wide: true,
      }),
      ...(lesson
        ? [
            field({
              name: 'justification',
              label: 'Justificativa da alteração',
              type: 'textarea',
              required: true,
              wide: true,
            }),
          ]
        : []),
      '<div class="col-12"><p class="info-note">Ao salvar, o sistema confere os horários, a disponibilidade e os conflitos de aluno, instrutor e veículo.</p></div>',
    ].join(''),
    async (data) => {
      const payload: SaveLesson = {
        ...(lesson ? { id: lesson.id, justification: textValue(data, 'justification') } : {}),
        studentId: textValue(data, 'studentId'),
        instructorId: textValue(data, 'instructorId'),
        vehicleId: textValue(data, 'vehicleId') || null,
        type: textValue(data, 'type') as SaveLesson['type'],
        category: textValue(data, 'category'),
        start: textValue(data, 'start'),
        end: textValue(data, 'end'),
        notes: textValue(data, 'notes'),
      };
      await ctx.save('lesson.save', payload);
    },
    lesson ? 'Salvar alteração' : 'Agendar aula',
    (form) => {
      const start = form.elements.namedItem('start') as HTMLInputElement;
      const end = form.elements.namedItem('end') as HTMLInputElement;
      start.addEventListener('change', () => {
        if (end.value > start.value && end.value.slice(0, 10) === start.value.slice(0, 10)) return;
        const newEnd = new Date(start.value);
        if (Number.isNaN(newEnd.getTime())) return;
        newEnd.setHours(newEnd.getHours() + 1);
        const pad = (value: number) => String(value).padStart(2, '0');
        end.value = `${newEnd.getFullYear()}-${pad(newEnd.getMonth() + 1)}-${pad(newEnd.getDate())}T${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}`;
      });
      bindForecast(form);
      const select = form.elements.namedItem('studentId') as HTMLSelectElement;
      select.addEventListener('change', () => {
        const s = students.find((s) => s.id === select.value);
        if (s) {
          (form.elements.namedItem('category') as HTMLInputElement).value = s.category;
          (form.elements.namedItem('instructorId') as HTMLSelectElement).value = s.instructorId;
        }
      });
    },
  );
}

export function showLesson(ctx: Context, id: string): void {
  const w = ctx.workspace,
    l = w.lessons.find((item) => item.id === id);
  if (!l) return;
  const report = w.reports.find((r) => r.lessonId === id);
  const student = w.students.find((s) => s.id === l.studentId);
  const canReport =
    !isAdmin(ctx) && l.instructorId === w.user.instructorId && l.status !== 'cancelled' && !report;
  const canOutcome = l.status !== 'cancelled' && !report && l.end <= now();
  const showWeather = l.status === 'scheduled' && l.type === 'practice' && l.start >= now();
  const showReminder =
    isAdmin(ctx) && l.status === 'scheduled' && l.start.slice(0, 10) === shiftDate(today(), 1);
  const sent = w.audit.some(
    (entry) =>
      entry.entity === 'lessonReminder' &&
      entry.entityId === id &&
      entry.action === `sent/${l.start}`,
  );
  const email = w.studentDetails.find((item) => item.id === l.studentId)?.email;
  const modal = dialog(
    'Detalhes da aula',
    `<div class="detail-badges">${statusBadge(l)}${reportBadge(w, l)}</div>
    <h3 class="detail-title">${escape(studentName(w, l.studentId))}</h3>
    <dl class="detail-grid"><div><dt>Data e horário</dt><dd>${escape(datetime(l.start))} até ${escape(datetime(l.end))}</dd></div><div><dt>Tipo e categoria</dt><dd>${escape(typeLabel(l.type))} · ${escape(l.category)}</dd></div><div><dt>Instrutor</dt><dd>${escape(instructorName(w, l.instructorId))}</dd></div><div><dt>Veículo agendado</dt><dd>${escape(vehicleName(w, l.vehicleId))}</dd></div><div><dt>Contato do aluno</dt><dd>${escape(student?.contact || 'Não informado')}</dd></div><div><dt>Observações do agendamento</dt><dd>${escape(l.notes || 'Sem observações')}</dd></div></dl>
    ${l.status === 'scheduled' && l.end < now() ? '<p class="alert alert-warning">O horário terminou. A ocorrência ainda precisa ser informada; esta aula não foi contada como realizada.</p>' : ''}
    ${l.status === 'cancelled' ? `<p class="alert alert-secondary">Cancelada em ${escape(l.cancelledAt ? datetime(l.cancelledAt) : 'data indisponível')}. Motivo: ${escape(l.cancellationReason)}</p>` : ''}
    ${showWeather ? `<div class="lesson-api-block">${action('Consultar previsão', 'data-weather')}<p data-weather-status role="status" class="m-0"></p></div>` : ''}
    ${showReminder ? `<div class="lesson-api-block">${sent ? '<p class="m-0">Lembrete aceito pelo serviço de e-mail.</p>' : email ? action('Enviar lembrete por e-mail', 'data-reminder') : '<p class="m-0">Para enviar lembrete, inclua o e-mail na ficha do aluno.</p>'}</div>` : ''}
    <h3 class="section-label">Progresso do aluno</h3>${progressCards(w, l.studentId)}
    <div class="d-flex flex-wrap gap-2 mt-3">${isAdmin(ctx) && l.status === 'scheduled' ? action('Editar / remarcar', 'data-edit') + action('Cancelar aula', 'data-cancel') : ''}${canOutcome ? action('Registrar realização', 'data-outcome="completed"') + action('Registrar falta', 'data-outcome="absent"') : ''}${canReport ? action('Preencher relatório', 'data-report', true) : ''}${report ? action('Consultar relatório', 'data-report', true) : ''}${isAdmin(ctx) ? action('Excluir aula', 'data-remove-lesson') : ''}</div>
    ${panel(
      'Histórico da aula',
      auditDetails(
        w.audit.filter((a) => a.entityId === l.id),
        (id) => authorName(w, id),
      ),
    )}`,
  );
  modal.element
    .querySelector<HTMLButtonElement>('[data-weather]')
    ?.addEventListener('click', async (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      const status = modal.element.querySelector<HTMLElement>('[data-weather-status]')!;
      button.disabled = true;
      status.textContent = 'Consultando Open-Meteo…';
      try {
        const weather = await request('weather.lesson', { id });
        status.textContent = `${weather.city} · Até ${weather.chance}% de chance de chuva · Pico de ${number(weather.rain)} mm/h`;
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Previsão indisponível.';
      } finally {
        button.disabled = false;
      }
    });
  modal.element
    .querySelector<HTMLButtonElement>('[data-reminder]')
    ?.addEventListener('click', (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      confirmAction(
        'Enviar lembrete',
        `Enviar o lembrete da aula de amanhã para ${email}?`,
        async () => {
          await request('reminder.send', { id });
          button.disabled = true;
          button.textContent = 'Lembrete enviado';
          ctx.notify('Lembrete aceito pelo serviço de e-mail.');
        },
      );
    });
  modal.element.querySelector('[data-edit]')?.addEventListener('click', () => {
    modal.close();
    editLesson(ctx, l);
  });
  modal.element
    .querySelector('[data-remove-lesson]')
    ?.addEventListener('click', () =>
      confirmRemoval(
        'Excluir aula',
        'A aula será removida da agenda e do progresso. Se houver relatório vinculado, exclua-o primeiro. Para desistências normais, use Cancelar aula.',
        (justification) => ctx.save('lesson.remove', { id, justification }),
      ),
    );
  modal.element.querySelector('[data-cancel]')?.addEventListener('click', () => {
    modal.close();
    cancelLesson(ctx, l);
  });
  modal.element.querySelector('[data-report]')?.addEventListener('click', () => {
    modal.close();
    report ? showReport(ctx, l.id) : editReport(ctx, l);
  });
  modal.element.querySelectorAll<HTMLElement>('[data-outcome]').forEach((button) =>
    button.addEventListener('click', () => {
      modal.close();
      const outcome = button.dataset.outcome as 'completed' | 'absent';
      formDialog(
        'Registrar ocorrência da aula',
        `<div class="col-12"><p>${outcome === 'completed' ? 'Confirmar que esta aula foi realizada com a presença do aluno? Ela contará no progresso.' : 'Confirmar a falta do aluno? Ela não contará como aula realizada.'}</p><p>O relatório continua obrigatório e pendente até seu envio.</p></div>`,
        async () => ctx.save('lesson.outcome', { id, outcome }),
        'Confirmar ocorrência',
      );
    }),
  );
}
function cancelLesson(ctx: Context, l: Lesson): void {
  formDialog(
    'Cancelar aula',
    `<div class="col-12"><p>Cancelar a aula de ${escape(studentName(ctx.workspace, l.studentId))} em ${escape(datetime(l.start))}? O histórico será preservado.</p></div>${field({ name: 'reason', label: 'Motivo do cancelamento', type: 'textarea', required: true, wide: true })}`,
    async (data) => ctx.save('lesson.cancel', { id: l.id, reason: textValue(data, 'reason') }),
    'Confirmar cancelamento',
  );
}

export function editReport(ctx: Context, l: Lesson, correction = false): void {
  const w = ctx.workspace,
    report = w.reports.find((r) => r.lessonId === l.id);
  const defaultVehicle = report ? report.vehicleId : l.status === 'absent' ? null : l.vehicleId;
  formDialog(
    correction ? 'Corrigir relatório com justificativa' : 'Relatório obrigatório da aula',
    `<div class="col-12"><div class="info-note"><strong>${escape(studentName(w, l.studentId))}</strong> · ${escape(datetime(l.start))}<br>${escape(typeLabel(l.type))} · ${escape(instructorName(w, l.instructorId))}</div></div>` +
      [
        field({
          name: 'outcome',
          label: 'Resultado / presença',
          required: true,
          options: `<option value="completed" ${(report?.outcome || l.status) !== 'absent' ? 'selected' : ''}>Realizada com presença</option><option value="absent" ${(report?.outcome || l.status) === 'absent' ? 'selected' : ''}>Falta</option>`,
        }),
        field({
          name: 'vehicleId',
          label: 'Veículo efetivamente utilizado',
          options: options(
            w.reportVehicles
              .filter(
                (v) =>
                  v.category.toUpperCase() === l.category.toUpperCase() || v.id === defaultVehicle,
              )
              .map((v) => ({ id: v.id, name: `${v.plate} · ${v.model}` })),
            defaultVehicle || '',
            'Sem uso de veículo',
          ),
          help: 'Escolha o veículo realmente utilizado, inclusive substituto. Nas faltas sem uso e nas teóricas sem veículo, deixe sem veículo.',
        }),
        field({
          name: 'odometerStart',
          label: 'Hodômetro inicial (km)',
          type: 'number',
          min: 0,
          step: '0.1',
          value: report?.odometerStart ?? '',
          help: 'Registre a leitura real do painel.',
        }),
        field({
          name: 'odometerEnd',
          label: 'Hodômetro final (km)',
          type: 'number',
          min: 0,
          step: '0.1',
          value: report?.odometerEnd ?? '',
        }),
        '<div class="col-12"><output class="distance-preview info-note" aria-live="polite">Distância: informe os hodômetros quando houve uso de veículo.</output></div>',
        field({
          name: 'notes',
          label: 'Observações e desempenho do aluno',
          type: 'textarea',
          required: true,
          value: report?.notes || '',
          wide: true,
        }),
        ...(correction
          ? [
              field({
                name: 'justification',
                label: 'Justificativa da correção',
                type: 'textarea',
                required: true,
                wide: true,
                help: 'O relatório anterior e sua autoria permanecem no histórico.',
              }),
            ]
          : []),
      ].join(''),
    async (data) => {
      const vehicleId = textValue(data, 'vehicleId') || null;
      const payload: SaveReport = {
        lessonId: l.id,
        outcome: textValue(data, 'outcome') as SaveReport['outcome'],
        notes: textValue(data, 'notes'),
        vehicleId,
        odometerStart: vehicleId ? numericValue(data, 'odometerStart') : null,
        odometerEnd: vehicleId ? numericValue(data, 'odometerEnd') : null,
        ...(correction ? { justification: textValue(data, 'justification') } : {}),
      };
      if (vehicleId && payload.odometerEnd! < payload.odometerStart!)
        throw new Error(
          'O hodômetro final deve ser igual ou maior que o inicial. Confira as leituras do painel.',
        );
      await ctx.save('report.save', payload);
    },
    correction ? 'Salvar correção' : 'Enviar relatório',
    (form) => {
      const vehicle = form.elements.namedItem('vehicleId') as HTMLSelectElement;
      const start = form.elements.namedItem('odometerStart') as HTMLInputElement;
      const end = form.elements.namedItem('odometerEnd') as HTMLInputElement;
      const outcome = form.elements.namedItem('outcome') as HTMLSelectElement;
      const update = (): void => {
        start.required = end.required = Boolean(vehicle.value);
        start.disabled = end.disabled = !vehicle.value;
        const output = form.querySelector<HTMLOutputElement>('output')!;
        output.textContent = !vehicle.value
          ? 'Sem uso de veículo: não haverá movimento de quilometragem.'
          : start.value && end.value
            ? `Distância calculada: ${number(Number(end.value) - Number(start.value))} km`
            : 'Informe os dois hodômetros para calcular a distância.';
      };
      vehicle.addEventListener('change', update);
      start.addEventListener('input', update);
      end.addEventListener('input', update);
      outcome.addEventListener('change', () => {
        if (outcome.value === 'absent') vehicle.value = '';
        update();
      });
      update();
    },
  );
}
export function showReport(ctx: Context, lessonId: string): void {
  const w = ctx.workspace,
    l = w.lessons.find((item) => item.id === lessonId),
    r = w.reports.find((item) => item.lessonId === lessonId);
  if (!r || !l) return;
  const modal = dialog(
    'Relatório da aula',
    `<div class="detail-badges">${statusBadge(l)}${reportBadge(w, l)}</div><h3 class="detail-title">${escape(studentName(w, l.studentId))}</h3><dl class="detail-grid"><div><dt>Aula</dt><dd>${escape(datetime(l.start))} · ${escape(typeLabel(l.type))}</dd></div><div><dt>Instrutor</dt><dd>${escape(instructorName(w, l.instructorId))}</dd></div><div><dt>Autor do envio</dt><dd>${escape(authorName(w, r.authorId))}</dd></div><div><dt>Enviado em</dt><dd>${escape(datetime(r.submittedAt))}</dd></div><div><dt>Última correção</dt><dd>${r.updatedAt ? escape(datetime(r.updatedAt)) : 'Sem correções'}</dd></div><div><dt>Veículo utilizado</dt><dd>${escape(vehicleName(w, r.vehicleId))}</dd></div><div><dt>Hodômetros</dt><dd>${r.odometerStart !== null ? `${number(r.odometerStart)} → ${number(r.odometerEnd!)} km` : 'Não aplicável'}</dd></div><div><dt>Distância da aula</dt><dd>${r.odometerStart !== null ? `${number(r.odometerEnd! - r.odometerStart)} km` : 'Sem uso de veículo'}</dd></div></dl><h3 class="section-label">Observações e desempenho</h3><p class="preserve-lines">${escape(r.notes)}</p>${
      isAdmin(ctx)
        ? action('Corrigir relatório', 'data-correct') +
          action('Excluir relatório', 'data-remove-report') +
          panel(
            'Histórico e autoria das correções',
            auditDetails(
              w.audit.filter(
                (a) => a.entityId === r.id || (a.entityId === l.id && a.entity.includes('report')),
              ),
              (id) => authorName(w, id),
            ),
          )
        : ''
    }`,
  );
  modal.element.querySelector('[data-correct]')?.addEventListener('click', () => {
    modal.close();
    editReport(ctx, l, true);
  });
  modal.element
    .querySelector('[data-remove-report]')
    ?.addEventListener('click', () =>
      confirmRemoval(
        'Excluir relatório',
        'O relatório e o movimento de quilometragem vinculado serão excluídos. A ocorrência da aula será mantida e o relatório voltará a ficar pendente para o instrutor.',
        (justification) => ctx.save('report.remove', { id: r.id, justification }),
      ),
    );
}
