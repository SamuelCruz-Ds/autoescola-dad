import {
  emptyState,
  type AppState,
  type Lesson,
  type LessonReport,
  type User,
} from '../../shared/types';

// Namespace exclusivo desta carga; não reutiliza os IDs da demonstração inicial.
const id = (value: number): string => `d4d20260-1119-4000-9000-${String(value).padStart(12, '0')}`;

export const REALISTIC_DEMO_MARKER_ID = id(1);
export const REALISTIC_DEMO_LOGINS = [
  {
    login: 'demo.marcos',
    name: 'Marcos Oliveira — FICTÍCIO',
    instructorId: id(101),
    userId: id(201),
  },
  {
    login: 'demo.patricia',
    name: 'Patrícia Souza — FICTÍCIA',
    instructorId: id(102),
    userId: id(202),
  },
  {
    login: 'demo.renato',
    name: 'Renato Almeida — FICTÍCIO',
    instructorId: id(103),
    userId: id(203),
  },
] as const;

const historicalOffsets = [-84, -77, -70, -63, -56, -49, -42, -35, -28, -21, -14, -7, -2, -1];
const studentNames = [
  'Camila Rodrigues',
  'Lucas Ferreira',
  'Beatriz Santos',
  'Gabriel Costa',
  'Juliana Martins',
  'Pedro Carvalho',
  'Larissa Ribeiro',
  'Thiago Fernandes',
  'Amanda Lima',
  'Rafael Barbosa',
  'Isabela Mendes',
  'Vinícius Rocha',
];

