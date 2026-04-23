# Google Auth + Supabase App

Next.js full-stack приложение с авторизацией через Google и хранением профиля в Supabase.

## Запуск

1. Скопируйте `.env.example` в `.env.local` и заполните значения.
2. Установите зависимости: `npm install`
3. Запустите dev-сервер: `npm run dev`

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
