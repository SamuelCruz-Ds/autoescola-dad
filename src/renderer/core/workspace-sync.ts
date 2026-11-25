import type { Workspace } from '../../shared/types';

export type SyncResult = 'updated' | 'unchanged' | 'deferred' | 'skipped';

interface WorkspaceSyncOptions {
  initialWorkspace: Workspace;
  read(): Promise<Workspace>;
  apply(workspace: Workspace): void;
  canApply(): boolean;
  isCurrent(): boolean;
  isVisible(): boolean;
  windowEvents: EventTarget;
  documentEvents: EventTarget;
}

/** Mantém a tela em dia sem substituir um formulário que ainda está sendo preenchido. */
export function createWorkspaceSync(options: WorkspaceSyncOptions) {
  let running = false;
  let revision = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let inFlight: Promise<SyncResult> | null = null;
  let pending: Workspace | null = null;
  let displayed = JSON.stringify(options.initialWorkspace);

  const isCurrent = (): boolean => running && options.isCurrent();

  function flush(): SyncResult {
    if (!isCurrent() || !options.isVisible()) return 'skipped';
    if (!pending) return 'unchanged';
    const serialized = JSON.stringify(pending);
    if (serialized === displayed) {
      pending = null;
      return 'unchanged';
    }
    if (!options.canApply()) return 'deferred';
    const workspace = pending;
    pending = null;
    options.apply(workspace);
    displayed = serialized;
    return 'updated';
  }

  function refresh(): Promise<SyncResult> {
    if (!isCurrent() || !options.isVisible()) return Promise.resolve('skipped');
    // Foco, timer, navegação e botão manual compartilham a mesma consulta em andamento.
    if (inFlight) return inFlight;
    const requestedRevision = revision;
    const task = (async (): Promise<SyncResult> => {
      const workspace = await options.read();
      if (!isCurrent() || requestedRevision !== revision) return 'skipped';
      pending = workspace;
      return flush();
    })();
    inFlight = task;
    const clear = (): void => {
      if (inFlight === task) inFlight = null;
    };
    void task.then(clear, clear);
    return task;
  }

  function backgroundRefresh(): void {
    // Uma falha transitória não interrompe o timer nem gera notificações repetidas.
    void refresh().catch(() => {});
  }

  function afterDialogClose(): void {
    // O diálogo remove seus elementos e restaura o foco antes de avaliarmos a edição.
    queueMicrotask(() => {
      if (!isCurrent()) return;
      const result = flush();
      if (result === 'unchanged') backgroundRefresh();
    });
  }

  function invalidate(): void {
    revision++;
    pending = null;
  }

  return {
    refresh,
    flush,
    invalidate,
    /** O salvamento confirmado tem precedência sobre qualquer leitura anterior. */
    accept(workspace: Workspace): void {
      invalidate();
      displayed = JSON.stringify(workspace);
    },
    start(): void {
      if (running) return;
      running = true;
      timer = setInterval(backgroundRefresh, 15_000);
      options.windowEvents.addEventListener('focus', backgroundRefresh);
      options.documentEvents.addEventListener('visibilitychange', backgroundRefresh);
      options.documentEvents.addEventListener('close', afterDialogClose, true);
    },
    stop(): void {
      running = false;
      invalidate();
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      options.windowEvents.removeEventListener('focus', backgroundRefresh);
      options.documentEvents.removeEventListener('visibilitychange', backgroundRefresh);
      options.documentEvents.removeEventListener('close', afterDialogClose, true);
    },
  };
}
