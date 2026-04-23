# Google Auth + Supabase App

Next.js full-stack приложение с авторизацией через Google и хранением профиля в Supabase.

## Запуск

1. Скопируйте `.env.example` в `.env.local` и заполните значения.
2. Установите зависимости: `npm install`
3. Запустите dev-сервер: `npm run dev`

## Поднятие backend

В проекте backend для AI-чата живет в директории `ai/` и поднимается вместе с локальным Postgres и Qdrant через Docker Compose.

### Что поднимается

Команда `docker compose -f docker-compose.local.yml up --build` стартует три сервиса:

- `pg-dev` - Postgres 17
- `qdrant-dev` - векторное хранилище Qdrant
- `lector-ai` - Rust backend из `ai/`

По умолчанию используются такие порты:

- `5434` -> Postgres
- `6333` и `6334` -> Qdrant
- `6969` -> backend `lector-ai`

### Что нужно перед запуском

1. Установите Docker Desktop.
2. Убедитесь, что Docker Engine запущен.
3. Проверьте, что порты `5434`, `6333`, `6334` и `6969` не заняты.
4. Убедитесь, что файл `.env.local` существует в корне проекта.

Минимально для связи фронтенда с backend в `.env.local` должны быть заданы:

```env
LECTOR_AI_URL=http://127.0.0.1:6969
LECTOR_AI_SHARED_SECRET=change-me
```

Эти переменные уже есть в `.env.example`. Значение `LECTOR_AI_SHARED_SECRET` должно совпадать с тем, что ожидает frontend.

### Переменные backend

`docker-compose.local.yml` прокидывает backend следующие настройки:

- `DATABASE_URL=postgresql://postgres:psql@pg-dev:5432/ssiss`
- `QDRANT_URL=http://qdrant-dev:6334`
- `PORT=6969`
- `HOST=0.0.0.0`
- `DEBUG=True`
- `POLLINATIONS_API_KEY`
- `POLLINATIONS_MODEL` со значением по умолчанию `gemini-fast`

Важно:

- Postgres и Qdrant для локальной разработки создаются автоматически контейнерами.
- Миграции из `ai/migrations/` backend применяет сам при старте.
- При первом запуске backend создает пользователя `admin` с паролем `admin`.
- Для рабочих запросов к `/ask` нужен доступный AI-провайдер. Если `POLLINATIONS_API_KEY` не задан или провайдер недоступен, сервис может стартовать, но генерация ответов будет падать.
- Эта инструкция проверена на текущем состоянии репозитория: `docker compose` действительно поднимает `pg-dev`, `qdrant-dev` и `lector-ai`.

### Запуск backend

Из корня проекта выполните:

```powershell
docker compose -f docker-compose.local.yml up --build
```

Если хотите оставить контейнеры в фоне:

```powershell
docker compose -f docker-compose.local.yml up --build -d
```

Проверить статус сервисов:

```powershell
docker compose -f docker-compose.local.yml ps
```

### Как понять, что backend поднялся

После успешного старта в логах `lector-ai` должна появиться строка вида:

```text
Starting Lector server at http://0.0.0.0:6969
```

Посмотреть последние логи backend:

```powershell
docker compose -f docker-compose.local.yml logs --tail 50 lector-ai
```

Дополнительно можно проверить авторизацию через PowerShell:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:6969/login" `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin"}'
```

Ожидаемый ответ содержит `token`, например:

```json
{"token":"<uuid>"}
```

Проверка защищенного маршрута с полученным токеном:

```powershell
$token = (Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:6969/login" `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin"}').token

Invoke-RestMethod `
  -Headers @{ Authorization = "Bearer $token" } `
  -Uri "http://127.0.0.1:6969/chat"
```

Если сервис поднялся нормально, вернется JSON-массив чатов, например `[]`.

### Как backend связан с frontend

- frontend читает адрес backend из `LECTOR_AI_URL`
- frontend логинится в backend через `/login` или `/register`
- после этого frontend вызывает защищенные маршруты `/chat`, `/chat/{chat_id}/messages` и `/ask`

Если backend не поднят, раздел чата во frontend не сможет получить список чатов и ответы модели.

### Остановка и сброс

Остановить сервисы:

```powershell
docker compose -f docker-compose.local.yml down
```

Остановить сервисы и удалить volumes:

```powershell
docker compose -f docker-compose.local.yml down -v
```

Второй вариант удалит данные локального Qdrant. Если нужен полностью чистый старт, используйте именно его.

### Типовые проблемы

`Port is already allocated`

- какой-то сервис уже занял один из портов из `docker-compose.local.yml`
- освободите порт или поменяйте проброс портов в compose-файле

`Failed to create pool`

- backend не может подключиться к Postgres
- проверьте, что контейнер `pg-dev` перешел в `healthy`

`Failed to initialize RAG system`

- backend не смог подключиться к Qdrant или AI-провайдеру
- проверьте `QDRANT_URL`, `POLLINATIONS_API_KEY` и логи контейнера `lector-ai`

`The "POLLINATIONS_API_KEY" variable is not set`

- это warning, а не причина падения контейнера
- backend стартует и отвечает на `/login`, но AI-запросы к `/ask` могут не работать без настроенного провайдера

`Unauthorized` или `Invalid credentials`

- токен не передан или передан неверно
- для проверки используйте `/login` с `admin/admin` и подставьте выданный токен в `Authorization: Bearer <token>`

`Json deserialize error: key must be a string`

- обычно это не ошибка backend, а некорректное тело запроса из PowerShell
- используйте `Invoke-RestMethod` с `-ContentType "application/json"` и строкой JSON в `-Body`

## Что настроить в Google Cloud

- Создайте OAuth Client в Google Cloud Console
- Добавьте `Authorized redirect URI` в формате:
  `https://<project-ref>.supabase.co/auth/v1/callback`
- Скопируйте `Client ID` и `Client Secret`

## Что настроить в Supabase

1. Создайте проект.
2. Возьмите:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. В `Authentication -> Providers -> Google` включите provider и вставьте Google credentials.
4. В SQL Editor выполните SQL из [supabase/schema.sql](/D:/JetBrains%20Projects/pr10/supabase/schema.sql:1)

## Поток авторизации

- пользователь нажимает кнопку входа
- браузер уходит в Google через Supabase Auth
- callback меняет code на session
- профиль синхронизируется в `public.profiles`
- кабинет читает данные из Supabase по cookie-сессии
