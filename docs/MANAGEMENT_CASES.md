# 관리 필요 — 2026-11-04

## Prepared scope

- Replace legacy revenues list route `/dashboard/revenues` with management cases; navigation/display label `관리 필요`.
- October life exercise scan `20261104134331296.pdf`, three pages, 58 member rows. Only dates with actual attendance count as classes: Oct 1, 6, 8, 15, 20, 22, 27.
- Each readable attendance 1 is attended; blank on those seven class dates is absent. Non-class dates are excluded from streaks. List any member with at least three consecutive missed classes during October; retain cases where attendance later resumed. Distinguish trailing streak through Oct 27.
- Result: 13 members, including 4 with trailing streak at least 3. Three members have no October attendance (7 missed classes).
- Full scan daily totals cross-checked to earlier structured individual RF PDF after inspecting the differing row at higher resolution: 34,42,41,40,34,40,42 (273 visits). This source is used specifically for individual management; the earlier aggregate dashboard uses the separately supplied program screenshot.
- All identifiers visually verified against scan and earlier individual PDF. Prefix 20 is institutional format, not permission to invent missing year/digits. Names are redacted in source and not guessed.

## Recruitment

Use current registration applications, not paid enrollment, when finding available seats. Criteria: known capacity > known registered AND known waiting > 0. Goal = min(capacity - registered, waiting). Snapshot Nov 4. Seven programs/eight seats: 생활체조 2; 건강체조, 라인댄스 1, 하모니카 초급, 힐링수채화, 일본어 초급, 컴퓨터 활용 each 1. Unknown waiting is not treated as zero. All spare capacity can be viewed separately.

## Case records

확인 필요 / 처리 중 / 처리 완료, assignee, confirmation/action note, updated by and timestamp. Explicit save, unsaved drafts retained through filters, failure/conflict retains edits, refresh warns, stale revision rejected with HTTP 409. Stable period-specific IDs prevent mixing future periods. Notes max4000 chars, assignee80. Status does not automatically change registrations, capacity, or cancellation. No outbound contact actions.

API uses requireRouteUser and no-store. Source and per-case actions stored under scoped system_settings keys, independently per case. Member data is not included in source code, public assets or client bundles; GET exposes only management cases to signed-in users.

## Data minimization and approval block

Automatic approval review rejected uploading the full 58-member roster/attendance history to external Supabase, as exceeding explicit authorization for raw data storage. The rejected full upload was not executed. Only the separately approved 13-case minimal source was subsequently uploaded. Do not upload the full roster.

Prepared minimal source: `.tools/management-minimal.private.json`, 13 flagged member IDs, consecutive missed class dates/length, trailing length, last attendance date and source page; aggregate class-date and roster-count metadata. Excludes all non-flagged member records, names, phone numbers and full attendance matrix. User explicitly approved this minimal upload and online storage of status/assignee/notes on 2026-11-04. The 13-case minimal source was stored in the existing Supabase database after approval. Raw scan, full transcription, renderings remain local only. Public code package must exclude all `.tools` private files.

## Validation

- Pure streak boundary/holiday handling, duplicates, 13/4 counts, recruitment7/8.
- Local in-memory API tests: unauthorized401, list20, no-store, validated inputs, saved readback, insert/update conflicts409, unknown404, invalid400.
- Browser verification uses intercepted local responses only and does not exercise actual external DB persistence. Real database and production end-to-end checks must follow user approval and deployment.

## Future materials

Latest waiting list with program, queue order, member number and phone for actual contact lookup. Updated program registrations/cancellations to refresh vacancies. Other individual program RF records to extend streak management. Registered/withdrawn dates or legitimate absence reasons to distinguish follow-up from cases needing no action.
