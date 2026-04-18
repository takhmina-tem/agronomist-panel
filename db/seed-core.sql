-- db/seed-core.sql
--
-- CORE (production) seed.
-- Inserts only reference data that the application needs to function:
--   varieties, fertilizers.
-- Does NOT create any fields, operations, or demo agronomic history.
--
-- Idempotent: each block is skipped if the table already contains rows.
-- Safe to re-run at any time.


-- ── Varieties ─────────────────────────────────────────────────────────────────

INSERT INTO varieties (name, maturity_group, purpose_type, yield_potential_t_ha)
SELECT name, maturity_group, purpose_type, yield_potential_t_ha
FROM (VALUES
  ('Коломба',         'ранний',          'столовый', 44.0),
  ('Гала',            'среднеранний',    'чипсы',    52.0),
  ('Ред Скарлетт',    'ранний',          'столовый', 48.0),
  ('Невский',         'среднеранний',    'столовый', 40.0),
  ('Журавинка',       'среднеспелый',    'столовый', 38.0),
  ('Латона',          'ранний',          'чипсы',    46.0),
  ('Пикассо',         'среднепоздний',   'столовый', 42.0),
  ('Бриз',            'среднеранний',    'столовый', 44.0)
) AS t(name, maturity_group, purpose_type, yield_potential_t_ha)
WHERE NOT EXISTS (SELECT 1 FROM varieties);


-- ── Fertilizers ───────────────────────────────────────────────────────────────

INSERT INTO fertilizers (name, fertilizer_type, n_pct, p_pct, k_pct, purpose_note)
SELECT name, fertilizer_type, n_pct, p_pct, k_pct, purpose_note
FROM (VALUES
  ('NPK 16-16-16',       'комплексное',  16.0,  16.0, 16.0, 'Стартовое питание при посадке'),
  ('NPK 10-26-26',       'комплексное',  10.0,  26.0, 26.0, 'Упор на фосфор и калий при посадке'),
  ('Аммиачная селитра',  'азотное',      34.0,   0.0,  0.0, 'Азотная подкормка в вегетацию'),
  ('Карбамид',           'азотное',      46.0,   0.0,  0.0, 'Листовая азотная подкормка'),
  ('Калимагнезия',       'калийное',      0.0,   0.0, 32.0, 'Качество клубней и калибр'),
  ('Монокалийфосфат',    'листовое',      0.0,  52.0, 34.0, 'Поддержка в клубнеобразовании'),
  ('Суперфосфат',        'фосфорное',     0.0,  20.0,  0.0, 'Основное фосфорное удобрение'),
  ('Сульфат калия',      'калийное',      0.0,   0.0, 50.0, 'Бесхлорное калийное удобрение')
) AS t(name, fertilizer_type, n_pct, p_pct, k_pct, purpose_note)
WHERE NOT EXISTS (SELECT 1 FROM fertilizers);
