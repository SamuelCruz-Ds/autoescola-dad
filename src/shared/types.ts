export type Id = string;
export type Role = 'admin' | 'instructor';
export type LessonType = 'theory' | 'practice';
export type LessonStatus = 'scheduled' | 'completed' | 'absent' | 'cancelled';
export type VehicleStatus = 'available' | 'maintenance' | 'inactive';
export interface User {
  id: Id;
  name: string;
  login: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  instructorId: Id | null;
}
export type SafeUser = Omit<User, 'passwordHash'>;
export interface Availability {
  weekday: number;
  start: string;
  end: string;
}
export interface Instructor {
  id: Id;
  name: string;
  contact: string;
  active: boolean;
  availability: Availability[];
}
export interface Student {
  id: Id;
  name: string;
  contact: string;
  category: string;
  active: boolean;
  instructorId: Id;
  notes: string;
}
export interface PostalAddress {
  cep: string;
  street: string;
  district: string;
  city: string;
  state: string;
}
export interface StudentDetails {
  id: Id;
  email: string;
  address: PostalAddress | null;
}
export type ExamResult = 'scheduled' | 'passed' | 'failed' | 'absent' | 'cancelled';
export interface Exam {
  id: Id;
  studentId: Id;
  type: LessonType;
  startsAt: string;
  result: ExamResult;
  notes: string;
}
export interface Holiday {
  date: string;
  name: string;
}
export interface CurrentWeather {
  city: string;
  time: string;
  temperature: number;
  code: number;
  isDay: boolean;
}
export interface LessonWeather {
  temperature?: number;
  code?: number;
  isDay?: boolean;
  city: string;
  chance: number;
  rain: number;
}
export interface Goal {
  id: Id;
  studentId: Id;
  type: LessonType;
  required: number;
}
export interface Vehicle {
  id: Id;
  model: string;
  plate: string;
  category: string;
  initialOdometer: number;
  currentOdometer: number;
  status: VehicleStatus;
}
export interface Lesson {
  id: Id;
  studentId: Id;
  instructorId: Id;
  vehicleId: Id | null;
  type: LessonType;
  category: string;
  start: string;
  end: string;
  status: LessonStatus;
  notes: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
}
export interface LessonReport {
  id: Id;
  lessonId: Id;
  outcome: 'completed' | 'absent';
  notes: string;
  vehicleId: Id | null;
  odometerStart: number | null;
  odometerEnd: number | null;
  authorId: Id;
  submittedAt: string;
  updatedAt: string | null;
}
export interface Movement {
  id: Id;
  vehicleId: Id;
  lessonId: Id | null;
  origin: 'lesson' | 'external' | 'adjustment';
  at: string;
  odometerStart: number;
  odometerEnd: number;
  justification: string;
  authorId: Id;
}
export interface MaintenancePlan {
  id: Id;
  vehicleId: Id;
  service: string;
  targetOdometer: number;
  warningKm: number;
  notes: string;
  active: boolean;
}
export interface MaintenanceRecord {
  id: Id;
  vehicleId: Id;
  planId: Id;
  service: string;
  date: string;
  odometer: number;
  notes: string;
  authorId: Id;
}
export interface AuditEntry {
  id: Id;
  entity: string;
  entityId: Id;
  action: string;
  before: string;
  after: string;
  justification: string;
  authorId: Id;
  at: string;
}
export interface AppState {
  users: User[];
  instructors: Instructor[];
  students: Student[];
  studentDetails: StudentDetails[];
  exams: Exam[];
  goals: Goal[];
  vehicles: Vehicle[];
  lessons: Lesson[];
  reports: LessonReport[];
  movements: Movement[];
  maintenancePlans: MaintenancePlan[];
  maintenanceRecords: MaintenanceRecord[];
  audit: AuditEntry[];
}
export interface StudentProgress {
  studentId: Id;
  type: LessonType;
  required: number;
  completed: number;
  remaining: number;
}
export type ReportVehicle = Pick<Vehicle, 'id' | 'model' | 'plate' | 'category'>;
export interface Workspace extends Omit<AppState, 'users'> {
  remindersConfigured?: boolean;
  user: SafeUser;
  users: SafeUser[];
  studentProgress: StudentProgress[];
  reportVehicles: ReportVehicle[];
}
export type SaveInstructor = Omit<Instructor, 'id'> & { id?: Id };
export type SaveStudent = Omit<Student, 'id'> & {
  id?: Id;
  details?: Omit<StudentDetails, 'id'>;
  theoryRequired: number;
  practiceRequired: number;
};
export type SaveVehicle = Omit<Vehicle, 'id' | 'currentOdometer'> & { id?: Id };
export type SaveLesson = Pick<
  Lesson,
  'studentId' | 'instructorId' | 'vehicleId' | 'type' | 'category' | 'start' | 'end' | 'notes'