function localDateTime(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function createRealisticFixtures(
  admin: User,
  passwordHash: string,
  theoryGoal: number,
  practiceGoal: number,
  now: Date,
): AppState {
  const data = emptyState();
  const loadedAt = localDateTime(now);
  const at = (offset: number, time: string): string => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
    return `${localDateTime(date).slice(0, 10)}T${time}`;
  };
  let auditNumber = 10000;
  const audit = (
    entity: string,
    entityId: string,
    action: string,
    before: unknown,
    after: unknown,
    authorId: string,
    time: string,
    justification = '',
  ): void => {
    data.audit.push({
      id: id(auditNumber++),
      entity,
      entityId,
      action,
      before: JSON.stringify(before),
      after: JSON.stringify(after),
      justification,
      authorId,
      at: time,
    });
  };

  const vehicleExamples = [
    { model: 'Volkswagen Gol 1.0 — FICTÍCIO', plate: 'FIC1A01', category: 'B', initial: 47210 },
    { model: 'Fiat Mobi Like 1.0 — FICTÍCIO', plate: 'FIC1B02', category: 'B', initial: 28540 },
    { model: 'Honda CG 160 Start — FICTÍCIA', plate: 'FIC1C03', category: 'A', initial: 18720 },
  ];

  for (const [index, account] of REALISTIC_DEMO_LOGINS.entries()) {
    const category = vehicleExamples[index].category;
    data.instructors.push({
      id: account.instructorId,
      name: account.name,
      contact: 'Contato FICTÍCIO para demonstração, sem telefone pessoal.',
      active: true,
      // Agenda de demonstração editável; não representa jornada ou exigência legal.
      availability: Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        start: '07:00',
        end: '20:00',
      })),
    });
    data.users.push({
      id: account.userId,
      name: account.name,
      login: account.login,
      passwordHash,
      role: 'instructor',
      active: true,
      instructorId: account.instructorId,
    });
    for (let studentIndex = 0; studentIndex < 4; studentIndex++) {
      const position = index * 4 + studentIndex;
      const studentId = id(301 + position);
      data.students.push({
        id: studentId,
        name: `${studentNames[position]} — FICTÍCIO(A)`,
        contact: 'Contato FICTÍCIO, sem dados pessoais reais.',
        category,
        active: true,
        instructorId: account.instructorId,
        notes:
          'Aluno de demonstração. Metas e duração das aulas são exemplos editáveis, sem valor legal.',
      });
      data.goals.push(
        { id: id(401 + position * 2), studentId, type: 'theory', required: theoryGoal },
        { id: id(402 + position * 2), studentId, type: 'practice', required: practiceGoal },
      );
    }
    const vehicle = vehicleExamples[index];
    data.vehicles.push({
      id: id(501 + index),
      model: vehicle.model,
      plate: vehicle.plate,
      category,
      initialOdometer: vehicle.initial,
      currentOdometer: vehicle.initial,
      status: 'available',
    });
  }

  let lessonNumber = 601;
  let reportNumber = 701;
  let movementNumber = 801;

  for (const [instructorIndex, account] of REALISTIC_DEMO_LOGINS.entries()) {
    const vehicle = data.vehicles[instructorIndex];
    const students = data.students.filter(
      (student) => student.instructorId === account.instructorId,
    );
    let lastMaintenanceOdometer = vehicle.initialOdometer;
    const addLesson = (
      offset: number,
      start: string,
      end: string,
      studentIndex: number,
      type: Lesson['type'],
      status: Lesson['status'],
      pendingReport = false,
    ): void => {
      const cancelledAt = status === 'cancelled' ? at(offset, '07:15') : null;
      const lesson: Lesson = {
        id: id(lessonNumber++),
        studentId: students[studentIndex].id,
        instructorId: account.instructorId,
        vehicleId: type === 'practice' ? vehicle.id : null,
        type,
        category: vehicle.category,
        start: at(offset, start),
        end: at(offset, end),
        status,
        notes:
          type === 'practice'
            ? 'Demonstração FICTÍCIA: treino de condução e manobras; duração apenas ilustrativa.'
            : 'Demonstração FICTÍCIA: revisão de sinalização e circulação; formato individual ilustrativo.',
        cancelledAt,
        cancellationReason:
          status === 'cancelled'
            ? 'Exemplo FICTÍCIO: aluno solicitou remarcação por compromisso pessoal.'
            : null,
      };
      data.lessons.push(lesson);
      const scheduled = {
        ...lesson,
        status: 'scheduled',
        cancelledAt: null,
        cancellationReason: null,
      };
      const createdAt = offset < 0 ? at(offset, '07:00') : loadedAt;
      audit('lesson', lesson.id, 'created', null, scheduled, admin.id, createdAt);
      if (status === 'cancelled') {
        audit(
          'lesson',
          lesson.id,
          'cancelled',
          scheduled,
          lesson,
          admin.id,
          cancelledAt!,
          lesson.cancellationReason!,
        );
        return;
      }
      if (status === 'scheduled') return;

      const submittedAt = `${lesson.end.slice(0, 14)}10`;
      audit('lesson', lesson.id, 'outcome_recorded', scheduled, lesson, account.userId, lesson.end);
      if (pendingReport) return;
      const usesVehicle = status === 'completed' && type === 'practice';
      const odometerStart = usesVehicle ? vehicle.currentOdometer : null;
      const distance = vehicle.category === 'A' ? 7 + studentIndex * 2 : 14 + studentIndex * 3;
      const odometerEnd = usesVehicle ? vehicle.currentOdometer + distance : null;
      const report: LessonReport = {
        id: id(reportNumber++),
        lessonId: lesson.id,
        outcome: status,
        notes:
          status === 'absent'
            ? 'Registro FICTÍCIO: aluno ausente; veículo não utilizado e nenhuma distância registrada.'
            : type === 'practice'
              ? 'Relatório FICTÍCIO: praticou controle do veículo, atenção à sinalização e manobras; evolução acompanhada pelo instrutor.'
              : 'Relatório FICTÍCIO: participou da revisão de sinalização e discutiu situações de circulação.',
        vehicleId: usesVehicle ? vehicle.id : null,
        odometerStart,
        odometerEnd,
        authorId: account.userId,
        submittedAt,
        updatedAt: null,
      };
      data.reports.push(report);
      if (usesVehicle) {
        data.movements.push({
          id: id(movementNumber++),
          vehicleId: vehicle.id,
          lessonId: lesson.id,
          origin: 'lesson',
          at: lesson.end,
          odometerStart: odometerStart!,
          odometerEnd: odometerEnd!,
          justification:
            'Demonstração FICTÍCIA: leituras do hodômetro informadas no relatório da aula.',
          authorId: account.userId,
        });
        vehicle.currentOdometer = odometerEnd!;
      }
      audit('report', report.id, 'submitted', null, report, account.userId, submittedAt);
    };

    for (const [historyIndex, offset] of historicalOffsets.entries()) {
      const studentIndex = (historyIndex + Math.floor(historyIndex / 4)) % 4;
      const type =
        [11, 12].includes(historyIndex) || historyIndex % 3 === 0 ? 'theory' : 'practice';
      const status = [3, 8].includes(historyIndex)
        ? 'cancelled'
        : historyIndex === 5
          ? 'absent'
          : historyIndex === 12
            ? 'scheduled'
            : 'completed';
      const start = ['08:00', '10:00', '14:00'][instructorIndex];
      const end = ['09:00', '11:00', '15:00'][instructorIndex];
      addLesson(offset, start, end, studentIndex, type, status, historyIndex === 11);

      if ([6, 13].includes(historyIndex)) {
        const movement = {
          id: id(movementNumber++),
          vehicleId: vehicle.id,
          lessonId: null,
          origin: 'external' as const,
          at: at(offset, '17:00'),
          odometerStart: vehicle.currentOdometer,
          odometerEnd: vehicle.currentOdometer + 6,
          justification:
            'Deslocamento FICTÍCIO e justificado até oficina para inspeção do veículo.',
          authorId: admin.id,
        };
        data.movements.push(movement);
        vehicle.currentOdometer = movement.odometerEnd;
        audit('movement', movement.id, 'created', null, movement, admin.id, movement.at);
        if (historyIndex === 6) lastMaintenanceOdometer = vehicle.currentOdometer;
      }
    }

    // Hoje nunca comprova presença: mesmo os horários já vencidos continuam a confirmar.
    addLesson(0, '09:00', '10:00', 0, 'practice', 'scheduled');
    addLesson(0, '15:00', '16:00', 1, 'theory', 'scheduled');
    for (const [index, offset] of [1, 2, 4, 7].entries()) {
      addLesson(
        offset,
        ['08:00', '10:00', '14:00'][instructorIndex],
        ['09:00', '11:00', '15:00'][instructorIndex],
        index,
        index % 2 === 0 ? 'practice' : 'theory',
        'scheduled',
      );
    }

    const completedPlanId = id(951 + instructorIndex);
    data.maintenancePlans.push({
      id: completedPlanId,
      vehicleId: vehicle.id,
      service: 'Inspeção preventiva anterior — FICTÍCIA',
      targetOdometer: lastMaintenanceOdometer,
      warningKm: 100,
      active: false,
      notes: 'Serviço histórico de demonstração já realizado. Valores fictícios e editáveis.',
    });
    const maintenance = {
      id: id(971 + instructorIndex),
      vehicleId: vehicle.id,
      planId: completedPlanId,
      service: 'Inspeção preventiva anterior — FICTÍCIA',
      date: at(-42, '17:00').slice(0, 10),
      odometer: lastMaintenanceOdometer,
      notes: 'Registro FICTÍCIO de inspeção; não representa recomendação mecânica.',
      authorId: admin.id,
    };
    data.maintenanceRecords.push(maintenance);
    audit(
      'maintenance',
      maintenance.id,
      'completed',
      null,
      maintenance,
      admin.id,
      at(-42, '17:30'),
    );
    const plan = {
      id: id(901 + instructorIndex),
      vehicleId: vehicle.id,
      service: [
        'Revisão geral — FICTÍCIA',
        'Troca de óleo — FICTÍCIA',
        'Inspeção de freios — FICTÍCIA',
      ][instructorIndex],
      targetOdometer: vehicle.currentOdometer + [4000, 180, 0][instructorIndex],
      warningKm: [500, 300, 200][instructorIndex],
      active: true,
      notes:
        'Limite e margem FICTÍCIOS, editáveis pelo dono. Aviso não altera automaticamente a disponibilidade.',
    };
    data.maintenancePlans.push(plan);
    audit('maintenance_plan', plan.id, 'created', null, plan, admin.id, loadedAt);
  }

  data.audit.push({
    id: REALISTIC_DEMO_MARKER_ID,
    entity: 'demo_dataset',
    entityId: REALISTIC_DEMO_MARKER_ID,
    action: 'realistic_seeded_v1',
    before: 'null',
    after: JSON.stringify({
      version: 1,
      loadedAt,
      lessons: data.lessons.length,
      theoryGoal,
      practiceGoal,
    }),
    justification:
      'Carga adicional FICTÍCIA autorizada para demonstração escolar; sem dados pessoais reais.',
    authorId: admin.id,
    at: loadedAt,
  });
  return data;
}
