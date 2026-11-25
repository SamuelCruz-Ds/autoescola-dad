import type { Instructor, SafeUser } from '../../shared/types';
import type { Context, View } from '../core/context';
import { isAdmin } from '../core/context';
import {
  action,
  auditDetails,
  badge,
  confirmRemoval,
  escape,
  field,
  formDialog,
  options,
  panel,
  table,
  td,
  textValue,
} from '../core/ui';
import { confirmInForm } from './people';

export function editAccess(ctx: Context, instructor: Instructor, user?: SafeUser): void {
  formDialog(
    user ? `Acesso de ${instructor.name}` : `Criar acesso de ${instructor.name}`,
    [
      field({
        name: 'login',
        label: 'Identificação de usuário',
        required: true,
        value: user?.login,
      }),
      field({
        name: 'password',
        label: user ? 'Nova senha (opcional)' : 'Senha inicial',
        type: 'password',
        required: !user,
        help: user
          ? 'Deixe vazio para manter a senha. Para redefinir, use pelo menos 12 caracteres, com maiúscula, minúscula, número e símbolo.'
          : 'Use pelo menos 12 caracteres, com maiúscula, minúscula, número e símbolo.',
      }),
      field({
        name: 'active',
        label: 'Situação do acesso',
        options: `<option value="true" ${user?.active !== false ? 'selected' : ''}>Ativo</option><option value="false" ${user?.active === false ? 'selected' : ''}>Desativado</option>`,
      }),
    ].join(''),
    async (data, form) => {
      const password = String(data.get('password') || '');
      const deactivating = user?.active && textValue(data, 'active') === 'false';
      if (user && (deactivating || password)) {
        const confirmation =
          deactivating && password
            ? 'Confirmo a desativação do acesso e a redefinição da senha. O instrutor não poderá entrar enquanto a conta estiver desativada.'
            : deactivating
              ? 'Confirmo a desativação deste acesso. O instrutor não poderá entrar no sistema.'
              : 'Confirmo a redefinição de senha. A senha anterior deixará de funcionar.';
        const current = form.querySelector<HTMLInputElement>('[name=confirm-deactivation]');
        if (current && current.dataset.confirmation !== confirmation)
          current.closest('.alert')?.remove();
        if (!(await confirmInForm(form, confirmation))) {
          const checkbox = form.querySelector<HTMLInputElement>('[name=confirm-deactivation]');
          if (checkbox) checkbox.dataset.confirmation = confirmation;
          throw new Error('Confira e marque a confirmação da alteração antes de salvar.');
        }
      }
      await ctx.save('access.save', {
        ...(user ? { id: user.id } : {}),
        instructorId: instructor.id,
        login: textValue(data, 'login'),
        ...(password ? { password } : {}),
        active: textValue(data, 'active') === 'true',
      });
    },
  );
}

export function accessView(ctx: Context): View {
  if (!isAdmin(ctx)) return { html: '<p>Acesso permitido somente ao dono.</p>', bind() {} };
  const w = ctx.workspace;
  return {
    html:
      `<div class="page-heading"><div><p class="eyebrow">CADASTROS</p><h1>Acessos</h1><p>Contas de dono e instrutor. Acessos com autoria devem ser desativados para preservar o histórico.</p></div>${action('＋ Criar acesso', 'data-new-access', true)}</div>` +
      panel(
        'Contas de acesso',
        table(
          ['Nome', 'Usuário', 'Perfil', 'Situação', 'Ações'],
          w.users.map((user) =>
            td(
              escape(user.name),
              escape(user.login),
              user.role === 'admin' ? 'Dono' : 'Instrutor',
              badge(user.active ? 'Ativo' : 'Desativado', user.active ? 'success' : 'neutral'),
              action('Editar', `data-edit-access="${escape(user.id)}"`) +
                (user.id !== w.user.id
                  ? action('Excluir', `data-remove-access="${escape(user.id)}"`)
                  : ''),
            ),
          ),
          'Contas de acesso',
        ),
      ) +
      panel(
        'Histórico dos acessos',
        auditDetails(
          w.audit.filter((entry) => entry.entity === 'access'),
          (id) => w.users.find((user) => user.id === id)?.name ?? 'Usuário indisponível',
        ),
      ),
    bind(root) {
      root.querySelector('[data-new-access]')?.addEventListener('click', () => manageAccess(ctx));
      root.querySelectorAll<HTMLElement>('[data-edit-access]').forEach((button) =>
        button.addEventListener('click', () =>
          manageAccess(
            ctx,
            w.users.find((user) => user.id === button.dataset.editAccess),
          ),
        ),
      );
      root
        .querySelectorAll<HTMLElement>('[data-remove-access]')
        .forEach((button) =>
          button.addEventListener('click', () =>
            confirmRemoval(
              'Excluir acesso',
              'O acesso será removido se não possuir autoria de registros. Contas com histórico devem ser desativadas.',
              (justification) =>
                ctx.save('access.remove', { id: button.dataset.removeAccess!, justification }),
            ),
          ),
        );
    },
  };
}

