# User APK

Main user app for Real Matka. This is the single source of truth for the player experience on Android and Expo web.

## Run locally

Start the backend first:

```powershell
cd "C:\Users\SDT-WEDDING\Desktop\realmatka app\Backend"
npm start
```

Start the app:

```powershell
cd "C:\Users\SDT-WEDDING\Desktop\realmatka app\user apk"
npm.cmd install
npm.cmd run start:clear
```

Expo dev server:

- `http://localhost:8081`

## Android

```powershell
cd "C:\Users\SDT-WEDDING\Desktop\realmatka app\user apk"
npm.cmd run android
```

## Checks

```powershell
cd "C:\Users\SDT-WEDDING\Desktop\realmatka app\user apk"
npm.cmd run typecheck
npm.cmd run doctor
```

## Environment

- local API: `http://localhost:3000`
- production API: `https://realmatka-backend.onrender.com`
- local admin: `http://localhost:5501`

## Important folders

- `app`
- `components`
- `lib`
- `services`
- `theme`
- `assets`
