import type {
  Availability,
  Instructor,
  SaveInstructor,
  SaveStudent,
  Student,
} from '../../shared/types';
import type { Context, View } from '../core/context';
import { isAdmin, request } from '../core/context';
import {
  instructorName,
  lessonHeaders,
  lessonRows,
  pending,
  progress,
  progressCards,
} from '../core/queries';
import {
  action,
  badge,
  bindLessons,
  datetime,
  dialog,
  confirmAction,
  confirmRemoval,
  escape,
  field,
  formDialog,
  monthStart,
  number,
  numericValue,
  options,
  panel,
  table,
  td,
  textValue,
  today,
} from '../core/ui';

import { editAccess } from './access';
import { bindStudentExams, studentExams } from './exams';

let studentSearch = '',
  studentStatus = 'active',
  instructorSearch = '',
  instructorStatus = 'active';
export function resetPeopleFilters(): void {
  studentSearch = '';
  studentStatus = 'active';
  instructorSearch = '';
  instructorStatus = 'active';
}
const weekdays = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];
export function studentsView(ctx: Context): View {
  const w = ctx.workspace;
  const students = w.students.filter(
    (s) =>
      (!studentSearch ||
        `${s.name} ${s.contact} ${s.category}`
          .toLocaleLowerCase('pt-BR')
          .includes(studentSearch.toLocaleLowerCase('pt-BR'))) &&
      (studentStatus === 'all' || s.active === (studentStatus === 'active')),
  );
  return {
    html: `<div class="page-heading"><div><p class="eyebrow">ACOMPANHAMENTO</p><h1>${isAdmin(ctx) ? 'Alunos' : 'Meus alunos'}</h1><p>${isAdmin(ctx) ? 'Cadastros, metas e evolução em cada tipo de aula.' : 'Alunos com vínculo de atendimento e histórico das suas aulas.'}</p></div>${isAdmin(ctx) ? action('＋ Cadastrar aluno', 'data-new', true) : ''}</div>${isAdmin(ctx) ? `<form class="cep-shortcut" data-new-by-cep><label for="new-student-cep"><strong>Novo aluno pelo CEP</strong><small>Endereço automático · ViaCEP</small></label><input id="new-student-cep" name="cep" class="form-control" inputmode="numeric" placeholder="00000-000" maxlength="9" pattern="[0-9]{5}-?[0-9]{3}" title="Informe os oito dígitos do CEP" required><button class="btn btn-outline-secondary" type="submit">Iniciar cadastro</button></form>` : ''}<section class="filter-panel"><form id="student-search" class="row g-3">${field({ name: 'query', label: 'Pesquisar por nome, contato ou categoria', value: studentSearch })}${field({ name: 'status', label: 'Situação', options: `<option value="active" ${studentStatus === 'active' ? 'selected' : ''}>Ativos</option><option value="inactive" ${studentStatus === 'inactive' ? 'selected' : ''}>Inativos</option><option value="all" ${studentStatus === 'all' ? 'selected' : ''}>Todos</option>` })}<div class="col-12"><button class="btn btn-primary" type="submit">Pesquisar</button></div></form></section>${panel(
      `${students.length} alunos encontrados`,
      table(
        ['Aluno', 'Categoria / contato', 'Responsável', 'Progresso', 'Situação', 'Ações'],
        students.map((s) => {
          const theory = progress(w, s.id, 'theory'),
            practice = progress(w, s.id, 'practice');
          return td(
            `<strong>${escape(s.name)}</strong>`,
            `${escape(s.category)}<span class="cell-sub">${escape(s.contact)}</span>`,
            escape(instructorName(w, s.instructorId)),
            (
              [
                ['Teóricas', theory],
                ['Práticas', practice],
              ] as const
            )
              .map(([label, v]) => {
                const percent = v.required ? Math.min(100, (100 * v.completed) / v.required) : 0;
                return `<div class="lesson-progress"><span>${label} · ${v.completed}/${v.required}</span><i aria-hidden="true"><b style="width:${percent}%"></b></i></div>`;
              })
              .join(''),
            badge(s.active ? 'Ativo' : 'Inativo', s.active ? 'success' : 'neutral'),
            action('Ver ficha', `data-student="${escape(s.id)}"`),
          );
        }),
        'Alunos',
      ),
    )}`,
    bind(root) {
      root.querySelector('[data-new-by-cep]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        editStudent(ctx, undefined, textValue(new FormData(form), 'cep'));
      });
      root.querySelector('#student-search')!.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget as HTMLFormElement);
        studentSearch = textValue(data, 'query');
        studentStatus = textValue(data, 'status');
        ctx.navigate('students');
      });
      root.querySelector('[data-new]')?.addEventListener('click', () => editStudent(ctx));
      root
        .querySelectorAll<HTMLElement>('[data-student]')
        .forEach((b) => b.addEventListener('click', () => showStudent(ctx, b.dataset.student!)));
    },
  };
}
export function editStudent(ctx: Context, student?: Student, initialCep?: string): void {
  const w = ctx.workspace;
  const details = w.studentDetails.find((item) => item.id === student?.id);
  const address = details?.address;
  formDialog(
    student ? 'Editar aluno' : 'Cadastrar aluno',
    [
      field({ name: 'name', label: 'Nome', value: student?.name, required: true }),
      field({ name: 'contact', label: 'Contato', value: student?.contact, required: true }),
      field({
        name: 'category',
        label: 'Categoria',
        value: student?.category || 'B',
        required: true,
      }),
      field({
        name: 'instructorId',
        label: 'Instrutor responsável',
        required: true,
        options: options(
          w.instructors.filter((i) => i.active || i.id === student?.instructorId),
          student?.instructorId,
        ),
      }),
      `<div class="col-12"><section class="student-address"><header><h3>Endereço e lembretes</h3><span>ViaCEP</span></header><div class="row g-2">
          ${field({ name: 'email', label: 'E-mail para lembretes', type: 'email', value: details?.email, wide: true })}
          ${field({ name: 'cep', label: 'CEP', value: initialCep || address?.cep })}
          <div class="col-md-6 align-self-end">${action('Buscar endereço pelo CEP', 'data-cep')}</div>
          <p class="col-12 form-text mt-1 mb-0" role="status" data-cep-status></p>
          ${field({ name: 'street', label: 'Logradouro', value: address?.street })}
          ${field({ name: 'district', label: 'Bairro', value: address?.district })}
          ${field({ name: 'city', label: 'Cidade', value: address?.city })}
          ${field({ name: 'state', label: 'UF', value: address?.state })}
        </div></section></div>`,
      field({
        name: 'theoryRequired',
        label: 'Meta de aulas teóricas',
        type: 'number',
        required: true,
        min: 0,
        step: '1',
        value: student ? progress(w, student.id, 'theory').required : '',
      }),
      field({
        name: 'practiceRequired',
        label: 'Meta de aulas práticas',
        type: 'number',
        required: true,
        min: 0,
        step: '1',
        value: student ? progress(w, student.id, 'practice').required : '',
      }),
      field({
        name: 'active',
        label: 'Situação do cadastro',
        options: `<option value="true" ${student?.active !== false ? 'selected' : ''}>Ativo</option><option value="false" ${student?.active === false ? 'selected' : ''}>Inativo</option>`,
      }),
      field({
        name: 'notes',
        label: 'Observações para acompanhamento',
        type: 'textarea',
        value: student?.notes,
        wide: true,
      }),
    ].join(''),
    async (data, form) => {
      if (
        student?.active &&
        textValue(data, 'active') === 'false' &&
        !(await confirmInForm(form, 'Confirme a desativação do aluno. O histórico será mantido.'))
      )
        return Promise.reject(new Error('Marque a confirmação para desativar o aluno.'));
      const cep = textValue(data, 'cep');
      if (!cep && ['street', 'district', 'city', 'state'].some((key) => textValue(data, key))) {
        throw new Error('Informe o CEP ou deixe o endereço em branco.');
      }
      const payload: SaveStudent = {
        ...(student ? { id: student.id } : {}),
        name: textValue(data, 'name'),
        contact: textValue(data, 'contact'),
        category: textValue(data, 'category'),
        instructorId: textValue(data, 'instructorId'),
        active: textValue(data, 'active') === 'true',
        notes: textValue(data, 'notes'),
        details: {
          email: textValue(data, 'email'),
          address: cep
            ? {
                cep,
                street: textValue(data, 'street'),
                district: textValue(data, 'district'),
                city: textValue(data, 'city'),
                state: textValue(data, 'state'),
              }
            : null,
        },
        theoryRequired: numericValue(data, 'theoryRequired'),
        practiceRequired: numericValue(data, 'practiceRequired'),
      };
      await ctx.save('student.save', payload);
    },
    'Salvar aluno',
    (form) => {
      const button = form.querySelector<HTMLButtonElement>('[data-cep]')!;
      const status = form.querySelector<HTMLElement>('[data-cep-status]')!;
      const get = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
      button.addEventListener('click', async () => {
        const cep = get('cep').value.trim();
        button.disabled = true;
        status.textContent = 'Consultando ViaCEP…';
        try {
          const result = await request('postal.lookup', { cep });
          if (get('cep').value.trim() !== cep) {
            status.textContent = 'O CEP mudou. Consulte o novo número.';
            return;
          }
          for (const [key, value] of Object.entries(result)) get(key).value = value;
          status.textContent = 'Endereço preenchido. Confira os dados antes de salvar.';
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : 'Consulta indisponível.';
        } finally {
          button.disabled = false;
        }
      });
      if (initialCep) button.click();
    },
  );
}
// A confirmação fica no próprio formulário, preservando todas as entradas.
export async function confirmInForm(form: HTMLFormElement, message: string): Promise<boolean> {
  const existing = form.querySelector<HTMLInputElement>('[name=confirm-deactivation]');
  if (existing) return existing.checked;
  const block = document.createElement('div');
  block.className = 'alert alert-warning mt-3';
  const id = `confirm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  block.innerHTML = `<div class="form-check"><input class="form-check-input" type="checkbox" id="${id}" name="confirm-deactivation"><label class="form-check-label" for="${id}">${escape(message)}</label></div>`;
  form.querySelector('.dialog-form-actions')!.before(block);
  return false;
}
export function showStudent(ctx: Context, id: string): void {
  const w = ctx.workspace,
    s = w.students.find((item) => item.id === id);
  if (!s) return;
  const lessons = w.lessons.filter((l) => l.studentId === id);
  const details = w.studentDetails.find((item) => item.id === id);
  const canDelete =
    isAdmin(ctx) && !lessons.length && !w.exams.some((item) => item.studentId === id);
  const counts = ['scheduled', 'completed', 'absent', 'cancelled']
    .map(
      (status, i) =>
        `<div><strong>${lessons.filter((l) => l.status === status).length}</strong><span>${['Agendadas', 'Realizadas', 'Faltas', 'Canceladas'][i]}</span></div>`,
    )
    .join('');
  const modal = dialog(
    'Ficha do aluno',
    `<div class="detail-badges">${badge(s.active ? 'Ativo' : 'Inativo', s.active ? 'success' : 'neutral')}</div><h3 class="detail-title">${escape(s.name)}</h3><dl class="detail-grid"><div><dt>Contato</dt><dd>${escape(s.contact)}</dd></div><div><dt>Categoria</dt><dd>${escape(s.category)}</dd></div><div><dt>Instrutor responsável</dt><dd>${escape(instructorName(w, s.instructorId))}</dd></div><div><dt>Observações</dt><dd class="preserve-lines">${escape(s.notes || 'Sem observações')}</dd></div></dl>${progressCards(w, id)}${!isAdmin(ctx) ? '<p class="form-text">O progresso acima considera todas as aulas realizadas pelo aluno. O histórico detalhado e os totais abaixo são restritos às suas aulas.</p>' : ''}<div class="mini-metrics">${counts}</div>${isAdmin(ctx) ? `<div class="row-actions mb-3">${action('Editar aluno', 'data-edit', true)}${canDelete ? action('Excluir cadastro', 'data-delete') : ''}</div>${details?.email ? `<p><strong>E-mail</strong> · ${escape(details.email)}</p>` : ''}${details?.address ? `<p><strong>Endereço</strong> · ${escape([details.address.street, details.address.district, details.address.city, details.address.state, details.address.cep].filter(Boolean).join(' · '))}</p>` : ''}${studentExams(ctx, s)}` : ''}${panel('Histórico de aulas', table(lessonHeaders, lessonRows(w, lessons), 'Histórico do aluno'))}`,
  );
  if (isAdmin(ctx)) {
    const controls = document.createElement('div');
    controls.className = 'row-actions mt-3';
    controls.innerHTML =
      (details ? action('Excluir e-mail e endereço', 'data-remove-details') : '') +
      w.goals
        .filter((goal) => goal.studentId === id)
        .map((goal) =>
          action(
            `Excluir meta ${goal.type === 'theory' ? 'teórica' : 'prática'}`,
            `data-remove-goal="${escape(goal.id)}"`,
          ),
        )
        .join('');
    modal.element.querySelector('.dialog-body')?.append(controls);
    controls
      .querySelector('[data-remove-details]')
      ?.addEventListener('click', () =>
        confirmRemoval(
          'Excluir contato complementar',
          'O e-mail e o endereço serão excluídos. O cadastro do aluno e suas aulas serão mantidos. Sem e-mail, não será possível enviar lembretes.',
          (justification) => ctx.save('student.details.remove', { id, justification }),
        ),
      );
    controls
      .querySelectorAll<HTMLElement>('[data-remove-goal]')
      .forEach((button) =>
        button.addEventListener('click', () =>
          confirmRemoval(
            'Excluir meta de aulas',
            'A meta deste tipo será removida, sem excluir as aulas realizadas. Edite o aluno para definir uma nova meta.',
            (justification) =>
              ctx.save('student.goal.remove', { id: button.dataset.removeGoal!, justification }),
          ),
        ),
      );
  }
  modal.element.querySelector('[data-edit]')?.addEventListener('click', () => {
    modal.close();
    editStudent(ctx, s);
  });
  modal.element
    .querySelector('[data-delete]')
    ?.addEventListener('click', () =>
      confirmAction(
        'Excluir aluno',
        'Confirma a exclusão deste cadastro sem histórico de aulas ou exames?',
        () => ctx.save('catalog.remove', { entity: 'student', id }),
      ),
    );
  bindStudentExams(modal.element, ctx, s, modal.close);
  bindLessons(modal.element, ctx.showLesson);
}
export function instructorsView(ctx: Context): View {
  const w = ctx.workspace,
    instructors = w.instructors.filter(
      (i) =>
        (instructorStatus === 'all' || i.active === (instructorStatus === 'active')) &&
        `${i.name} ${i.contact}`
          .toLocaleLowerCase('pt-BR')
          .includes(instructorSearch.toLocaleLowerCase('pt-BR')),
    );
  return {
    html: `<div class="page-heading"><div><p class="eyebrow">EQUIPE</p><h1>Instrutores</h1><p>Disponibilidade, acompanhamento e vínculo com acessos.</p></div>${action('＋ Cadastrar instrutor', 'data-new', true)}</div><section class="filter-panel"><form id="instructor-search" class="d-flex flex-wrap gap-3 align-items-end"><div class="flex-grow-1"><label class="form-label" for="search-instructor">Pesquisar nome ou contato</label><input class="form-control" id="search-instructor" name="query" value="${escape(instructorSearch)}"></div><div><label class="form-label" for="filter-instructor-status">Situação</label><select id="filter-instructor-status" name="status" class="form-select">${[
      ['active', 'Ativos'],
      ['inactive', 'Inativos'],
      ['all', 'Todos'],
    ]
      .map(
        ([value, label]) =>
          `<option value="${value}" ${value === instructorStatus ? 'selected' : ''}>${label}</option>`,
      )
      .join(
        '',
      )}</select></div><button class="btn btn-outline-secondary" type="submit">Pesquisar</button></form></section>${panel(
      `${instructors.length} instrutores`,
      table(
        ['Instrutor', 'Contato', 'Situação', 'Realizadas no mês', 'Relatórios pendentes', 'Ações'],
        instructors.map((i) =>
          td(
            `<strong>${escape(i.name)}</strong>`,
            escape(i.contact),
            badge(i.active ? 'Ativo' : 'Inativo', i.active ? 'success' : 'neutral'),
            String(
              w.lessons.filter(
                (l) =>
                  l.instructorId === i.id &&
                  l.status === 'completed' &&
                  l.start.startsWith(today().slice(0, 7)),
              ).length,
            ),
            String(w.lessons.filter((l) => l.instructorId === i.id && pending(w, l)).length),
            action('Ver ficha', `data-instructor="${escape(i.id)}"`),
          ),
        ),
        'Instrutores',
      ),
    )}`,
    bind(root) {
      root.querySelector('#instructor-search')!.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget as HTMLFormElement);
        instructorSearch = textValue(data, 'query');
        instructorStatus = textValue(data, 'status');
        ctx.navigate('instructors');
      });
      root.querySelector('[data-new]')!.addEventListener('click', () => editInstructor(ctx));
      root
        .querySelectorAll<HTMLElement>('[data-instructor]')
        .forEach((b) =>
          b.addEventListener('click', () => showInstructor(ctx, b.dataset.instructor!)),
        );
    },
  };
}
export function editInstructor(ctx: Context, instructor?: Instructor): void {
  const affected = ctx.workspace.lessons.filter(
    (l) => l.instructorId === instructor?.id && l.status === 'scheduled' && l.start >= today(),
  );
  const defaults =
    instructor?.availability ??
    [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: '08:00', end: '18:00' }));
  const interval = (day: number, start = '08:00', end = '18:00') =>
    `<div class="availability-interval"><input name="start-${day}" type="time" class="form-control" value="${escape(start)}" aria-label="Início · ${weekdays[day]}" required><span>até</span><input name="end-${day}" type="time" class="form-control" value="${escape(end)}" aria-label="Término · ${weekdays[day]}" required><button type="button" class="btn btn-outline-secondary btn-sm" data-remove-range aria-label="Remover intervalo de ${weekdays[day]}">×</button></div>`;
  const rows = [1, 2, 3, 4, 5, 6, 0]
    .map(
      (day) =>
        `<div class="availability-row"><strong>${weekdays[day]}</strong><div data-intervals="${day}">${defaults
          .filter((item) => item.weekday === day)
          .map((item) => interval(day, item.start, item.end))
          .join(
            '',
          )}</div><button type="button" class="btn btn-outline-secondary btn-sm" data-add-range="${day}" aria-label="Adicionar intervalo em ${weekdays[day]}">+ Horário</button></div>`,
    )
    .join('');
  formDialog(
    instructor ? 'Editar instrutor' : 'Cadastrar instrutor',
    [
      field({ name: 'name', label: 'Nome completo', value: instructor?.name, required: true }),
      field({
        name: 'contact',
        label: 'Telefone ou e-mail',
        value: instructor?.contact,
        required: true,
      }),
      instructor
        ? field({
            name: 'active',
            label: 'Situação',
            options: `<option value="true" ${instructor.active ? 'selected' : ''}>Ativo</option><option value="false" ${!instructor.active ? 'selected' : ''}>Inativo</option>`,
          })
        : '<input type="hidden" name="active" value="true">',
      `<details class="col-12 form-disclosure" ><summary>Disponibilidade semanal ${!instructor ? '<small data-hours-summary>Seg–sex, 08:00–18:00</small>' : ''}</summary>
      <div class="availability-list">${rows}</div></details>`,
      affected.length
        ? `<p class="col-12 form-text mb-0">${affected.length} aula(s) futura(s) vinculada(s). Confira a agenda se mudar a disponibilidade.</p>`
        : '',
    ].join(''),
    async (data, form) => {
      const availability: Availability[] = [];
      for (const container of form.querySelectorAll<HTMLElement>('[data-intervals]')) {
        const weekday = Number(container.dataset.intervals);
        const starts = data.getAll(`start-${weekday}`);
        const ends = data.getAll(`end-${weekday}`);
        availability.push(
          ...starts.map((start, i) => ({ weekday, start: String(start), end: String(ends[i]) })),
        );
      }
      const active = textValue(data, 'active') === 'true';
      if (
        instructor?.active &&
        !active &&
        !(await confirmInForm(
          form,
          'Confirmo a desativação. Revise as aulas futuras deste instrutor.',
        ))
      ) {
        throw new Error('Marque a confirmação antes de salvar.');
      }
      const payload: SaveInstructor = {
        ...(instructor ? { id: instructor.id } : {}),
        name: textValue(data, 'name'),
        contact: textValue(data, 'contact'),
        active,
        availability,
      };
      await ctx.save('instructor.save', payload);
    },
    'Salvar instrutor',
    (form) => {
      form.querySelector('.availability-list')!.addEventListener('change', () => {
        form.querySelector('[data-hours-summary]')?.remove();
      });
      form.querySelector('.availability-list')!.addEventListener('click', (event) => {
        if (!(event.target instanceof HTMLButtonElement)) return;
        const button = event.target;
        if (button.hasAttribute('data-remove-range')) {
          form.querySelector('[data-hours-summary]')?.remove();
          const row = button.closest('.availability-row');
          button.closest('.availability-interval')?.remove();
          row?.querySelector<HTMLButtonElement>('[data-add-range]')?.focus();
        }
        if (button.dataset.addRange !== undefined) {
          form.querySelector('[data-hours-summary]')?.remove();
          const day = Number(button.dataset.addRange);
          const container = form.querySelector<HTMLElement>(`[data-intervals="${day}"]`)!;
          container.insertAdjacentHTML('beforeend', interval(day));
          container.lastElementChild?.querySelector('input')?.focus();
        }
      });
    },
  );
}
export function showInstructor(ctx: Context, id: string): void {
  const w = ctx.workspace,
    i = w.instructors.find((item) => item.id === id);
  if (!i) return;
  const lessons = w.lessons.filter((l) => l.instructorId === id),
    future = lessons.filter((l) => l.status === 'scheduled' && l.start >= `${today()}T00:00`);
  const served = w.students.filter(
    (s) => s.instructorId === id || lessons.some((l) => l.studentId === s.id),
  );
  const user = w.users.find((u) => u.instructorId === id);
  const canDelete = !user && !lessons.length && !served.length;
  const modal = dialog(
    'Ficha do instrutor',
    `<div class="detail-badges">${badge(i.active ? 'Ativo' : 'Inativo', i.active ? 'success' : 'neutral')}</div><h3 class="detail-title">${escape(i.name)}</h3><dl class="detail-grid"><div><dt>Contato</dt><dd>${escape(i.contact)}</dd></div><div><dt>Acesso associado</dt><dd>${user ? `${escape(user.login)} · ${user.active ? 'Ativo' : 'Desativado'}` : 'Ainda não criado'}</dd></div><div><dt>Realizadas no mês</dt><dd>${lessons.filter((l) => l.status === 'completed' && l.start.startsWith(today().slice(0, 7))).length}</dd></div><div><dt>Relatórios pendentes</dt><dd>${lessons.filter((l) => pending(w, l)).length}</dd></div></dl>${!i.active && future.length ? `<p class="alert alert-warning">${future.length} aulas futuras precisam de reorganização porque o instrutor está inativo.</p>` : ''}<div class="row-actions mb-3">${action('Editar instrutor', 'data-edit', true)}${user || i.active ? action(user ? 'Gerenciar acesso' : 'Criar acesso', 'data-access') : ''}${canDelete ? action('Excluir cadastro', 'data-delete') : ''}</div>${panel(
      'Disponibilidade semanal',
      table(
        ['Dia', 'Início', 'Término'],
        i.availability.map((a) => td(escape(weekdays[a.weekday]), escape(a.start), escape(a.end))),
        'Horários disponíveis',
      ),
    )}${panel('Alunos atendidos', `<div class="tag-list">${served.map((s) => action(s.name, `data-student="${escape(s.id)}"`)).join('') || '<p>Nenhum aluno com vínculo.</p>'}</div>`)}${panel('Agenda e histórico', table(lessonHeaders, lessonRows(w, lessons), 'Aulas do instrutor'))}`,
  );
  modal.element.querySelector('[data-edit]')!.addEventListener('click', () => {
    modal.close();
    editInstructor(ctx, i);
  });
  modal.element.querySelector('[data-access]')?.addEventListener('click', () => {
    modal.close();
    editAccess(ctx, i, user);
  });
  modal.element
    .querySelector('[data-delete]')
    ?.addEventListener('click', () =>
      confirmAction('Excluir instrutor', 'Confirma a exclusão deste cadastro sem vínculos?', () =>
        ctx.save('catalog.remove', { entity: 'instructor', id }),
      ),
    );
  modal.element
    .querySelectorAll<HTMLElement>('[data-student]')
    .forEach((b) => b.addEventListener('click', () => showStudent(ctx, b.dataset.student!)));
  bindLessons(modal.element, ctx.showLesson);
}
