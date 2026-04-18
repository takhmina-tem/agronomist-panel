# Feature: Operation Status

## Status: READY

---

## Values

| Value | Label (RU) | Use case |
|---|---|---|
| `completed` | Выполнено | Default — operation already done (all existing records) |
| `in_progress` | В процессе | Multi-day operations (e.g. harvest over several days) |
| `planned` | Запланировано | Future scheduled operations |

---

## Migration

**File:** `db/migrations/003_add_operation_status.sql`

```sql
alter table operations
  add column if not exists status text not null default 'completed'
    check (status in ('planned', 'in_progress', 'completed'));
```

- Idempotent (`ADD COLUMN IF NOT EXISTS`)
- Default `'completed'` — all 20 existing seeded records received this value automatically
- `NOT NULL` with CHECK constraint — invalid values are rejected at the DB level
- Run with: `npm run db:migrate`

---

## Files changed

### `db/migrations/003_add_operation_status.sql`
New migration.

### `lib/types.ts`
- Added `OperationStatus` union type: `'planned' | 'in_progress' | 'completed'`
- Added `status: OperationStatus` field to `TimelineEntry`

### `lib/data.ts`
- `getFieldById()`: `status` added to the SELECT column list
- `addOperation()`: `status?: string` added to function signature; column and param added to INSERT; `status` added to RETURNING clause; defaults to `'completed'` if not provided

### `app/api/operations/route.ts`
- `status` destructured from request body and forwarded to `addOperation()`

### `components/new-operation-modal.tsx`
- `status` state variable (`useState<'planned' | 'in_progress' | 'completed'>('completed')`)
- `close()` resets status to `'completed'`
- Status `<select>` added to the common fields section (date · title · **status**)
- `body.status` included in POST body in `handleSave()`

### `components/timeline.tsx`
- Status badge rendered in the card header row (after date)
- Badge is **only shown for non-completed** records — completed operations show no badge (clean default view)
- Styles: `planned` → slate pill · `in_progress` → amber pill

---

## Design decisions

### Status shown only when non-completed
Completed is the overwhelmingly dominant state. Showing a green "Выполнено" badge on every entry would add noise without value. Only `planned` and `in_progress` get a visible badge — these are the actionable states that need attention.

### Status in the common fields section (not per-form)
Status applies to the operation as a whole, not to specific data fields. Placing it alongside date and title (not in the type-specific form) is architecturally correct and keeps all 8 forms unchanged.

### Default = completed
Agronomists typically record operations after they happen ("I just irrigated field 1 with 30mm"). The default `completed` selection means the happy path requires zero extra clicks.

---

## Backward compatibility

- All 20 existing operations received `status = 'completed'` automatically via the migration default
- The SELECT query change is backward-compatible: the column always exists after migration
- `addOperation()` default `'completed'` means any caller that doesn't pass `status` behaves identically to before

---

## Validation

```
npm run typecheck  → PASS (0 errors)
npm run lint       → PASS (0 warnings)
npm test           → PASS (12/12)
npm run db:migrate → Applied: 1, skipped: 2
DB check: SELECT status, count(*) FROM operations GROUP BY status
  → completed | 20   (all existing rows correctly defaulted)
```
