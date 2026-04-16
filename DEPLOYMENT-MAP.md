# Real Matka Deployment Map

## Domain Mapping

- `https://www.realmatka.in`
  - folder: `C:\Users\SDT-WEDDING\Desktop\realmatka app\realmatka frontend web`
  - use as: landing / marketing website

- `https://play.realmatka.in`
  - folder: `C:\Users\SDT-WEDDING\Desktop\realmatka app\user apk`
  - use as: main user app for Android and web

- `https://admin.realmatka.in`
  - folder: `C:\Users\SDT-WEDDING\Desktop\realmatka app\admin frontend`
  - use as: admin panel

- backend API
  - folder: `C:\Users\SDT-WEDDING\Desktop\realmatka app\Backend`
  - production base: `https://realmatka-backend.onrender.com`

## Link Expectations

- landing website `Login` button should open:
  - `https://play.realmatka.in`

- landing website `Open Website` / user-facing CTA buttons should open:
  - `https://play.realmatka.in`

- admin production config should call:
  - `https://realmatka-backend.onrender.com`

## Files Updated

- `realmatka frontend web/app/page.tsx`
- `realmatka frontend web/components/Header.tsx`
- `realmatka frontend web/components/Footer.tsx`
- `user apk/.env.production`
- `admin frontend/config.js`
