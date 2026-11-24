-- Execute uma unica vez, com o banco correto selecionado e o aplicativo fechado.
-- Faca backup antes de executar. As tabelas p2_ ainda nao devem existir.
-- Esta migracao renomeia as tabelas existentes e preserva seus registros.
RENAME TABLE
  app_lock TO p2_app_lock,
  instructors TO p2_instructors,
  users TO p2_users,
  students TO p2_students,
  student_goals TO p2_student_goals,
  vehicles TO p2_vehicles,
  lessons TO p2_lessons,
  lesson_reports TO p2_lesson_reports,
  mileage_movements TO p2_mileage_movements,
  maintenance_plans TO p2_maintenance_plans,
  maintenance_records TO p2_maintenance_records,
  audit_entries TO p2_audit_entries;
