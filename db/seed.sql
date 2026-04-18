-- db/seed.sql
--
-- Idempotent demo seed: inserts reference and demo data only when each table
-- is completely empty.  Safe to re-run: if any rows already exist in a table
-- the block for that table is skipped entirely, so user-entered data is never
-- overwritten or duplicated.
--
-- Execution order respects FK constraints:
--   varieties → fertilizers → fields → operations
--
-- Run via:
--   npm run db:seed
--   DATABASE_URL=<url> npm run db:seed


-- ── Varieties ─────────────────────────────────────────────────────────────────

INSERT INTO varieties (name, maturity_group, purpose_type, yield_potential_t_ha)
SELECT name, maturity_group, purpose_type, yield_potential_t_ha
FROM (VALUES
  ('Коломба',      'ранний',        'столовый', 44.0),
  ('Гала',         'среднеранний',  'чипсы',    52.0),
  ('Ред Скарлетт', 'ранний',        'столовый', 48.0)
) AS t(name, maturity_group, purpose_type, yield_potential_t_ha)
WHERE NOT EXISTS (SELECT 1 FROM varieties);


-- ── Fertilizers ───────────────────────────────────────────────────────────────

INSERT INTO fertilizers (name, fertilizer_type, n_pct, p_pct, k_pct, purpose_note)
SELECT name, fertilizer_type, n_pct, p_pct, k_pct, purpose_note
FROM (VALUES
  ('NPK 16-16-16',    'комплексное', 16.0,  16.0, 16.0, 'Стартовое питание при посадке'),
  ('Калимагнезия',    'калийное',     0.0,   0.0, 32.0, 'Качество клубней и калибр'),
  ('Монокалийфосфат', 'листовое',     0.0,  52.0, 34.0, 'Поддержка в клубнеобразовании')
) AS t(name, fertilizer_type, n_pct, p_pct, k_pct, purpose_note)
WHERE NOT EXISTS (SELECT 1 FROM fertilizers);


-- ── Fields ────────────────────────────────────────────────────────────────────
-- Variety IDs are resolved by name so this block is robust even if serial
-- sequences differ across environments.

INSERT INTO fields (name, area_ha, variety_id, current_phase, disease_status)
SELECT f.name, f.area_ha, v.id, f.current_phase, f.disease_status
FROM (VALUES
  ('Поле Север-1',  24.5, 'Коломба',      'клубнеобразование', 2),
  ('Поле Восток-2', 18.2, 'Гала',         'цветение',          4),
  ('Поле Юг-3',     31.7, 'Ред Скарлетт', 'бутонизация',       1)
) AS f(name, area_ha, variety_name, current_phase, disease_status)
JOIN varieties v ON v.name = f.variety_name
WHERE NOT EXISTS (SELECT 1 FROM fields);


-- ── Operations ────────────────────────────────────────────────────────────────
-- Field IDs resolved by name. The entire block is skipped if operations
-- already exist (e.g. real agronomist data has been entered).

