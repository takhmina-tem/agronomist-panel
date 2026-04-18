# Project operating rules

This project is an Agronomist Panel desktop web app based on a product vision PDF.
Your job is to finish the project against the product vision, not to create a demo imitation.

## Main goal

Bring the current project to production-like MVP readiness against the vision.
Priority is not visual polish first. Priority is:
1. real data model,
2. real PostgreSQL database,
3. working CRUD flows,
4. usable operation entry UI,
5. per-field analytics,
6. only after that secondary features.

## What is already known

A previous audit found:

### Implemented fully or mostly
- Field list
- Field timeline screen
- Desiccation data
- Harvest data
- Variety dictionary data via API
- Fertilizer dictionary data via API

### Present in data but missing real UI/forms
- Field inspection
- Fertilizers / NPK
- Irrigation
- Plant protection
- Storage

### Missing or critically incomplete
- New operation entry popup / modal
- Planting input form
- Per-field analytics
- Calibration column in field comparison
- Weather screen / weather integration
- Separate dictionary pages for varieties and fertilizers
- Good timeline rendering for inspection payloads

## Critical business priorities

### Blockers
1. New operation creation UI
2. PostgreSQL database as the source of truth
3. Reading and writing operations through the database
4. Per-field analytics screen

### Important
5. Planting and all major operation forms
6. Fertilizer auto-calculation from selected product
7. Field comparison: calibration column
8. Dictionary pages for varieties and fertilizers

### Nice to have
9. Weather integration
10. Better visual formatting of timeline payloads
11. Photos in timeline if supported by current model

## Non-negotiable engineering rules

- Do not claim a feature is complete unless it is backed by:
  - actual code,
  - actual database schema,
  - actual API route or server action,
  - actual UI,
  - and successful validation.
- Do not keep the app in read-only mode if the product requires data entry.
- Do not leave mock JSON as the final source of truth if PostgreSQL migration is in scope.
- Do not silently invent missing requirements. If something is unclear, infer conservatively and document the assumption.
- Prefer minimal invasive changes over full rewrites.
- Keep existing architecture unless it is clearly blocking delivery.
- Reuse existing types and domain objects where possible.
- Every major change must be followed by validation.

## Database policy

PostgreSQL must become the primary persistent database.

### Requirements
- Add a proper PostgreSQL connection.
- Add migration system.
- Add schema for core entities.
- Add seed/dev data if necessary.
- Move app reads from mock/static/API placeholder sources to PostgreSQL where appropriate.
- Move writes to PostgreSQL.
- Keep the codebase runnable locally.

### Database design principles
- Normalize enough for correctness, but do not overengineer.
- Preserve domain-level clarity.
- Use explicit foreign keys.
- Add created_at / updated_at fields where appropriate.
- Use enum-like constraints or app enums for operation types if suitable.
- Keep room for future weather/photos without breaking schema.

## Expected core entities

At minimum, inspect whether these are needed and implement the final set:

- fields
- varieties
- fertilizers
- operations
- operation_inspection
- operation_planting
- operation_fertilization
- operation_irrigation
- operation_protection
- operation_desiccation
- operation_harvest
- operation_storage

You may choose either:
1. one operations table + typed detail tables, or
2. one operations table + structured JSONB payload,
but you must justify the choice.

Preferred default:
- operations as base entity
- typed detail tables for major workflows
- JSONB only where variability is high and strongly justified

## Forms policy

The app must support real data entry.

### Required
- New operation modal or equivalent entry point
- Form for planting
- Form for inspection
- Form for fertilization
- Form for irrigation
- Form for plant protection
- Form for desiccation
- Form for harvest
- Form for storage

### Form rules
- Inputs must be human-usable, not raw JSON editors.
- Validation must exist.
- Save must persist data to PostgreSQL.
- After save, user must see the result in timeline and analytics where relevant.
- Use sensible defaults and placeholders.
- For fertilizers, auto-calculate N/P/K from fertilizer dictionary when product is selected.
- For harvest, support start and end date if required by the product vision.
- For planting, ensure soil temperature is not lost if the vision requires it.

## Analytics policy

Per-field analytics is core product value.

At minimum, the field analytics screen should evaluate and implement:
- NPK over season
- irrigation and rainfall / water balance if feasible
- disease dynamics over time
- fungicide/protection windows
- yield vs operations or seasonal events

Do not build fake charts from unrelated dummy values.
Charts must be derived from real field data.

If some analytics cannot be completed because source data is missing, explicitly:
- state why,
- add the missing backend/data dependency,
- and implement as much real analytics as possible.

## UI policy

- Desktop-first is acceptable.
- Clean, readable, professional UI.
- Functional completeness matters more than animation.
- Replace raw JSON rendering in the timeline with structured domain rendering.
- Maintain consistency across screens.
- Avoid unnecessary redesigns if not needed for delivery.

## Reporting format for every major task

After each major task, provide:
1. What was changed
2. Which files were added/updated
3. What assumptions were made
4. What validation was run
5. What remains incomplete
6. Whether the feature is READY / PARTIAL / MISSING

## Validation checklist

For each major implementation phase, run the relevant validations:
- install dependencies if needed
- typecheck
- lint
- tests if present
- build
- database migration status
- seed status if relevant

If a command fails:
- show exact failure,
- fix it if it is in scope,
- rerun validation.

## Safe execution rules

Before major implementation, first inspect:
- project structure
- package manager
- frontend framework
- backend/data layer
- current routes/pages
- current data models
- current API endpoints
- current mock sources
- existing charts/tables/components

Do not start coding until you understand the current architecture.

## Delivery order

Implement in this order unless the codebase strongly suggests a better minimal path:

1. Architecture audit
2. PostgreSQL integration plan
3. PostgreSQL schema + migrations + seed
4. Move reads to PostgreSQL
5. Implement new operation entry flow
6. Implement missing forms
7. Improve timeline rendering
8. Implement field analytics
9. Add field comparison calibration column
10. Add dictionary pages
11. Add weather integration last
12. Final readiness audit

## Definition of done

A feature is done only if:
- data model exists,
- persistence exists,
- UI exists,
- the user can use it end-to-end,
- validation passes,
- and the result matches the product vision closely enough for MVP.

## Final output expectations

When asked for a readiness report, produce:
- completed items,
- partial items,
- missing items,
- blockers,
- percentage estimate,
- concrete next steps,
- and evidence by file/path and behavior.

Always optimize for shipping a real working product.
