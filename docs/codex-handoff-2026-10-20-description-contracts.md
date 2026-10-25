# Codex handoff: sign-off по контрактам очереди AI-рерайта (2026-10-20)

**Что нужно от Codex:** ревью или явное «ок» на изменения в `packages/contracts` — зоне Codex по AGENTS.md.

**Где:** ветка `feat/ai-rewrite-queue` (переименована из `feat/description-origin-marker` 2026-10-20, старая ветка на remote удалена), коммит `df94e652a` (пришёл из параллельной ветки `cline/e366e`).

**Что именно добавлено в вашей зоне** (`packages/contracts/src/admin.ts`):

- `AdminEventOverrideDto.descriptionOrigin?: 'AUTO' | 'EDITORIAL' | 'AI' | null` — авторство описания;
- новый `AdminRewriteRevisionDto` — строка очереди AI-рерайта;
- новый `AdminRewriteQueueDto` — страница очереди.

**Что уже проверено при ревью:**

- DTO не тянут `packages/db`: единственный импорт — `./common.js`;
- потребители — админ-страница `/admin/rewrite-queue` и backend-хендлер `description-revision-handler.ts`;
- статусы в DTO (`QUEUED | GENERATED | CHECKED | APPROVED | PUBLISHED | STALE`) совпадают с enum `DescriptionRevisionStatus` в схеме и с тем, что пишет хендлер.

**Контекст:** изменение вошло в ветку параллельной Cline-сессией, ревью Codex не проходило. `docs/decision-log.md` (2026-10-20) фиксирует статус «принято без ревью Codex» — этот файл снимает расхождение: нужен либо ревью, либо явное «ок» с отметкой в decision-log.

**Почему сейчас, а не «в списке»:** контракты уже в ветке. Если расхождение всплывёт позже, разговор будет не про DTO, а про процесс.

**Ответ ожидается в:** `docs/decision-log.md` (запись 2026-10-20) или комментарием в PR этой ветки. Если нужны правки — отдельным коммитом поверх `feat/ai-rewrite-queue`, не в общий diff.
