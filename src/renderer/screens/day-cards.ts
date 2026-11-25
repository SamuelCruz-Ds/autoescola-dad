import type { Context } from '../core/context';
import { request } from '../core/context';
import { action, confirmAction, date, escape, shiftDate, time, today } from '../core/ui';
import { studentName } from '../core/queries';
import { bindWeather, weatherCard } from '../core/weather';
import { editStudent } from './people';

export function planningStrip(ctx: Context): string {
  const first = today();
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDate(first, i);
    const rows = ctx.workspace.lessons.filter(
      (l) => l.start.startsWith(day) && l.status !== 'cancelled',
    );
    const practical = rows.filter((l) => l.type === 'practice').length;
    return { day, practical, theory: rows.length - practical, total: rows.length };
  });
  const maximum = Math.max(1, ...days.map((d) => d.total));
  const total = days.reduce((sum, d) => sum + d.total, 0);
  const rows = days
    .map((d, i) => {
      const label = i
        ? new Date(`${d.day}T12:00`)
            .toLocaleDateString('pt-BR', { weekday: 'short' })
            .replace('.', '')
        : 'Hoje';
      const description = `${date(d.day)} · ${d.practical} práticas e ${d.theory} teóricas`;
      return `<div class="week-day ${i === 0 ? 'first' : ''}" title="${escape(description)}"><span class="visually-hidden">${escape(description)}</span><div class="bar-space" aria-hidden="true"><em>${d.total}</em><i class="bar-theory" style="height:${(d.theory / maximum) * 37}px"></i><i class="bar-practice" style="height:${(d.practical / maximum) * 37}px"></i></div><small aria-hidden="true">${label}</small></div>`;
    })
    .join('');
  return `<div class="planning-strip"><section class="week-card"><header><div><h2>Aulas nos próximos 7 dias</h2><p>${date(first).slice(0, 5)} a ${date(days[6].day).slice(0, 5)}</p></div><span class="week-total">${total} ${total === 1 ? 'aula' : 'aulas'}</span></header><div class="week-bars">${rows}</div><div class="chart-key"><span>Práticas</span><span>Teóricas</span></div></section>${weatherCard()}</div>`;
}
export function bindPlanning(root: HTMLElement): void {
  bindWeather(root);
}

export function reminders(ctx: Context): string {
  const w = ctx.workspace,
    tomorrow = shiftDate(today(), 1);
  const lessons = w.lessons
    .filter((l) => l.start.startsWith(tomorrow) && l.status === 'scheduled')
    .sort((a, b) => a.start.localeCompare(b.start));
  const rows = lessons
    .map((l) => {
      const email = w.studentDetails.find((s) => s.id === l.studentId)?.email;
      const sent = w.audit.some(
        (a) =>
          a.entity === 'lessonReminder' && a.entityId === l.id && a.action === `sent/${l.start}`,
      );
      const control = sent
        ? '<span class="status status-success">Enviado</span>'
        : !email
          ? action('Adicionar e-mail', `data-reminder-student="${escape(l.studentId)}"`)
          : w.remindersConfigured
            ? action('Enviar lembrete', `data-send-for="${escape(l.id)}"`)
            : '<span class="status status-neutral">Aguardando configuração</span>';
      return `<li><time>${time(l.start)}</time><span><strong>${escape(studentName(w, l.studentId))}</strong><small>${escape(email || 'E-mail pendente')}</small></span>${control}</li>`;
    })
    .join('');
  return `<section class="panel reminder-panel"><div class="panel-heading"><div><h2>Lembretes de amanhã</h2><small>${date(tomorrow)} · ${lessons.length} ${lessons.length === 1 ? 'aula marcada' : 'aulas marcadas'}</small></div><span class="provider">Resend</span></div>${!w.remindersConfigured ? '<p class="service-note"><strong>Envio de e-mail desativado.</strong> Para ativar, preencha RESEND_API_KEY e REMINDER_FROM no .env.</p>' : ''}${rows ? `<ul class="reminder-list">${rows}</ul>` : '<p class="service-empty">Nenhuma aula agendada para amanhã.</p>'}</section>`;
}
export function bindReminders(ctx: Context, root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-send-for]').forEach(
    (button) =>
      (button.onclick = () => {
        const id = button.dataset.sendFor!,
          l = ctx.workspace.lessons.find((l) => l.id === id)!;
        const email = ctx.workspace.studentDetails.find((s) => s.id === l.studentId)?.email;
        confirmAction(
          'Enviar lembrete',
          `Enviar a confirmação da aula de amanhã às ${time(l.start)} para ${email}?`,
          async () => {
            await request('reminder.send', { id });
            ctx.notify('Lembrete aceito pelo Resend.');
            await ctx.reload();
          },
        );
      }),
  );
  root.querySelectorAll<HTMLElement>('[data-reminder-student]').forEach(
    (button) =>
      (button.onclick = () => {
        const student = ctx.workspace.students.find((s) => s.id === button.dataset.reminderStudent);
        if (student) editStudent(ctx, student);
      }),
  );
}
