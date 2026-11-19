# Казахский текст: черновик, нужна проверка носителем

Весь казахский текст написан как черновик, он не прошёл проверку носителем. Проверить:

- `content/i18n/kk.json` — все строки интерфейса;
- `title.kk` и `situation.kk` в `content/scenarios/*.json`.

Не переведено: тексты персонажей и критерии сценариев (в промпты уходят на русском, ответ персонажа и разбор модель пишет на казахском), шаблоны заявлений (`content/templates`, только русский).
После проверки удалите этот файл.

Также проверить `success_criteria[].kk` в `content/scenarios/*.json`.

Также проверить `docs/survey-kk.md` (казахская анкета для тестирования со студентами).

- `content/templates/*.kk.md` — три шаблона заявлений на казахском (черновик).
- Строки `goal_reached`, `best_prev`, `play_again`, `try_harder`, `template_ru_only` в `kk.json`.
- Строки подсказок (hints в content/scenarios/*.json kk-поля, hint_*, hints_*, play_no_hints в kk.json).
- Редизайн: новые строки в `kk.json` (disclaimer, disclaimer_short, demo_badge, hero_*, how_*, level_desc_*, scenario_time, stats_link, memo_title, ai_label, thinking, finish_confirm, score_*, verdict_*, rights_source, template_btn) и `character.display` в `content/scenarios/*.json`.