INSERT INTO operations (field_id, operation_type, operation_date, title, notes, payload, status)
SELECT fld.id, op.operation_type, op.operation_date::date, op.title, op.notes, op.payload::jsonb, 'completed'
FROM (VALUES
  -- Поле Север-1 (Коломба)
  ('Поле Север-1', 'planting',        '2026-04-18', 'Посадка Коломбы',              'Почва прогрета, стартовый фон выровнен.',           '{"variety":"Коломба","seedClass":"элита","fraction":"35-55","rateTHa":2.8,"depthCm":8,"rowSpacingCm":75,"soilTemperature":9.8,"starterFertilizer":"NPK 16-16-16"}'),
  ('Поле Север-1', 'inspection',      '2026-05-11', 'Первый осмотр после всходов',  'Всходы дружные, отмечен локальный дефицит влаги.', '{"emergencePct":91,"plantDensity":44000,"stemsPerPlant":4.1,"haulmHeightCm":18,"weeds":1,"lateBlight":1,"alternaria":0,"rhizoctonia":1,"commonScab":1,"coloradoBeetle":0,"wireworm":0,"stress":"dry"}'),
  ('Поле Север-1', 'fertilizer',      '2026-05-25', 'Калийная подкормка',           'Для усиления налива клубней.',                      '{"product":"Калимагнезия","doseKgHa":180,"phase":"бутонизация","applicationMethod":"вразброс","nKgHa":0,"pKgHa":0,"kKgHa":57.6}'),
  ('Поле Север-1', 'irrigation',      '2026-06-02', 'Полив дождеванием',            'Поддержание влаги в критическую фазу.',             '{"type":"sprinkler","volumeMm":30,"waterEc":0.7,"goal":"поддержание влаги"}'),
  ('Поле Север-1', 'crop_protection', '2026-06-10', 'Фунгицид против фитофтороза', 'Профилактическое окно перед осадками.',             '{"product":"Ревус","protectionType":"fungicide","dose":"0.6 л/га","weather":"ветер 2 м/с, без осадков","phase":"цветение"}'),
  ('Поле Север-1', 'harvest',         '2026-09-14', 'Уборка завершена',             'Калибр выше ожиданий.',                             '{"grossTons":1040,"yieldTHa":42.4,"fraction3555":38,"fraction5570":44,"fraction70plus":18,"wastePct":4.6}'),
  ('Поле Север-1', 'storage',         '2026-10-03', 'Контроль хранения',            'Потери в норме.',                                   '{"airTemp":3.8,"massTemp":4.1,"humidity":92,"lossPct":2.4,"storageDisease":"none"}'),

  -- Поле Восток-2 (Гала)
  ('Поле Восток-2', 'planting',        '2026-04-20', 'Посадка Галы',                    'Семенной материал однородный.',                   '{"variety":"Гала","seedClass":"первая репродукция","fraction":"55-70","rateTHa":3.1,"depthCm":7,"rowSpacingCm":75,"soilTemperature":8.9,"starterFertilizer":"NPK 16-16-16"}'),
  ('Поле Восток-2', 'inspection',      '2026-05-30', 'Осмотр поля',                     'После влажной недели вырос риск фитофтороза.',    '{"emergencePct":87,"plantDensity":41000,"stemsPerPlant":3.7,"haulmHeightCm":32,"weeds":2,"lateBlight":4,"alternaria":2,"rhizoctonia":1,"commonScab":0,"coloradoBeetle":0,"wireworm":0,"stress":"wet"}'),
  ('Поле Восток-2', 'fertilizer',      '2026-06-05', 'Листовое питание',                'Поддержка фосфора и калия.',                      '{"product":"Монокалийфосфат","doseKgHa":12,"phase":"цветение","applicationMethod":"листовое","nKgHa":0,"pKgHa":6.24,"kKgHa":4.08}'),
  ('Поле Восток-2', 'irrigation',      '2026-06-07', 'Полив каплей',                    'Снижение температурного стресса.',                '{"type":"drip","volumeMm":16,"waterEc":0.5,"goal":"охлаждение и влага"}'),
  ('Поле Восток-2', 'crop_protection', '2026-06-08', 'Экстренная фунгицидная обработка','Реакция на рост фитофтороза.',                    '{"product":"Инфинито","protectionType":"fungicide","dose":"1.4 л/га","weather":"пасмурно, влажно","phase":"цветение"}'),

  -- Поле Юг-3 (Ред Скарлетт)
  ('Поле Юг-3', 'planting',        '2026-04-23', 'Посадка Ред Скарлетт',           'Поле быстро прогрелось.',                           '{"variety":"Ред Скарлетт","seedClass":"элита","fraction":"35-55","rateTHa":2.9,"depthCm":8,"rowSpacingCm":90,"soilTemperature":10.2,"starterFertilizer":"NPK 16-16-16"}'),
  ('Поле Юг-3', 'inspection',      '2026-05-28', 'Осмотр с фотофиксацией',         'Растения ровные, сорняки в низком фоне.',           '{"emergencePct":93,"plantDensity":46000,"stemsPerPlant":4.4,"haulmHeightCm":28,"weeds":1,"lateBlight":1,"alternaria":0,"rhizoctonia":0,"commonScab":1,"coloradoBeetle":0,"wireworm":0,"stress":"none"}'),
  ('Поле Юг-3', 'fertilizer',      '2026-06-01', 'Внесение калия',                 'Работа под будущий калибр.',                        '{"product":"Калимагнезия","doseKgHa":210,"phase":"бутонизация","applicationMethod":"ленточно","nKgHa":0,"pKgHa":0,"kKgHa":67.2}'),
  ('Поле Юг-3', 'irrigation',      '2026-06-04', 'Плановый полив',                 'Поддержка равномерного роста.',                     '{"type":"sprinkler","volumeMm":26,"waterEc":0.6,"goal":"равномерное клубнеобразование"}'),
  ('Поле Юг-3', 'desiccation',     '2026-08-30', 'Десикация перед уборкой',        'Сушка ботвы для выравнивания калибра.',             '{"product":"Реглон","dose":"2 л/га","dryingPct":78,"haulmColor":"желто-зеленый"}'),
  ('Поле Юг-3', 'harvest',         '2026-09-16', 'Уборка партии на хранение',      'Результат стабильно высокий.',                      '{"grossTons":1363,"yieldTHa":43.0,"fraction3555":31,"fraction5570":48,"fraction70plus":21,"wastePct":3.7}')
) AS op(field_name, operation_type, operation_date, title, notes, payload)
JOIN fields fld ON fld.name = op.field_name
WHERE NOT EXISTS (SELECT 1 FROM operations);
