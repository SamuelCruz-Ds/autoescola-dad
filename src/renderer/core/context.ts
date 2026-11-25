import type { ApiCommands, AutoescolaApi, CommandName, Workspace } from '../../shared/types';

declare global {
  interface Window {
    autoescola: AutoescolaApi;
  }
}
export type Mutation = {
  [K in CommandName]: K extends 'auth.login' | 'workspace.get'
    ? never
    : ApiCommands[K]['output'] extends Workspace
      ? K
      : never;
}[CommandName];
export type Route =
  | 'dashboard'
  | 'day'
  | 'agenda'
  | 'students'
  | 'instructors'
  | 'access'
  | 'vehicles'
  | 'pending'
  | 'reports'
  | 'audit'
  | 'summary';
export interface Context {
  workspace: Workspace;
  route: Route;
  navigate(route: Route): void;
  reload(): Promise<void>;
  save<K extends Mutation>(command: K, payload: ApiCommands[K]['input']): Promise<void>;
  showLesson(id: string): void;
  notify(message: string): void;
}
export interface View {
  html: string;
  bind(root: HTMLElement): void;
}
export const isAdmin = (ctx: Context): boolean => ctx.workspace.user.role === 'admin';

export async function request<K extends CommandName>(
  command: K,
  payload: ApiCommands[K]['input'],
): Promise<ApiCommands[K]['output']> {
  if (!window.autoescola)
    throw new Error(
      'A conexão com o aplicativo não está disponível. Abra o sistema pelo Electron.',
    );
  let result;
  try {
    result = await window.autoescola.request(command, payload);
  } catch {
    throw new Error('Não foi possível comunicar com o aplicativo. Tente novamente.');
  }
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
