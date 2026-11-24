import type { Database, Lesson } from '../../shared/types';

const id = (number: number): string =>
  `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const day = (offset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export async function insertDemoData(
  db: Database,
  passwordHash: string,
  theoryGoal: number,
  practiceGoal: number,
): Promise<boolean> {
  return db.transaction((state) => {
    // Uma única transação torna a demonstração repetível sem sobrescrever edições.
    if (state.instructors.some((instructor) => instructor.id === id(1))) return false;
    if (state.users.some((user) => ['demo.ana', 'demo.bruno'].includes(user.login)))
      throw new Error('Os logins de demonstração já estão em uso; nenhum dado foi alterado.');
    const admin = state.users.find((user) => user.role === 'admin' && user.active);
    if (!admin) throw new Error('Crie o administrador com npm run db:setup antes da demonstração.');
    const availability = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      start: '07:00',
      end: '20:00',
    }));
    state.instructors.push(
      {
        id: id(1),
        name: 'Ana Exemplo — fictícia',
        contact: 'Contato fictício para demonstração',
        active: true,
        availability,
      },
      {
        id: id(2),
        name: 'Bruno Exemplo — fictício',
        contact: 'Contato fictício para demonstração',
        active: true,
        availability: structuredClone(availability),
      },
    );
    state.users.push(
      {
        id: id(11),
        name: 'Ana Exemplo — fictícia',
        login: 'demo.ana',
        passwordHash,
        role: 'instructor',
        active: true,
        instructorId: id(1),
      },
      {
        id: id(12),
        name: 'Bruno Exemplo — fictício',
        login: 'demo.bruno',
        passwordHash,
        role: 'instructor',
        active: true,
        instructorId: id(2),
      },
    );
    state.students.push(
      {
        id: id(21),
        name: 'Carla Exemplo — fictícia',
        contact: 'Contato fictício',
        category: 'B',
        active: true,
        instructorId: id(1),
        notes: 'Demonstração fictícia. As metas são exemplos editáveis, sem valor legal.',
      },
      {
        id: id(22),
        name: 'Diego Exemplo — fictício',
        contact: 'Contato fictício',
        category: 'B',
        active: true,
        instructorId: id(2),
        notes: 'Demonstração fictícia.',
      },
      {
        id: id(23),
        name: 'Elisa Exemplo — fictícia',
        contact: 'Contato fictício',
        category: 'B',
        active: true,
        instructorId: id(1),
        notes: 'Demonstração fictícia.',
      },
    );
    for (const [index, studentId] of [id(21), id(22), id(23)].entries()) {
      state.goals.push(
        { id: id(30 + index * 2), studentId, type: 'theory', required: theoryGoal },
        { id: id(31 + index * 2), studentId, type: 'practice', required: practiceGoal },
      );
    }
    state.vehicles.push(
      {
        id: id(41),
        model: 'Veículo de demonstração A — fictício',
        plate: 'DEMO001',
        category: 'B',
        initialOdometer: 42150,
        currentOdometer: 42182,
        status: 'available',
      },
      {
        id: id(42),
        model: 'Veículo de demonstração B — fictício',
        plate: 'DEMO002',
        category: 'B',
        initialOdometer: 30000,
        currentOdometer: 30000,
        status: 'maintenance',
      },
    );
    const lesson = (
      number: number,
      studentId: string,
      instructorId: string,
      offset: number,
      start: string,
      end: string,
      type: 'practice' | 'theory',
      status: Lesson['status'],
      vehicleId: string | null,
    ): Lesson => ({
      id: id(number),
      studentId,
      instructorId,
      vehicleId,
      type,
      category: 'B',
      start: `${day(offset)}T${start}`,
      end: `${day(offset)}T${end}`,
      status,
      notes: 'Aula fictícia de demonstração.',
      cancelledAt: status === 'cancelled' ? `${day(-1)}T16:00` : null,
      cancellationReason:
        status === 'cancelled' ? 'Cancelamento fictício solicitado pelo aluno.' : null,
    });
    state.lessons.push(
      lesson(51, id(21), id(1), -1, '09:00', '10:00', 'practice', 'completed', id(41)),
      lesson(52, id(22), id(2), -1, '11:00', '12:00', 'theory', 'completed', null),
      lesson(53, id(23), id(1), -1, '14:00', '15:00', 'theory', 'absent', null),
      lesson(54, id(21), id(1), 0, '10:00', '11:00', 'practice', 'scheduled', id(41)),
      lesson(55, id(22), id(2), 0, '14:00', '15:00', 'theory', 'scheduled', null),
      lesson(56, id(23), id(1), 1, '09:00', '10:00', 'practice', 'scheduled', id(41)),
      lesson(57, id(22), id(2), 1, '11:00', '12:00', 'practice', 'scheduled', id(42)),
      lesson(58, id(21), id(1), 1, '15:00', '16:00', 'theory', 'cancelled', null),
    );
    state.reports.push(
      {
        id: id(61),
        lessonId: id(51),
        outcome: 'completed',
        notes: 'Demonstração fictícia: treino de direção com acompanhamento.',
        vehicleId: id(41),
        odometerStart: 42150,
        odometerEnd: 42172,
        authorId: id(11),
        submittedAt: `${day(-1)}T10:05`,
        updatedAt: null,
      },
      {
        id: id(62),
        lessonId: id(53),
        outcome: 'absent',
        notes: 'Demonstração fictícia: aluno ausente, sem utilização do veículo.',
        vehicleId: null,
        odometerStart: null,
        odometerEnd: null,
        authorId: id(11),
        submittedAt: `${day(-1)}T15:05`,
        updatedAt: null,
      },
    );
    state.movements.push(
      {
        id: id(71),
        vehicleId: id(41),
        lessonId: id(51),
        origin: 'lesson',
        at: `${day(-1)}T10:00`,
        odometerStart: 42150,
        odometerEnd: 42172,
        justification: 'Aula fictícia de demonstração.',
        authorId: id(11),
      },
      {
        id: id(72),
        vehicleId: id(41),
        lessonId: null,
        origin: 'external',
        at: `${day(-1)}T16:00`,
        odometerStart: 42172,
        odometerEnd: 42182,
        justification: 'Deslocamento fictício até oficina para demonstração.',
        authorId: admin.id,
      },
    );
    state.maintenancePlans.push(
      {
        id: id(81),
        vehicleId: id(41),
        service: 'Serviço de demonstração A',
        targetOdometer: 42200,
        warningKm: 50,
        notes: 'Limite fictício e editável, sem recomendação mecânica.',
        active: true,
      },
      {
        id: id(82),
        vehicleId: id(42),
        service: 'Serviço de demonstração B',
        targetOdometer: 30000,
        warningKm: 50,
        notes: 'Limite fictício. Veículo em manutenção com aula futura a reorganizar.',
        active: true,
      },
      {
        id: id(83),
        vehicleId: id(41),
        service: 'Revisão fictícia anterior',
        targetOdometer: 42172,
        warningKm: 20,
        notes: 'Plano fictício já concluído.',
        active: false,
      },
    );
    state.maintenanceRecords.push({
      id: id(91),
      vehicleId: id(41),
      planId: id(83),
      service: 'Revisão fictícia anterior',
      date: day(-1),
      odometer: 42182,
      notes: 'Registro histórico fictício de demonstração.',
      authorId: admin.id,
    });
    state.audit.push({
      id: id(101),
      entity: 'lesson',
      entityId: id(58),
      action: 'cancel',
      before: JSON.stringify({ status: 'scheduled' }),
      after: JSON.stringify({ status: 'cancelled' }),
      justification: 'Cancelamento fictício solicitado pelo aluno.',
      authorId: admin.id,
      at: `${day(-1)}T16:00`,
    });
    return true;
  });
}
