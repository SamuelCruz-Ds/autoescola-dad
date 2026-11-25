import type {
  MaintenancePlan,
  MaintenanceRecord,
  Movement,
  SaveVehicle,
  Vehicle,
} from '../../shared/types';
import type { Context, View } from '../core/context';
import {
  authorName,
  instructorName,
  lessonHeaders,
  lessonRows,
  maintenanceRows,
  maintenanceState,
  studentName,
  vehicleName,
} from '../core/queries';
import {
  action,
  auditDetails,
  badge,
  bindLessons,
  date,
  dateInput,
  datetime,
  dialog,
  confirmAction,
  confirmRemoval,
  escape,
  field,
  formDialog,
  now,
  number,
  numericValue,
  options,
  panel,
  table,
  td,
  textValue,
  today,
} from '../core/ui';
import { confirmInForm } from './people';

const vehicleStatus = {
  available: 'Disponível',
  maintenance: 'Em manutenção',
  inactive: 'Inativo',
};
const chronological = (a: Movement, b: Movement): number =>
  a.at.localeCompare(b.at) || a.odometerStart - b.odometerStart || a.id.localeCompare(b.id);
let query = '',
  status = '';
export function resetFleetFilters(): void {
  query = '';
  status = '';
}
export function vehiclesView(ctx: Context): View {
  const w = ctx.workspace;
  const vehicles = w.vehicles.filter(
    (v) =>
      `${v.model} ${v.plate} ${v.category}`
        .toLocaleLowerCase('pt-BR')
        .includes(query.toLocaleLowerCase('pt-BR')) &&
      (!status || v.status === status),
  );
  return {
    html: `<div class="page-heading"><div><p class="eyebrow">FROTA</p><h1>Veículos e manutenção</h1><p>Disponibilidade, hodômetros e cuidados com cada veículo.</p></div>${action('＋ Cadastrar veículo', 'data-new', true)}</div><section class="filter-panel"><form class="row g-3" id="vehicle-search">${field({ name: 'query', label: 'Pesquisar modelo, placa ou categoria', value: query })}${field(
      {
        name: 'status',
        label: 'Situação',
        options: `<option value="">Todas</option>${Object.entries(vehicleStatus)
          .map(
            ([value, label]) =>
              `<option value="${value}" ${status === value ? 'selected' : ''}>${label}</option>`,
          )
          .join('')}`,
      },
    )}<div class="col-12"><button type="submit" class="btn btn-primary">Pesquisar</button></div></form></section>${panel(
      `${vehicles.length} veículos`,
      table(
        ['Veículo', 'Categoria', 'Hodômetro atual', 'Situação', 'Avisos', 'Ações'],
        vehicles.map((v) => {
          const plans = w.maintenancePlans.filter(
            (p) => p.vehicleId === v.id && p.active && maintenanceState(w, p).label !== 'Em dia',
          );
          return td(
            `<strong>${escape(v.plate)}</strong><span class="cell-sub">${escape(v.model)}</span>`,
            escape(v.category),
            `<strong>${number(v.currentOdometer)} km</strong>`,
            badge(
              vehicleStatus[v.status],
              v.status === 'available'
                ? 'success'
                : v.status === 'maintenance'
                  ? 'warning'
                  : 'neutral',
            ),
            plans.length ? `${plans.length} manutenção(ões) com aviso` : 'Sem avisos de manutenção',
            action('Ver ficha', `data-vehicle="${escape(v.id)}"`),
          );
        }),
        'Veículos',
      ),
    )}${panel(
      'Manutenções programadas',
      table(
        ['Veículo', 'Serviço', 'Limite', 'Margem de aviso', 'Situação', 'Ações'],
        maintenanceRows(
          w,
          w.maintenancePlans.filter((p) => p.active),
        ),
        'Manutenções programadas',
      ),
      action('Programar manutenção', 'data-new-plan'),
    )}`,
    bind(root) {
      root.querySelector('#vehicle-search')!.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget as HTMLFormElement);
        query = textValue(d, 'query');
        status = textValue(d, 'status');
        ctx.navigate('vehicles');
      });
      root.querySelector('[data-new]')!.addEventListener('click', () => editVehicle(ctx));
      root.querySelector('[data-new-plan]')!.addEventListener('click', () => editPlan(ctx));
      root
        .querySelectorAll<HTMLElement>('[data-vehicle]')
        .forEach((b) => b.addEventListener('click', () => showVehicle(ctx, b.dataset.vehicle!)));
      bindPlans(root, ctx);
    },
  };
}
export function editVehicle(ctx: Context, vehicle?: Vehicle): void {
  const affected = ctx.workspace.lessons.filter(
    (l) => l.vehicleId === vehicle?.id && l.status === 'scheduled' && l.start >= now(),
  );
  formDialog(
    vehicle ? 'Editar veículo' : 'Cadastrar veículo',
    [
      field({
        name: 'model',
        label: 'Identificação / modelo',
        value: vehicle?.model,
        required: true,
      }),
      field({ name: 'plate', label: 'Placa', value: vehicle?.plate, required: true }),
      field({ name: 'category', label: 'Categoria', value: vehicle?.category, required: true }),
      field({
        name: 'initialOdometer',
        label: 'Hodômetro inicial (km)',
        type: 'number',
        value: vehicle?.initialOdometer ?? '',
        required: true,
        min: 0,
        step: '0.1',
        readonly: Boolean(vehicle),
        help: vehicle
          ? 'Leitura inicial preservada. Novos deslocamentos são registrados na ficha.'
          : 'Leitura real no início do uso do sistema.',
      }),
      field({
        name: 'status',
        label: 'Situação',
        required: true,
        options: Object.entries(vehicleStatus)
          .map(
            ([value, label]) =>
              `<option value="${value}" ${vehicle?.status === value ? 'selected' : ''}>${label}</option>`,
          )
          .join(''),
      }),
      ...(affected.length
        ? [
            `<div class="col-12"><div class="alert alert-warning"><strong>${affected.length} aulas futuras vinculadas.</strong> Ao indisponibilizar este veículo, providencie substituição ou remarcação. As aulas não serão apagadas.<ul>${affected
              .slice(0, 8)
              .map(
                (l) =>
                  `<li>${escape(datetime(l.start))} · ${escape(studentName(ctx.workspace, l.studentId))}</li>`,
              )
              .join('')}</ul></div></div>`,
          ]
        : []),
    ].join(''),
    async (data, form) => {
      if (
        vehicle?.status !== 'inactive' &&
        textValue(data, 'status') === 'inactive' &&
        !(await confirmInForm(
          form,
          'Confirmo a desativação do veículo e a reorganização das aulas futuras vinculadas.',
        ))
      )
        throw new Error('Marque a confirmação de desativação antes de salvar.');
      const payload: SaveVehicle = {
        ...(vehicle ? { id: vehicle.id } : {}),
        model: textValue(data, 'model'),
        plate: textValue(data, 'plate'),
        category: textValue(data, 'category'),
        initialOdometer: numericValue(data, 'initialOdometer'),
        status: textValue(data, 'status') as Vehicle['status'],
      };
      await ctx.save('vehicle.save', payload);
    },
  );
}
export function mileageGaps(ctx: Context, vehicle: Vehicle): string[] {
  let previous = vehicle.initialOdometer;
  const gaps: string[] = [];
  [...ctx.workspace.movements]
    .filter((m) => m.vehicleId === vehicle.id)
    .sort(chronological)
    .forEach((m) => {
      if (m.odometerStart > previous)
        gaps.push(
          `${datetime(m.at)}: diferença de ${number(m.odometerStart - previous)} km entre a leitura anterior (${number(previous)}) e o início (${number(m.odometerStart)}).`,
        );
      if (m.odometerStart < previous)
        gaps.push(
          `${datetime(m.at)}: leitura inicial inferior ao movimento anterior; confira a sequência.`,
        );
      previous = m.odometerEnd;
    });
  return gaps;
}
export function showVehicle(ctx: Context, id: string): void {
  const w = ctx.workspace,
    v = w.vehicles.find((item) => item.id === id);
  if (!v) return;
  const movements = [...w.movements].filter((m) => m.vehicleId === id).sort(chronological);
  const gaps = mileageGaps(ctx, v),
    plans = w.maintenancePlans.filter((p) => p.vehicleId === id && p.active);
  const future = w.lessons.filter(
    (l) => l.vehicleId === id && l.status === 'scheduled' && l.start >= now(),
  );
  const records = w.maintenanceRecords.filter((r) => r.vehicleId === id);
  const canDelete =
    !movements.length &&
    !w.maintenancePlans.some((item) => item.vehicleId === id) &&
    !w.lessons.some((item) => item.vehicleId === id) &&
    !w.reports.some((item) => item.vehicleId === id);
  const inactivePlans = w.maintenancePlans.filter((p) => p.vehicleId === id && !p.active);
  const modal = dialog(
    'Ficha do veículo',
    `<div class="detail-badges">${badge(vehicleStatus[v.status], v.status === 'available' ? 'success' : 'warning')}</div><h3 class="detail-title">${escape(v.plate)} · ${escape(v.model)}</h3><dl class="detail-grid"><div><dt>Categoria</dt><dd>${escape(v.category)}</dd></div><div><dt>Hodômetro inicial</dt><dd>${number(v.initialOdometer)} km</dd></div><div><dt>Hodômetro atual confirmado</dt><dd><strong>${number(v.currentOdometer)} km</strong></dd></div><div><dt>Distância registrada em aulas</dt><dd>${number(movements.filter((m) => m.origin === 'lesson').reduce((sum, m) => sum + m.odometerEnd - m.odometerStart, 0))} km</dd></div></dl>
    <p class="form-text">O hodômetro atual representa a última leitura confirmada. O total em aulas soma apenas as distâncias das aulas.</p>
    ${v.status !== 'available' && future.length ? `<p class="alert alert-warning">${future.length} aulas futuras usam este veículo indisponível e precisam ser reorganizadas.</p>` : ''}
    ${gaps.length ? `<div class="alert alert-warning"><strong>Confira a continuidade dos hodômetros</strong><ul>${gaps.map((g) => `<li>${escape(g)}</li>`).join('')}</ul><p>Regularize o relatório pendente ou registre um movimento externo ou ajuste justificado. Lacunas não são contadas como quilômetros de aula.</p></div>` : ''}
    <div class="d-flex flex-wrap gap-2">${action('Editar veículo', 'data-edit')}${action('Registrar movimento externo / ajuste', 'data-movement', true)}${action('Programar manutenção', 'data-new-plan')}${canDelete ? action('Excluir veículo', 'data-delete') : ''}</div>
    ${panel(
      'Histórico cronológico de quilometragem',
      table(
        [
          'Data / origem',
          'Hodômetros',
          'Distância',
          'Vínculo / justificativa',
          'Responsável',
          'Ações',
        ],
        movements.map((m) => {
          const l = w.lessons.find((l) => l.id === m.lessonId);
          return td(
            `${escape(datetime(m.at))}<span class="cell-sub">${m.origin === 'lesson' ? 'Aula' : m.origin === 'external' ? 'Deslocamento externo' : 'Ajuste justificado'}</span>`,
            `${number(m.odometerStart)} → ${number(m.odometerEnd)} km`,
            `${number(m.odometerEnd - m.odometerStart)} km`,
            l
              ? `${escape(studentName(w, l.studentId))}<span class="cell-sub">${escape(instructorName(w, l.instructorId))}</span>`
              : escape(m.justification),
            escape(authorName(w, m.authorId)),
            l
              ? action('Ver aula', `data-lesson="${escape(l.id)}"`)
              : `<div class="row-actions">${action('Corrigir', `data-movement-id="${escape(m.id)}"`)}${action('Excluir', `data-remove-movement="${escape(m.id)}"`)}</div>`,
          );
        }),
        'Movimentos de quilometragem',
      ),
    )}
    ${panel('Próximas manutenções', table(['Veículo', 'Serviço', 'Limite', 'Margem', 'Situação', 'Ações'], maintenanceRows(w, plans), 'Próximas manutenções'))}
    ${
      inactivePlans.length
        ? panel(
            'Programações encerradas',
            table(
              ['Serviço', 'Ação'],
              inactivePlans.map((plan) =>
                td(
                  escape(plan.service),
                  action('Ver programação', `data-plan="${escape(plan.id)}"`),
                ),
              ),
              'Programações encerradas',
            ),
          )
        : ''
    }
    ${panel(
      'Manutenções realizadas',
      table(
        ['Data', 'Serviço', 'Hodômetro', 'Observações', 'Responsável', 'Ações'],
        records.map((r) =>
          td(
            escape(date(r.date)),
            escape(r.service),
            `${number(r.odometer)} km`,
            escape(r.notes),
            escape(authorName(w, r.authorId)),
            action('Corrigir', `data-edit-record="${escape(r.id)}"`) +
              action('Excluir', `data-remove-record="${escape(r.id)}"`),
          ),
        ),
        'Histórico de manutenção',
      ),
    )}
    ${panel(
      'Aulas vinculadas',
      table(
        lessonHeaders,
        lessonRows(
          w,
          w.lessons.filter((l) => l.vehicleId === id),
        ),
        'Aulas do veículo',
      ),
    )}
    ${panel(
      'Correções e auditoria',
      auditDetails(
        w.audit.filter(
          (a) =>
            a.entityId === id ||
            movements.some((m) => m.id === a.entityId) ||
            ((a.entity === 'report' ||
              a.entity === 'maintenanceRecord' ||
              a.entity === 'maintenancePlan') &&
              (w.reports.some((r) => r.id === a.entityId && r.vehicleId === id) ||
                auditUsedVehicle(a.before, id) ||
                auditUsedVehicle(a.after, id))),
        ),
        (id) => authorName(w, id),
      ),
    )}`,
  );
  modal.element.querySelector('[data-edit]')!.addEventListener('click', () => {
    modal.close();
    editVehicle(ctx, v);
  });
  modal.element.querySelectorAll<HTMLElement>('[data-edit-record]').forEach((button) =>
    button.addEventListener('click', () => {
      const record = records.find((item) => item.id === button.dataset.editRecord);
      if (record) editMaintenanceRecord(ctx, record);
    }),
  );
  modal.element
    .querySelectorAll<HTMLElement>('[data-remove-record]')
    .forEach((button) =>
      button.addEventListener('click', () =>
        confirmRemoval(
          'Excluir manutenção realizada',
          'O registro do serviço será excluído. A próxima programação de manutenção será mantida; revise-a separadamente, se necessário.',
          (justification) =>
            ctx.save('maintenance.record.remove', {
              id: button.dataset.removeRecord!,
              justification,
            }),
        ),
      ),
    );
  modal.element
    .querySelector('[data-delete]')
    ?.addEventListener('click', () =>
      confirmAction('Excluir veículo', 'Confirma a exclusão deste veículo sem histórico?', () =>
        ctx.save('catalog.remove', { entity: 'vehicle', id }),
      ),
    );
  modal.element.querySelectorAll<HTMLElement>('[data-remove-movement]').forEach((button) =>
    button.addEventListener('click', () =>
      formDialog(
        'Excluir movimentação',
        field({
          name: 'justification',
          label: 'Justificativa',
          required: true,
          type: 'textarea',
          wide: true,
        }),
        async (data) =>
          ctx.save('movement.remove', {
            id: button.dataset.removeMovement!,
            justification: textValue(data, 'justification'),
          }),
        'Confirmar exclusão',
      ),
    ),
  );
  modal.element.querySelector('[data-movement]')!.addEventListener('click', () => {
    modal.close();
    editMovement(ctx, id);
  });
  modal.element.querySelector('[data-new-plan]')!.addEventListener('click', () => {
    modal.close();
    editPlan(ctx, undefined, id);
  });
  modal.element.querySelectorAll<HTMLElement>('[data-movement-id]').forEach((b) =>
    b.addEventListener('click', () => {
      modal.close();
      editMovement(
        ctx,
        id,
        movements.find((m) => m.id === b.dataset.movementId),
      );
    }),
  );
  bindLessons(modal.element, ctx.showLesson);
  bindPlans(modal.element, ctx);
}
export function editMovement(ctx: Context, vehicleId: string, movement?: Movement): void {
  formDialog(
    movement ? 'Corrigir movimento justificado' : 'Registrar movimento fora de aula',
    [
      field({
        name: 'vehicleId',
        label: 'Veículo',
        required: true,
        options: options(
          ctx.workspace.vehicles.map((v) => ({ id: v.id, name: `${v.plate} · ${v.model}` })),
          vehicleId,
        ),
      }),
      field({
        name: 'origin',
        label: 'Origem do movimento',
        options: `<option value="external" ${movement?.origin !== 'adjustment' ? 'selected' : ''}>Deslocamento externo</option><option value="adjustment" ${movement?.origin === 'adjustment' ? 'selected' : ''}>Ajuste justificado</option>`,
      }),
      field({
        name: 'at',
        label: 'Data e horário',
        type: 'datetime-local',
        value: movement ? dateInput(movement.at) : now(),
        required: true,
      }),
      field({
        name: 'odometerStart',
        label: 'Hodômetro inicial (km)',
        type: 'number',
        min: 0,
        step: '0.1',
        value: movement?.odometerStart ?? '',
        required: true,
      }),
      field({
        name: 'odometerEnd',
        label: 'Hodômetro final (km)',
        type: 'number',
        min: 0,
        step: '0.1',
        value: movement?.odometerEnd ?? '',
        required: true,
      }),
      field({
        name: 'justification',
        label: movement ? 'Justificativa da correção' : 'Justificativa do deslocamento / ajuste',
        type: 'textarea',
        value: movement?.justification,
        required: true,
        wide: true,
      }),
      '<div class="col-12"><p class="info-note">Esta movimentação atualiza o veículo e os avisos de manutenção, sem contar como aula realizada. O sistema verifica a sequência cronológica.</p></div>',
    ].join(''),
    async (data) => {
      if (numericValue(data, 'odometerEnd') < numericValue(data, 'odometerStart'))
        throw new Error('O hodômetro final deve ser igual ou maior que o inicial.');
      await ctx.save('movement.save', {
        ...(movement ? { id: movement.id } : {}),
        vehicleId: textValue(data, 'vehicleId'),
        origin: textValue(data, 'origin') as 'external' | 'adjustment',
        at: textValue(data, 'at'),
        odometerStart: numericValue(data, 'odometerStart'),
        odometerEnd: numericValue(data, 'odometerEnd'),
        justification: textValue(data, 'justification'),
      });
    },
  );
}
export function editPlan(ctx: Context, plan?: MaintenancePlan, vehicleId = ''): void {
  formDialog(
    plan ? 'Editar manutenção programada' : 'Programar manutenção',
    [
      field({
        name: 'vehicleId',
        label: 'Veículo',
        required: true,
        options: options(
          ctx.workspace.vehicles.map((v) => ({ id: v.id, name: `${v.plate} · ${v.model}` })),
          plan?.vehicleId || vehicleId,
        ),
      }),
      field({ name: 'service', label: 'Serviço', value: plan?.service, required: true }),
      field({
        name: 'targetOdometer',
        label: 'Quilometragem prevista (km)',
        type: 'number',
        min: 0,
        step: '0.1',
        value: plan?.targetOdometer ?? '',
        required: true,
      }),
      field({
        name: 'warningKm',
        label: 'Margem de aviso (km)',
        type: 'number',
        min: 0,
        step: '0.1',
        value: plan?.warningKm ?? '',
        required: true,
        help: 'Informe o limite definido para este veículo e serviço.',
      }),
      ...(plan
        ? [
            field({
              name: 'active',
              label: 'Situação',
              options: `<option value="true" ${plan.active ? 'selected' : ''}>Ativa</option><option value="false" ${!plan.active ? 'selected' : ''}>Arquivada</option>`,
            }),
          ]
        : []),
      field({
        name: 'notes',
        label: 'Observações',
        type: 'textarea',
        value: plan?.notes,
        wide: true,
      }),
    ].join(''),
    async (data) =>
      ctx.save('maintenance.save', {
        ...(plan ? { id: plan.id, active: textValue(data, 'active') === 'true' } : {}),
        vehicleId: textValue(data, 'vehicleId'),
        service: textValue(data, 'service'),
        targetOdometer: numericValue(data, 'targetOdometer'),
        warningKm: numericValue(data, 'warningKm'),
        notes: textValue(data, 'notes'),
      }),
  );
}
export function showPlan(ctx: Context, id: string): void {
  const w = ctx.workspace,
    p = w.maintenancePlans.find((p) => p.id === id);
  if (!p) return;
  const state = maintenanceState(w, p);
  const modal = dialog(
    'Manutenção programada',
    `<div class="detail-badges">${badge(p.active ? state.label : 'Encerrada', p.active ? state.tone : 'neutral')}</div><h3 class="detail-title">${escape(p.service)}</h3><dl class="detail-grid"><div><dt>Veículo</dt><dd>${escape(vehicleName(w, p.vehicleId))}</dd></div><div><dt>Quilometragem prevista</dt><dd>${number(p.targetOdometer)} km</dd></div><div><dt>Margem de aviso</dt><dd>${number(p.warningKm)} km</dd></div><div><dt>Observações</dt><dd>${escape(p.notes || 'Sem observações')}</dd></div></dl><p class="info-note">O aviso não altera automaticamente a disponibilidade do veículo. Concluir este serviço não conclui outros.</p><div class="d-flex gap-2">${action('Editar programação', 'data-edit')}${p.active ? action('Registrar manutenção realizada', 'data-complete', true) : ''}${action('Excluir programação', 'data-remove-plan')}</div>`,
  );
  modal.element.querySelector('[data-edit]')!.addEventListener('click', () => {
    modal.close();
    editPlan(ctx, p);
  });
  modal.element.querySelector('[data-complete]')?.addEventListener('click', () => {
    modal.close();
    completePlan(ctx, p);
  });
  modal.element
    .querySelector('[data-remove-plan]')
    ?.addEventListener('click', () =>
      confirmRemoval(
        'Excluir programação',
        'A programação será excluída se não possuir serviços realizados vinculados. Para preservar esses serviços, use a opção Arquivada na edição.',
        (justification) => ctx.save('maintenance.remove', { id, justification }),
      ),
    );
}
function completePlan(ctx: Context, p: MaintenancePlan): void {
  formDialog(
    'Registrar manutenção realizada',
    `<div class="col-12"><p><strong>${escape(p.service)}</strong> · ${escape(vehicleName(ctx.workspace, p.vehicleId))}</p></div>` +
      [
        field({
          name: 'date',
          label: 'Data do serviço',
          type: 'date',
          value: today(),
          required: true,
        }),
        field({
          name: 'odometer',
          label: 'Hodômetro no serviço (km)',
          type: 'number',
          min: 0,
          step: '0.1',
          required: true,
        }),
        field({ name: 'notes', label: 'Observações', type: 'textarea', wide: true }),
        field({
          name: 'nextTarget',
          label: 'Próxima manutenção deste serviço (km)',
          type: 'number',
          min: 0,
          step: '0.1',
          help: 'Opcional. Deixe vazio para concluir sem nova programação.',
        }),
        field({
          name: 'nextWarningKm',
          label: 'Margem do próximo aviso (km)',
          type: 'number',
          min: 0,
          step: '0.1',
          help: 'Preencha junto com o próximo limite.',
        }),
      ].join(''),
    async (data) =>
      ctx.save('maintenance.complete', {
        planId: p.id,
        date: textValue(data, 'date'),
        odometer: numericValue(data, 'odometer'),
        notes: textValue(data, 'notes'),
        nextTarget: textValue(data, 'nextTarget') ? numericValue(data, 'nextTarget') : null,
        nextWarningKm: textValue(data, 'nextWarningKm')
          ? numericValue(data, 'nextWarningKm')
          : null,
      }),
    'Registrar serviço',
  );
}
export function bindPlans(root: HTMLElement, ctx: Context): void {
  root
    .querySelectorAll<HTMLElement>('[data-plan]')
    .forEach((b) => b.addEventListener('click', () => showPlan(ctx, b.dataset.plan!)));
}
function editMaintenanceRecord(ctx: Context, record: MaintenanceRecord): void {
  formDialog(
    'Corrigir manutenção realizada',
    [
      `<div class="col-12"><p>${escape(vehicleName(ctx.workspace, record.vehicleId))}. A autoria original será preservada. A próxima programação não será alterada por esta correção.</p></div>`,
      field({ name: 'service', label: 'Serviço realizado', value: record.service, required: true }),
      field({
        name: 'date',
        label: 'Data do serviço',
        type: 'date',
        value: record.date,
        max: today(),
        required: true,
      }),
      field({
        name: 'odometer',
        label: 'Hodômetro no serviço (km)',
        type: 'number',
        value: record.odometer,
        min: 0,
        step: '0.1',
        required: true,
      }),
      field({
        name: 'notes',
        label: 'Observações',
        type: 'textarea',
        value: record.notes,
        wide: true,
      }),
      field({
        name: 'justification',
        label: 'Justificativa da correção',
        type: 'textarea',
        required: true,
        wide: true,
      }),
    ].join(''),
    async (data) =>
      ctx.save('maintenance.record.save', {
        id: record.id,
        service: textValue(data, 'service'),
        date: textValue(data, 'date'),
        odometer: numericValue(data, 'odometer'),
        notes: textValue(data, 'notes'),
        justification: textValue(data, 'justification'),
      }),
    'Salvar correção',
  );
}
function auditUsedVehicle(value: string, vehicleId: string): boolean {
  try {
    const snapshot = JSON.parse(value) as {
      vehicleId?: string;
      report?: { vehicleId?: string };
      movements?: { vehicleId: string }[];
    };
    return (
      snapshot?.vehicleId === vehicleId ||
      snapshot?.report?.vehicleId === vehicleId ||
      Boolean(snapshot?.movements?.some((m) => m.vehicleId === vehicleId))
    );
  } catch {
    return false;
  }
}