> & { id?: Id; justification?: string };
export interface SaveReport {
  lessonId: Id;
  outcome: 'completed' | 'absent';
  notes: string;
  vehicleId: Id | null;
  odometerStart: number | null;
  odometerEnd: number | null;
  justification?: string;
}
export type SavePlan = Omit<MaintenancePlan, 'id' | 'active'> & { id?: Id; active?: boolean };
export type SaveMovement = Pick<
  Movement,
  'vehicleId' | 'at' | 'odometerStart' | 'odometerEnd' | 'justification'
> & { id?: Id; origin?: 'external' | 'adjustment' };
export interface CompleteMaintenance {
  planId: Id;
  date: string;
  odometer: number;
  notes: string;
  nextTarget: number | null;
  nextWarningKm: number | null;
}
export interface SaveAccess {
  id?: Id;
  instructorId: Id | null;
  role?: Role;
  name?: string;
  login: string;
  password?: string;
  active: boolean;
}
export interface Removal {
  id: Id;
  justification: string;
}
export type SaveMaintenanceRecord = Pick<
  MaintenanceRecord,
  'id' | 'service' | 'date' | 'odometer' | 'notes'
> & {
  justification: string;
};
export interface ApiCommands {
  'postal.lookup': { input: { cep: string }; output: PostalAddress };
  'holidays.list': { input: { year: number }; output: Holiday[] };
  'weather.current': { input: undefined; output: CurrentWeather };
  'weather.preview': { input: { start: string; end: string }; output: LessonWeather };
  'weather.lesson': { input: { id: Id }; output: LessonWeather };
  'reminder.send': { input: { id: Id }; output: { id: string } };
  'exam.save': { input: Omit<Exam, 'id'> & { id?: Id }; output: Workspace };
  'exam.remove': { input: { id: Id }; output: Workspace };
  'catalog.remove': {
    input: { entity: 'student' | 'instructor' | 'vehicle'; id: Id };
    output: Workspace;
  };
  'movement.remove': { input: { id: Id; justification: string }; output: Workspace };
  'auth.login': { input: { login: string; password: string }; output: Workspace };
  'auth.logout': { input: undefined; output: null };
  'workspace.get': { input: undefined; output: Workspace };
  'instructor.save': { input: SaveInstructor; output: Workspace };
  'student.save': { input: SaveStudent; output: Workspace };
  'student.details.remove': { input: Removal; output: Workspace };
  'student.goal.remove': { input: Removal; output: Workspace };
  'vehicle.save': { input: SaveVehicle; output: Workspace };
  'lesson.save': { input: SaveLesson; output: Workspace };
  'lesson.cancel': { input: { id: Id; reason: string }; output: Workspace };
  'lesson.remove': { input: Removal; output: Workspace };
  'lesson.outcome': { input: { id: Id; outcome: 'completed' | 'absent' }; output: Workspace };
  'report.save': { input: SaveReport; output: Workspace };
  'report.remove': { input: Removal; output: Workspace };
  'movement.save': { input: SaveMovement; output: Workspace };
  'maintenance.save': { input: SavePlan; output: Workspace };
  'maintenance.complete': { input: CompleteMaintenance; output: Workspace };
  'maintenance.remove': { input: Removal; output: Workspace };
  'maintenance.record.save': { input: SaveMaintenanceRecord; output: Workspace };
  'maintenance.record.remove': { input: Removal; output: Workspace };
  'access.save': { input: SaveAccess; output: Workspace };
  'access.remove': { input: Removal; output: Workspace };
}
export type CommandName = keyof ApiCommands;
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; code: string };
export interface AutoescolaApi {
  request<K extends CommandName>(
    command: K,
    payload: ApiCommands[K]['input'],
  ): Promise<ApiResult<ApiCommands[K]['output']>>;
}
export interface Database {
  read(): Promise<AppState>;
  transaction<T>(work: (state: AppState) => T | Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export const emptyState = (): AppState => ({
  users: [],
  instructors: [],
  students: [],
  studentDetails: [],
  exams: [],
  goals: [],
  vehicles: [],
  lessons: [],
  reports: [],
  movements: [],
  maintenancePlans: [],
  maintenanceRecords: [],
  audit: [],
});
