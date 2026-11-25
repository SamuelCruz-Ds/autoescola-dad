-- Autoescola DAD | Dados fictícios de demonstração
-- Execute depois de npm run db:setup em uma base de demonstração.
-- Login de instrutor: sql.demo.ana ou sql.demo.bruno. Senha fictícia: AulaDemo!2026
-- O dia da importação segue a data da sessão MySQL.
SET NAMES utf8mb4;
START TRANSACTION;
SELECT id INTO @demo_lock FROM p2_app_lock WHERE id = 1 FOR UPDATE;
SET @ontem = CURRENT_DATE - INTERVAL 1 DAY;
SET @hoje = CURRENT_DATE;
SET @amanha = CURRENT_DATE + INTERVAL 1 DAY;
SET @depois = CURRENT_DATE + INTERVAL 2 DAY;
SET @disponibilidade = JSON_ARRAY(
  JSON_OBJECT('weekday', 0, 'start', '07:00', 'end', '21:00'),
  JSON_OBJECT('weekday', 1, 'start', '07:00', 'end', '21:00'),
  JSON_OBJECT('weekday', 2, 'start', '07:00', 'end', '21:00'),
  JSON_OBJECT('weekday', 3, 'start', '07:00', 'end', '21:00'),
  JSON_OBJECT('weekday', 4, 'start', '07:00', 'end', '21:00'),
  JSON_OBJECT('weekday', 5, 'start', '07:00', 'end', '21:00'),
  JSON_OBJECT('weekday', 6, 'start', '07:00', 'end', '21:00')
);

