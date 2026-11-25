import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import { brandMark, roadArt } from './core/brand';
import { request } from './core/context';
import type { Workspace } from '../shared/types';

const app = document.querySelector<HTMLElement>('#app')!;

function start(workspace: Workspace): void {
  app.replaceChildren();
  const main = document.createElement('main');
  main.id = 'main-content';
  main.className = 'container py-5';
  const heading = document.createElement('h1');
  heading.textContent = 'Autoescola';
  const welcome = document.createElement('p');
  welcome.textContent = `Bem-vindo, ${workspace.user.name}.`;
  const profile = document.createElement('p');
  profile.textContent = workspace.user.role === 'admin' ? 'Dono / administrador' : 'Instrutor';
  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'btn btn-outline-secondary';
  logout.textContent = 'Sair';
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try {
      await request('auth.logout', undefined);
      renderLogin();
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : 'Não foi possível sair.';
      logout.disabled = false;
    }
  });
  main.append(heading, welcome, profile, logout, message);
  app.append(main);
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
