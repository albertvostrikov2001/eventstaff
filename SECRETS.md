# Секреты проекта (зашифрованы)

Боевые секреты (`.env`, `.env.deploy`, `packages/web/.env.local`,
`packages/web/.env.production`) **не лежат в репозитории открытым текстом**.
Они упакованы в зашифрованный архив `secrets.bundle.enc`
(AES-256-CBC, PBKDF2, 200 000 итераций). Пароль хранится только у владельца
(в менеджере паролей) и в репозиторий не попадает.

## Запуск проекта на новом устройстве

```bash
git clone https://github.com/albertvostrikov2001/eventstaff.git
cd eventstaff
pnpm install

# восстановить секреты (спросит пароль)
bash scripts/secrets-decrypt.sh
```

После этого появятся все `.env`-файлы и проект готов к работе
(`pnpm dev`) и к деплою (`python deploy_api.py`, `python deploy_web.py`).

## Изменили секрет — обновите архив

```bash
# отредактировали нужный .env, затем:
bash scripts/secrets-encrypt.sh        # спросит тот же пароль
git add secrets.bundle.enc
git commit -m "chore: update secrets bundle"
git push
```

## Важно

- **Никогда** не коммитьте сами `.env*` файлы — они в `.gitignore`.
  В git идёт только `secrets.bundle.enc`.
- Требуется `openssl` (есть в Git Bash на Windows, в Linux/macOS по умолчанию).
- Пароль архива можно сменить: расшифруйте, затем `secrets-encrypt.sh`
  с новым паролем и закоммитьте обновлённый архив.
