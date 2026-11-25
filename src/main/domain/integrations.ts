import type { CurrentWeather, Holiday, LessonWeather, PostalAddress } from '../../shared/types';
import { DomainError, requireCondition } from './validation';

type JsonObject = Record<string, unknown>;
const readObject = (data: unknown): JsonObject =>
  data && typeof data === 'object' && !Array.isArray(data) ? (data as JsonObject) : {};
const string = (value: unknown): string => (typeof value === 'string' ? value : '');
const hour = (stamp: string): string => stamp.slice(0, 13) + ':00';

export class Integrations {
  private readonly holidays = new Map<number, Holiday[]>();

  private weatherCache?: { expires: number; day: string; value: Promise<JsonObject> };

  constructor(
    private readonly fetchApi: typeof fetch = fetch,
    private readonly settings: NodeJS.ProcessEnv = process.env,
  ) {}

  private async json(url: string, provider: string, init?: RequestInit): Promise<unknown> {
    try {
      const response = await this.fetchApi(url, {
        ...init,
        redirect: 'error',
        signal: AbortSignal.timeout(12000),
      });
      if (response.ok) return await response.json();
    } catch {
      // Connection and parsing details stay outside the renderer.
    }
    throw new DomainError(
      'API_UNAVAILABLE',
      `${provider} indisponível neste momento. Confira a conexão e tente de novo.`,
    );
  }

  async address(cep: string): Promise<PostalAddress> {
    requireCondition(/^\d{8}$/.test(cep), 'Informe os 8 dígitos do CEP.');
    const result = readObject(await this.json(`https://viacep.com.br/ws/${cep}/json/`, 'ViaCEP'));
    requireCondition(
      !result.erro && string(result.localidade) && string(result.uf),
      'CEP não encontrado. Confira o número ou preencha o endereço manualmente.',
      'NOT_FOUND',
    );
    return {
      cep,
      street: string(result.logradouro),
      district: string(result.bairro),
      city: string(result.localidade),
      state: string(result.uf),
    };
  }

  async nationalHolidays(year: number): Promise<Holiday[]> {
    requireCondition(
      Number.isInteger(year) && year >= 1900 && year <= 2199,
      'Selecione um ano válido.',
    );
    const cached = this.holidays.get(year);
    if (cached) return cached;
    const result = await this.json(`https://brasilapi.com.br/api/feriados/v1/${year}`, 'BrasilAPI');
    requireCondition(
      Array.isArray(result),
      'Calendário de feriados indisponível.',
      'API_UNAVAILABLE',
    );
    const holidays = result.flatMap((value) => {
      const item = readObject(value);
      const date = string(item.date);
      const name = string(item.name);
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && name ? [{ date, name }] : [];
    });
    this.holidays.set(year, holidays);
    return holidays;
  }

  private weather(): Promise<JsonObject> {
    const now = Date.now();
    const day = new Date(now).toLocaleDateString('en-CA', {
      timeZone: this.settings.APP_TIMEZONE || 'America/Sao_Paulo',
    });
    if (this.weatherCache && now < this.weatherCache.expires && this.weatherCache.day === day)
      return this.weatherCache.value;
    const entry = { expires: now + 10 * 60_000, day, value: this.loadWeather() };
    this.weatherCache = entry;
    entry.value.catch(() => {
      if (this.weatherCache === entry) this.weatherCache = undefined;
    });
    return entry.value;
  }

  private async loadWeather(): Promise<JsonObject> {
    const latitude = Number(this.settings.SCHOOL_LATITUDE || '-22.5645');
    const longitude = Number(this.settings.SCHOOL_LONGITUDE || '-47.4010');
    requireCondition(
      Number.isFinite(latitude) &&
        Math.abs(latitude) <= 90 &&
        Number.isFinite(longitude) &&
        Math.abs(longitude) <= 180,
      'Confira as coordenadas da autoescola.',
    );
    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,weather_code,is_day',
      hourly: 'precipitation_probability,precipitation,temperature_2m,weather_code,is_day',
      forecast_days: '7',
      timezone: this.settings.APP_TIMEZONE || 'America/Sao_Paulo',
    });
    const url = `https://api.open-meteo.com/v1/forecast?${query}`;
    try {
      return readObject(await this.json(url, 'Open-Meteo'));
    } catch {
      return readObject(await this.json(url, 'Open-Meteo'));
    }
  }

  async currentWeather(): Promise<CurrentWeather> {
    const current = readObject((await this.weather()).current);
    const { time, temperature_2m, weather_code, is_day } = current;
    requireCondition(
      typeof time === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time) &&
        typeof temperature_2m === 'number' &&
        Number.isFinite(temperature_2m) &&
        typeof weather_code === 'number' &&
        Number.isInteger(weather_code) &&
        (is_day === 0 || is_day === 1),
      'Condições atuais indisponíveis no Open-Meteo.',
      'API_UNAVAILABLE',
    );
    return {
      city: this.settings.SCHOOL_CITY || 'Limeira, SP',
      time,
      temperature: temperature_2m,
      code: weather_code,
      isDay: is_day === 1,
    };
  }

  async forecast(start: string, end: string): Promise<LessonWeather> {
    const hourly = readObject((await this.weather()).hourly);
    const times: unknown[] = Array.isArray(hourly.time) ? hourly.time : [];
    const chance: unknown[] = Array.isArray(hourly.precipitation_probability)
      ? hourly.precipitation_probability
      : [];
    const rain: unknown[] = Array.isArray(hourly.precipitation) ? hourly.precipitation : [];
    const validHours = times.flatMap((value, index) => {
      const probability = chance[index];
      const amount = rain[index];
      return typeof value === 'string' &&
        value >= hour(start) &&
        value < end &&
        typeof probability === 'number' &&
        typeof amount === 'number'
        ? [{ probability, amount, index }]
        : [];
    });
    requireCondition(
      validHours.length,
      'Previsão disponível somente para os próximos 7 dias.',
      'FORECAST_RANGE',
    );
    const first = validHours[0].index;
    const atStart = (key: string): unknown =>
      Array.isArray(hourly[key]) ? hourly[key][first] : undefined;
    const temperature = atStart('temperature_2m'),
      code = atStart('weather_code'),
      day = atStart('is_day');
    return {
      ...(typeof temperature === 'number' ? { temperature } : {}),
      ...(typeof code === 'number' ? { code } : {}),
      ...(day === 0 || day === 1 ? { isDay: day === 1 } : {}),
      city: this.settings.SCHOOL_CITY || 'Limeira, SP',
      chance: Math.max(...validHours.map((value) => value.probability)),
      rain: Math.max(...validHours.map((value) => value.amount)),
    };
  }

  async sendReminder(
    email: string,
    key: string,
    date: string,
    type: string,
  ): Promise<{ id: string }> {
    const from = this.settings.REMINDER_FROM;
    const token = this.settings.RESEND_API_KEY;
    requireCondition(
      from && token,
      'Configure RESEND_API_KEY e REMINDER_FROM para enviar lembretes.',
      'API_CONFIG',
    );
    const result = readObject(
      await this.json('https://api.resend.com/emails', 'Resend', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: 'Lembrete da sua aula na autoescola',
          text: `Lembrete: sua aula ${type} está marcada para ${date}. Se precisar remarcar, fale com a autoescola.`,
        }),
      }),
    );
    const id = string(result.id);
    requireCondition(id, 'O serviço de e-mail não confirmou a solicitação.', 'API_UNAVAILABLE');
    return { id };
  }
}