INSERT INTO p2_instructors (id, name, contact, active, availability) VALUES
  ('df000000-0000-4000-8000-000000000001', 'Ana Ribeiro (demo)', 'Contato de demonstração', 1, @disponibilidade),
  ('df000000-0000-4000-8000-000000000002', 'Bruno Lima (demo)', 'Contato de demonstração', 1, @disponibilidade),
  ('df000000-0000-4000-8000-000000000003', 'Marina Souza (demo)', 'Contato de demonstração', 1, @disponibilidade)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO p2_users (id, name, login, password_hash, role, active, instructor_id) VALUES
  ('df000000-0000-4000-8000-000000000011', 'Ana Ribeiro (demo)', 'sql.demo.ana', 'scrypt$c00dd706f233cd60705f3ee879166374$f2c35cc64e8d7ce1b8d4cb4e816dc6886c7d109ed35b2e2447650284a0dc732d4d499038f3c69cffa49de7e7f9eb4fd35b40203b093bc4491e982b168a84d398', 'instructor', 1, 'df000000-0000-4000-8000-000000000001'),
  ('df000000-0000-4000-8000-000000000012', 'Bruno Lima (demo)', 'sql.demo.bruno', 'scrypt$82d619c24a4a4841702f74e4aba37e96$5c9dcce946ee04db361c5dfa954dae0f8db20cfd587cb59f2a7260ecc6f8ac57ce2974ca7e862bd9c3db376bd6031503bf836e9876a222d2be7532d0d574b7c1', 'instructor', 1, 'df000000-0000-4000-8000-000000000002')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO p2_students (id, name, contact, category, active, instructor_id, notes) VALUES
  ('df000000-0000-4000-8000-000000000021', 'Carla Nunes (demo)', 'Contato de demonstração', 'B', 1, 'df000000-0000-4000-8000-000000000001', 'Cadastro fictício.'),
  ('df000000-0000-4000-8000-000000000022', 'Diego Martins (demo)', 'Contato de demonstração', 'B', 1, 'df000000-0000-4000-8000-000000000002', 'Cadastro fictício.'),
  ('df000000-0000-4000-8000-000000000023', 'Elisa Torres (demo)', 'Contato de demonstração', 'B', 1, 'df000000-0000-4000-8000-000000000003', 'Cadastro fictício.'),
  ('df000000-0000-4000-8000-000000000024', 'Felipe Costa (demo)', 'Contato de demonstração', 'B', 1, 'df000000-0000-4000-8000-000000000001', 'Cadastro fictício.'),
  ('df000000-0000-4000-8000-000000000025', 'Júlia Almeida (demo)', 'Contato de demonstração', 'B', 1, 'df000000-0000-4000-8000-000000000002', 'Cadastro fictício.'),
  ('df000000-0000-4000-8000-000000000026', 'Rafael Rocha (demo)', 'Contato de demonstração', 'AB', 1, 'df000000-0000-4000-8000-000000000003', 'Cadastro fictício.')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO p2_student_details (id, email, postal_address) VALUES
  ('df000000-0000-4000-8000-000000000021', '', JSON_OBJECT('cep','13480000','street','','district','','city','Limeira','state','SP'))
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO p2_student_goals (id, student_id, lesson_type, required) VALUES
  ('df000000-0000-4000-8000-000000000102', 'df000000-0000-4000-8000-000000000021', 'theory', 4),
  ('df000000-0000-4000-8000-000000000103', 'df000000-0000-4000-8000-000000000021', 'practice', 8),
  ('df000000-0000-4000-8000-000000000104', 'df000000-0000-4000-8000-000000000022', 'theory', 4),
  ('df000000-0000-4000-8000-000000000105', 'df000000-0000-4000-8000-000000000022', 'practice', 8),
  ('df000000-0000-4000-8000-000000000106', 'df000000-0000-4000-8000-000000000023', 'theory', 4),
  ('df000000-0000-4000-8000-000000000107', 'df000000-0000-4000-8000-000000000023', 'practice', 8),
  ('df000000-0000-4000-8000-000000000108', 'df000000-0000-4000-8000-000000000024', 'theory', 4),
  ('df000000-0000-4000-8000-000000000109', 'df000000-0000-4000-8000-000000000024', 'practice', 8),
  ('df000000-0000-4000-8000-000000000110', 'df000000-0000-4000-8000-000000000025', 'theory', 4),
  ('df000000-0000-4000-8000-000000000111', 'df000000-0000-4000-8000-000000000025', 'practice', 8),
  ('df000000-0000-4000-8000-000000000112', 'df000000-0000-4000-8000-000000000026', 'theory', 4),
  ('df000000-0000-4000-8000-000000000113', 'df000000-0000-4000-8000-000000000026', 'practice', 8)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO p2_vehicles (id, model, plate, category, initial_odometer, current_odometer, status) VALUES
  ('df000000-0000-4000-8000-000000000031', 'Fiat Argo (demo)', 'SQL1D01', 'B', 40200, 40218, 'available'),
  ('df000000-0000-4000-8000-000000000032', 'VW Polo (demo)', 'SQL1D02', 'B', 28360, 28360, 'available'),
  ('df000000-0000-4000-8000-000000000033', 'Chevrolet Onix (demo)', 'SQL1D03', 'B', 19012, 19012, 'maintenance')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO p2_lessons (id, student_id, instructor_id, vehicle_id, lesson_type, category, starts_at, ends_at, status, notes, cancelled_at, cancellation_reason) VALUES
  ('df000000-0000-4000-8000-000000000041', 'df000000-0000-4000-8000-000000000021', 'df000000-0000-4000-8000-000000000001', 'df000000-0000-4000-8000-000000000031', 'practice', 'B', TIMESTAMP(@ontem, '08:00:00'), TIMESTAMP(@ontem, '09:00:00'), 'completed', 'Registro fictício da demonstração.', NULL, NULL),
  ('df000000-0000-4000-8000-000000000042', 'df000000-0000-4000-8000-000000000022', 'df000000-0000-4000-8000-000000000002', NULL, 'theory', 'B', TIMESTAMP(@ontem, '10:00:00'), TIMESTAMP(@ontem, '11:00:00'), 'completed', 'Registro fictício da demonstração.', NULL, NULL),
  ('df000000-0000-4000-8000-000000000043', 'df000000-0000-4000-8000-000000000023', 'df000000-0000-4000-8000-000000000003', NULL, 'theory', 'B', TIMESTAMP(@ontem, '12:00:00'), TIMESTAMP(@ontem, '13:00:00'), 'absent', 'Registro fictício da demonstração.', NULL, NULL),
  ('df000000-0000-4000-8000-000000000044', 'df000000-0000-4000-8000-000000000024', 'df000000-0000-4000-8000-000000000001', 'df000000-0000-4000-8000-000000000031', 'practice', 'B', TIMESTAMP(@ontem, '15:00:00'), TIMESTAMP(@ontem, '16:00:00'), 'scheduled', 'Registro fictício da demonstração.', NULL, NULL),
  ('df000000-0000-4000-8000-000000000045', 'df000000-0000-4000-8000-000000000021', 'df000000-0000-4000-8000-000000000001', NULL, 'theory', 'B', TIMESTAMP(@hoje, '13:00:00'), TIMESTAMP(@hoje, '14:00:00'), 'scheduled', 'Registro fictício da demonstração.', NULL, NULL),
  ('df000000-0000-4000-8000-000000000046', 'df000000-0000-4000-8000-000000000022', 'df000000-0000-4000-8000-000000000002', 'df000000-0000-4000-8000-000000000032', 'practice', 'B', TIMESTAMP(@hoje, '14:00:00'), TIMESTAMP(@hoje, '15:00:00'), 'scheduled', 'Registro fictício da demonstração.', NULL, NULL),
  ('df000000-0000-4000-8000-000000000047', 'df000000-0000-4000-8000-000000000025', 'df000000-0000-4000-8000-000000000002', NULL, 'theory', 'B', TIMESTAMP(@hoje, '16:00:00'), TIMESTAMP(@hoje, '17:00:00'), 'scheduled', 'Registro fictício da demonstração.', NULL, NULL),
  ('df000000-0000-4000-8000-000000000048', 'df000000-0000-4000-8000-000000000024', 'df000000-0000-4000-8000-000000000001', 'df000000-0000-4000-8000-000000000031', 'practice', 'B', TIMESTAMP(@amanha, '09:00:00'), TIMESTAMP(@amanha, '10:00:00'), 'scheduled', 'Registro fictício da demonstração.', NULL, NULL),
  ('df000000-0000-4000-8000-000000000049', 'df000000-0000-4000-8000-000000000026', 'df000000-0000-4000-8000-000000000003', 'df000000-0000-4000-8000-000000000032', 'practice', 'B', TIMESTAMP(@amanha, '11:00:00'), TIMESTAMP(@amanha, '12:00:00'), 'scheduled', 'Registro fictício da demonstração.', NULL, NULL),
  ('df000000-0000-4000-8000-000000000050', 'df000000-0000-4000-8000-000000000023', 'df000000-0000-4000-8000-000000000003', NULL, 'theory', 'B', TIMESTAMP(@depois, '12:00:00'), TIMESTAMP(@depois, '13:00:00'), 'scheduled', 'Registro fictício da demonstração.', NULL, NULL),
  ('df000000-0000-4000-8000-000000000051', 'df000000-0000-4000-8000-000000000021', 'df000000-0000-4000-8000-000000000001', 'df000000-0000-4000-8000-000000000031', 'practice', 'B', TIMESTAMP(@depois, '15:00:00'), TIMESTAMP(@depois, '16:00:00'), 'cancelled', 'Registro fictício da demonstração.', TIMESTAMP(@hoje, '08:00:00'), 'Solicitação fictícia do aluno')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO p2_lesson_reports (id, lesson_id, outcome, notes, vehicle_id, odometer_start, odometer_end, author_id, submitted_at, updated_at) VALUES
  ('df000000-0000-4000-8000-000000000071', 'df000000-0000-4000-8000-000000000041', 'completed', 'Treino de baliza e condução em via urbana.', 'df000000-0000-4000-8000-000000000031', 40200, 40218, 'df000000-0000-4000-8000-000000000011', TIMESTAMP(@ontem, '09:05:00'), NULL),
  ('df000000-0000-4000-8000-000000000072', 'df000000-0000-4000-8000-000000000042', 'completed', 'Revisão de placas e sinalização horizontal.', NULL, NULL, NULL, 'df000000-0000-4000-8000-000000000012', TIMESTAMP(@ontem, '11:05:00'), NULL)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO p2_mileage_movements (id, vehicle_id, lesson_id, origin, occurred_at, odometer_start, odometer_end, justification, author_id) VALUES
  ('df000000-0000-4000-8000-000000000081', 'df000000-0000-4000-8000-000000000031', 'df000000-0000-4000-8000-000000000041', 'lesson', TIMESTAMP(@ontem, '09:00:00'), 40200, 40218, 'Treino de direção', 'df000000-0000-4000-8000-000000000011')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO p2_maintenance_plans (id, vehicle_id, service, target_odometer, warning_km, notes, active) VALUES
  ('df000000-0000-4000-8000-000000000091', 'df000000-0000-4000-8000-000000000031', 'Revisão e troca de óleo', 40300, 100, 'Limites fictícios.', 1),
  ('df000000-0000-4000-8000-000000000092', 'df000000-0000-4000-8000-000000000033', 'Inspeção dos freios', 19000, 200, 'Em manutenção.', 1)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO p2_maintenance_records (id, vehicle_id, plan_id, service, performed_on, odometer, notes, author_id) VALUES
  ('df000000-0000-4000-8000-000000000093', 'df000000-0000-4000-8000-000000000031', 'df000000-0000-4000-8000-000000000091', 'Revisão anterior', CURRENT_DATE - INTERVAL 20 DAY, 40200, 'Registro fictício da oficina.', (SELECT id FROM p2_users WHERE role = 'admin' ORDER BY id LIMIT 1))
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO p2_exams (id, student_id, exam_type, starts_at, result, notes) VALUES
  ('df000000-0000-4000-8000-000000000201', 'df000000-0000-4000-8000-000000000021', 'theory', TIMESTAMP(@ontem, '13:00:00'), 'passed', 'Resultado fictício.'),
  ('df000000-0000-4000-8000-000000000202', 'df000000-0000-4000-8000-000000000022', 'practice', TIMESTAMP(@ontem, '15:00:00'), 'failed', 'Remarcar após aula de revisão.'),
  ('df000000-0000-4000-8000-000000000203', 'df000000-0000-4000-8000-000000000021', 'practice', TIMESTAMP(@amanha, '15:00:00'), 'scheduled', 'Local de prova fictício.'),
  ('df000000-0000-4000-8000-000000000204', 'df000000-0000-4000-8000-000000000026', 'theory', TIMESTAMP(@depois, '16:00:00'), 'scheduled', '')
ON DUPLICATE KEY UPDATE id = id;

COMMIT;
