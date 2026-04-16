# Admin Frontend

Single React/Vite admin panel for Real Matka.

## Run locally

Start the backend first:

```powershell
cd "C:\Users\SDT-WEDDING\Desktop\realmatka app\Backend"
npm start
```

Start admin:

```powershell
cd "C:\Users\SDT-WEDDING\Desktop\realmatka app\admin-frontend"
npm.cmd install
npm.cmd run dev
```

Open:

- `http://localhost:5501`

## Build check

```powershell
cd "C:\Users\SDT-WEDDING\Desktop\realmatka app\admin-frontend"
npm.cmd run build
```

## Local defaults

- backend API: `http://localhost:3000`
- admin URL: `http://localhost:5501`

## Files that matter

- `index.html`
- `src/spa/App.jsx`
- `src/spa/main.jsx`
- `src/lib/`
- `config.js`

## Admin login

Use an approved admin account from your local seed data or production admin database.
