# Real Matka Workspace

This repo now uses a simple 4-part structure:

- `user apk`
  - main user app for Android and Expo web
- `admin frontend`
  - admin operator panel
- `realmatka frontend web`
  - promo / marketing website
- `Backend`
  - shared API and PostgreSQL backend

## Local startup

1. Backend

```powershell
cd "C:\Users\SDT-WEDDING\Desktop\realmatka app\Backend"
npm install
npm start
```

2. User app

```powershell
cd "C:\Users\SDT-WEDDING\Desktop\realmatka app\user apk"
npm.cmd install
npm.cmd run start:clear
```

3. Admin app

```powershell
cd "C:\Users\SDT-WEDDING\Desktop\realmatka app\admin frontend"
npm.cmd install
npm.cmd run dev
```

## Local URLs

- backend health: `http://localhost:3000/health`
- user app: `http://localhost:8081`
- admin app: `http://localhost:5501`

## Notes

- `user apk/.env.local` is set for local backend development
- `user apk/.env.production` is set for production backend usage
- `admin frontend/config.js` automatically uses local backend on localhost
- `realmatka frontend web` stays separate as the public promo website
