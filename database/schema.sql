-- MySQL 8.0.16+ / InnoDB. Todas as datas-horas representam o calendário local.
CREATE TABLE IF NOT EXISTS p2_app_lock (
  id TINYINT PRIMARY KEY,
  CONSTRAINT p2_chk_app_lock_singleton CHECK (id = 1)
) ENGINE=InnoDB;
INSERT IGNORE INTO p2_app_lock (id) VALUES (1);

CREATE TABLE IF NOT EXISTS p2_instructors (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact VARCHAR(200) NOT NULL,
  active BOOLEAN NOT NULL,
  availability JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  login VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(512) NOT NULL,
  role ENUM('admin', 'instructor') NOT NULL,
  active BOOLEAN NOT NULL,
  instructor_id CHAR(36) NULL UNIQUE,
  FOREIGN KEY (instructor_id) REFERENCES p2_instructors(id),
  CONSTRAINT p2_chk_user_profile CHECK ((role = 'admin' AND instructor_id IS NULL) OR (role = 'instructor' AND instructor_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_students (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact VARCHAR(200) NOT NULL,
  category VARCHAR(30) NOT NULL,
  active BOOLEAN NOT NULL,
  instructor_id CHAR(36) NOT NULL,
  notes TEXT NOT NULL,
  FOREIGN KEY (instructor_id) REFERENCES p2_instructors(id),
  INDEX idx_students_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_student_goals (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  lesson_type ENUM('theory', 'practice') NOT NULL,
  required INT NOT NULL,
  UNIQUE (student_id, lesson_type),
  FOREIGN KEY (student_id) REFERENCES p2_students(id),
  CONSTRAINT p2_chk_goal_nonnegative CHECK (required >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_vehicles (
  id CHAR(36) PRIMARY KEY,
  model VARCHAR(150) NOT NULL,
  plate VARCHAR(20) NOT NULL UNIQUE,
  category VARCHAR(30) NOT NULL,
  initial_odometer DECIMAL(12,2) NOT NULL,
  current_odometer DECIMAL(12,2) NOT NULL,
  status ENUM('available', 'maintenance', 'inactive') NOT NULL,
  CONSTRAINT p2_chk_vehicle_odometer CHECK (initial_odometer >= 0 AND current_odometer >= initial_odometer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_lessons (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  instructor_id CHAR(36) NOT NULL,
  vehicle_id CHAR(36) NULL,
  lesson_type ENUM('theory', 'practice') NOT NULL,
  category VARCHAR(30) NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  status ENUM('scheduled', 'completed', 'absent', 'cancelled') NOT NULL,
  notes TEXT NOT NULL,
  cancelled_at DATETIME NULL,
  cancellation_reason TEXT NULL,
  FOREIGN KEY (student_id) REFERENCES p2_students(id),
  FOREIGN KEY (instructor_id) REFERENCES p2_instructors(id),
  FOREIGN KEY (vehicle_id) REFERENCES p2_vehicles(id),
  INDEX idx_lessons_student_time (student_id, starts_at, ends_at),
  INDEX idx_lessons_instructor_time (instructor_id, starts_at, ends_at),
  INDEX idx_lessons_vehicle_time (vehicle_id, starts_at, ends_at),
  INDEX idx_lessons_time (starts_at),
  INDEX idx_lessons_cancelled (cancelled_at),
  CONSTRAINT p2_chk_lesson_interval CHECK (ends_at > starts_at),
  CONSTRAINT p2_chk_lesson_cancellation CHECK ((status = 'cancelled' AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL) OR (status <> 'cancelled' AND cancelled_at IS NULL AND cancellation_reason IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_lesson_reports (
  id CHAR(36) PRIMARY KEY,
  lesson_id CHAR(36) NOT NULL UNIQUE,
  outcome ENUM('completed', 'absent') NOT NULL,
  notes TEXT NOT NULL,
  vehicle_id CHAR(36) NULL,
  odometer_start DECIMAL(12,2) NULL,
  odometer_end DECIMAL(12,2) NULL,
  author_id CHAR(36) NOT NULL,
  submitted_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  FOREIGN KEY (lesson_id) REFERENCES p2_lessons(id),
  FOREIGN KEY (vehicle_id) REFERENCES p2_vehicles(id),
  FOREIGN KEY (author_id) REFERENCES p2_users(id),
  CONSTRAINT p2_chk_report_odometer CHECK ((vehicle_id IS NULL AND odometer_start IS NULL AND odometer_end IS NULL) OR (vehicle_id IS NOT NULL AND odometer_start IS NOT NULL AND odometer_end IS NOT NULL AND odometer_start >= 0 AND odometer_end >= odometer_start))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_mileage_movements (
  id CHAR(36) PRIMARY KEY,
  vehicle_id CHAR(36) NOT NULL,
  lesson_id CHAR(36) NULL UNIQUE,
  origin ENUM('lesson', 'external', 'adjustment') NOT NULL,
  occurred_at DATETIME NOT NULL,
  odometer_start DECIMAL(12,2) NOT NULL,
  odometer_end DECIMAL(12,2) NOT NULL,
  justification TEXT NOT NULL,
  author_id CHAR(36) NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES p2_vehicles(id),
  FOREIGN KEY (lesson_id) REFERENCES p2_lessons(id),
  FOREIGN KEY (author_id) REFERENCES p2_users(id),
  INDEX idx_movements_vehicle_time (vehicle_id, occurred_at),
  CONSTRAINT p2_chk_movement_odometer CHECK (odometer_start >= 0 AND odometer_end >= odometer_start),
  CONSTRAINT p2_chk_movement_origin CHECK ((origin = 'lesson' AND lesson_id IS NOT NULL) OR (origin IN ('external', 'adjustment') AND lesson_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_maintenance_plans (
  id CHAR(36) PRIMARY KEY,
  vehicle_id CHAR(36) NOT NULL,
  service VARCHAR(200) NOT NULL,
  target_odometer DECIMAL(12,2) NOT NULL,
  warning_km DECIMAL(12,2) NOT NULL,
  notes TEXT NOT NULL,
  active BOOLEAN NOT NULL,
  UNIQUE (id, vehicle_id),
  FOREIGN KEY (vehicle_id) REFERENCES p2_vehicles(id),
  CONSTRAINT p2_chk_plan_odometer CHECK (target_odometer >= 0 AND warning_km >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_maintenance_records (
  id CHAR(36) PRIMARY KEY,
  vehicle_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  service VARCHAR(200) NOT NULL,
  performed_on DATE NOT NULL,
  odometer DECIMAL(12,2) NOT NULL,
  notes TEXT NOT NULL,
  author_id CHAR(36) NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES p2_vehicles(id),
  FOREIGN KEY (plan_id, vehicle_id) REFERENCES p2_maintenance_plans(id, vehicle_id),
  FOREIGN KEY (author_id) REFERENCES p2_users(id),
  INDEX idx_maintenance_vehicle_date (vehicle_id, performed_on),
  CONSTRAINT p2_chk_record_odometer CHECK (odometer >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_audit_entries (
  id CHAR(36) PRIMARY KEY,
  entity VARCHAR(80) NOT NULL,
  entity_id CHAR(36) NOT NULL,
  action VARCHAR(80) NOT NULL,
  before_value LONGTEXT NOT NULL,
  after_value LONGTEXT NOT NULL,
  justification TEXT NOT NULL,
  author_id CHAR(36) NOT NULL,
  occurred_at DATETIME NOT NULL,
  FOREIGN KEY (author_id) REFERENCES p2_users(id),
  INDEX idx_audit_entity_time (entity, entity_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_student_details (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  postal_address JSON NULL,
  FOREIGN KEY (id) REFERENCES p2_students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS p2_exams (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  exam_type ENUM('theory', 'practice') NOT NULL,
  starts_at DATETIME NOT NULL,
  result ENUM('scheduled', 'passed', 'failed', 'absent', 'cancelled') NOT NULL,
  notes TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES p2_students(id),
  INDEX idx_exams_date (starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