function manageAccess(ctx: Context, user?: SafeUser): void {
  formDialog(
    user ? 'Editar acesso' : 'Criar acesso',
    [
      field({
        name: 'role',
        label: 'Perfil',
        options: `<option value="admin" ${!user || user.role === 'admin' ? 'selected' : ''}>Dono</option><option value="instructor" ${user?.role === 'instructor' ? 'selected' : ''}>Instrutor</option>`,
      }),
      field({ name: 'name', label: 'Nome do dono', value: user?.name, required: true }),
      field({
        name: 'instructorId',
        label: 'Instrutor',
        options: options(ctx.workspace.instructors, user?.instructorId ?? ''),
        required: true,
      }),
      field({
        name: 'login',
        label: 'Usuário',
        value: user?.login,
        required: true,
        help: 'De 3 a 80 letras, números, pontos, sublinhados ou hífens.',
      }),
      field({
        name: 'password',
        label: user ? 'Nova senha (opcional)' : 'Senha inicial',
        type: 'password',
        required: !user,
        help: 'Pelo menos 12 caracteres, com maiúscula, minúscula, número e símbolo. Deixe vazio para manter a senha existente.',
      }),
      field({
        name: 'active',
        label: 'Situação',
        options: `<option value="true" ${user?.active !== false ? 'selected' : ''}>Ativo</option><option value="false" ${user?.active === false ? 'selected' : ''}>Desativado</option>`,
      }),
    ].join(''),
    async (data, form) => {
      const role = user?.role ?? (textValue(data, 'role') === 'admin' ? 'admin' : 'instructor');
      const password = String(data.get('password') ?? '');
      if (
        user &&
        (password || (user.active && textValue(data, 'active') === 'false')) &&
        !(await confirmInForm(form, 'Confirmo a alteração da senha ou a desativação desta conta.'))
      ) {
        throw new Error('Marque a confirmação para continuar.');
      }
      await ctx.save('access.save', {
        ...(user ? { id: user.id } : {}),
        role,
        name: role === 'admin' ? textValue(data, 'name') : undefined,
        instructorId:
          role === 'instructor' ? (user?.instructorId ?? textValue(data, 'instructorId')) : null,
        login: textValue(data, 'login'),
        ...(password ? { password } : {}),
        active: textValue(data, 'active') === 'true',
      });
    },
    'Salvar acesso',
    (form) => {
      const role = form.elements.namedItem('role') as HTMLSelectElement;
      const name = form.elements.namedItem('name') as HTMLInputElement;
      const instructor = form.elements.namedItem('instructorId') as HTMLSelectElement;
      role.disabled = Boolean(user);
      const update = () => {
        const isInstructor = role.value === 'instructor';
        name.disabled = isInstructor;
        name.closest('div')!.hidden = isInstructor;
        instructor.disabled = !isInstructor || Boolean(user);
        instructor.closest('div')!.hidden = !isInstructor;
      };
      role.addEventListener('change', update);
      update();
    },
  );
}
