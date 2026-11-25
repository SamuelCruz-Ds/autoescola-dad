import { request } from './context';
import { action, date, escape, number, shiftDate, time, today } from './ui';
import type { CurrentWeather } from '../../shared/types';

const clouds =
  '<path d="M19 56a11 11 0 0 1-1-22 17 17 0 0 1 32-1 12 12 0 1 1 3 23z" fill="#f5faff" stroke="#7099c7" stroke-width="2.3"/>';
const sun =
  '<g stroke="#faaf24" stroke-width="3.5" stroke-linecap="round"><path d="M35 4v6m0 45v6M7 32h6m44 0h6M15 12l5 5m30 30 5 5m0-40-5 5M20 47l-5 5"/><circle cx="35" cy="32" r="15" fill="#ffd266"/></g>';
const moon = '<path d="M45 7a25 25 0 1 0 15 39A25 25 0 0 1 45 7z" fill="#ffe09b"/>';
const rain =
  '<path d="m23 60-3 6m16-6-3 6m16-6-3 6" stroke="#62b3ff" stroke-width="3.5" stroke-linecap="round"/>';
const fog =
  '<path d="M12 51h46m-40 8h36" stroke="#86abc9" stroke-width="3.5" stroke-linecap="round"/>';
export function conditions(code?: number, day = true): { label: string; icon: string } {
  let label = 'Condição indisponível',
    art =
      '<circle cx="35" cy="34" r="23" fill="none" stroke="#a3bedc" stroke-width="2.5" stroke-dasharray="4 5"/>';
  if (code === 0) {
    label = day ? 'Céu limpo' : 'Noite limpa';
    art = day ? sun : moon;
  } else if (code === 1 || code === 2) {
    label = code === 1 ? 'Poucas nuvens' : 'Parcialmente nublado';
    art = `<g transform="translate(11 -1) scale(.77)">${day ? sun : moon}</g>${clouds}`;
  } else if (code === 3) {
    label = 'Nublado';
    art = clouds;
  } else if (code === 45 || code === 48) {
    label = 'Neblina';
    art = `<g transform="translate(0 -9)">${clouds}</g>${fog}`;
  } else if (
    code !== undefined &&
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)
  ) {
    label = code < 60 ? 'Garoa' : [65, 67, 82].includes(code) ? 'Chuva forte' : 'Chuva';
    art = clouds + rain;
  } else if (code !== undefined && [71, 73, 75, 77, 85, 86].includes(code)) {
    label = 'Neve';
    art =
      clouds +
      '<g fill="#a3ceff"><circle cx="24" cy="63" r="2"/><circle cx="36" cy="61" r="2"/><circle cx="48" cy="64" r="2"/></g>';
  } else if (code !== undefined && [95, 96, 99].includes(code)) {
    label = 'Trovoadas';
    art = clouds + '<path d="m34 49-8 12h8l-3 10 15-17h-9l4-5z" fill="#ffc447"/>';
  }
  return {
    label,
    icon: `<svg viewBox="0 0 72 72" class="sky-icon" aria-hidden="true">${art}</svg>`,
  };
}
export const weatherCard = () =>
  `<section class="sky-card" aria-label="Clima atual"><header><h2>Clima agora</h2><span>Open-Meteo</span></header><div data-current-weather role="status"></div></section>`;
let last: { value: CurrentWeather; at: number } | undefined;
export function bindWeather(root: HTMLElement): void {
  const box = root.querySelector<HTMLElement>('[data-current-weather]');
  if (!box) return;
  const draw = (weather: CurrentWeather) => {
    const { icon, label } = conditions(weather.code, weather.isDay);
    box.innerHTML = `<div class="sky-main"><strong>${number(Math.round(weather.temperature))}°<small>C</small></strong>${icon}</div><b>${label}</b><p>${escape(weather.city)} · ${time(weather.time)}${weather.time.startsWith(today()) ? '' : ` · ${date(weather.time)}`}</p>`;
  };
  const update = async () => {
    if (last && Date.now() - last.at < 600_000 && last.value.time.slice(0, 10) === today()) {
      draw(last.value);
      return;
    }
    box.innerHTML = '<p class="sky-message">Consultando condições atuais…</p>';
    try {
      const value = await request('weather.current', undefined);
      last = { value, at: Date.now() };
      if (box.isConnected) draw(value);
    } catch {
      if (!box.isConnected) return;
      box.innerHTML = `<p class="sky-message">Clima indisponível no momento.</p>${action('Tentar novamente', 'data-retry')}`;
      box.querySelector('button')!.onclick = update;
    }
  };
  void update();
  const timer = window.setInterval(() => {
    if (!box.isConnected) window.clearInterval(timer);
    else void update();
  }, 600_000);
  // A troca de tela remove o cartão e encerra a atualização periódica.
  const observer = new MutationObserver(() => {
    if (!box.isConnected) {
      window.clearInterval(timer);
      observer.disconnect();
    }
  });
  observer.observe(root.parentElement?.parentElement?.parentElement ?? document.body, {
    childList: true,
    subtree: true,
  });
}

export const forecastPanel = `<div class="col-12"><section class="booking-sky"><header><h3>Previsão para a aula</h3><span>Open-Meteo</span></header><div role="status" data-booking-weather></div></section></div>`;
export function bindForecast(form: HTMLFormElement): void {
  const box = form.querySelector<HTMLElement>('[data-booking-weather]')!;
  const start = form.elements.namedItem('start') as HTMLInputElement;
  const end = form.elements.namedItem('end') as HTMLInputElement;
  let timer = 0,
    version = 0;
  const update = () => {
    const ticket = ++version,
      first = start.value,
      last = end.value,
      day = first.slice(0, 10);
    window.clearTimeout(timer);
    if (!first || !last || last <= first || day !== last.slice(0, 10)) {
      box.textContent = 'Escolha o início e o término da aula no mesmo dia.';
      return;
    }
    if (day < today() || day > shiftDate(today(), 6)) {
      box.textContent =
        'A previsão cobre hoje e os próximos 6 dias. Você pode agendar para essa data.';
      return;
    }
    box.textContent = 'Consultando o horário selecionado…';
    timer = window.setTimeout(async () => {
      if (!box.isConnected) return;
      try {
        const w = await request('weather.preview', { start: first, end: last });
        if (ticket !== version || !box.isConnected) return;
        const { label, icon } = conditions(w.code, w.isDay);
        box.innerHTML = `<div class="forecast-values">${icon}<div><b>${w.temperature !== undefined ? `${number(Math.round(w.temperature))} °C · ` : ''}${escape(label)}</b><small>${escape(w.city)} · ${date(first)} · ${time(first)}–${time(last)}</small></div><div><b>${number(w.chance)}% de chuva</b><small>Pico de ${number(w.rain)} mm/h no intervalo</small></div></div>${w.code === 65 || w.code === 82 || w.rain >= 5 || (w.code ?? 0) >= 95 ? '<p class="rain-advice">Chuva intensa prevista. Considere outro horário para a prática.</p>' : ''}`;
      } catch (error) {
        if (ticket !== version || !box.isConnected) return;
        box.innerHTML = `<span>${escape(error instanceof Error ? error.message : 'Previsão indisponível.')}</span> ${action('Tentar novamente', 'data-retry')}`;
        box.querySelector('button')!.onclick = update;
      }
    }, 240);
  };
  [start, end].forEach((input) => {
    input.addEventListener('input', update);
    input.addEventListener('change', update);
  });
  update();
}
