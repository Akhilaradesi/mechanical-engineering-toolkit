# Mechanical Engineering Toolkit

A production-style full-stack web application for mechanical engineering students to perform common analysis and design calculations.

## Tech Stack

- Frontend: React (Vite), Tailwind CSS, Chart.js
- Backend: Node.js, Express
- Persistence: JSON file storage (`server/storage/history.json`)
- Export: PDF generation using `html2canvas` + `jsPDF`

## Features

- Dashboard homepage
- Stress & Strain calculator
- Beam deflection calculator (cantilever and simply supported)
- Shaft torsion calculator
- Per-calculator unit selectors (inputs + output display units)
- Heat transfer formulas and calculators (conduction, fins, transient)
- Material selector tool
- Engineering unit converter
- Save calculation history
- Export results as PDF
- Responsive sidebar-based UI
- Dark/light mode toggle

## Folder Structure

```text
mechanical-engineering-toolkit/
|-- client/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- context/
|   |   |-- data/
|   |   |-- hooks/
|   |   |-- pages/
|   |   |-- utils/
|   |-- package.json
|-- server/
|   |-- src/
|   |   |-- controllers/
|   |   |-- data/
|   |   |-- middleware/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- utils/
|   |-- storage/history.json
|   |-- package.json
|-- package.json
```

## API Endpoints

- `GET /materials`
- `POST /calculate/stress`
- `POST /calculate/beam`
- `POST /calculate/torsion`
- `POST /save`
- `GET /history`

## Core Engineering Formulas

- Stress: `sigma = F / A`
- Strain (optional): `epsilon = sigma / E`
- Cantilever Deflection: `delta = P L^3 / (3 E I)`
- Simply Supported Deflection: `delta = P L^3 / (48 E I)`
- Shaft Torsion: `tau = T r / J`

## Run Locally

1. Install dependencies (workspace root):

   ```bash
   npm.cmd install --workspaces
   ```

2. Start backend API (terminal 1):

   ```bash
   npm.cmd --prefix server run dev
   ```

3. Start frontend app (terminal 2):

   ```bash
   npm.cmd --prefix client run dev
   ```

4. Open the Vite URL shown in terminal (usually `http://localhost:5173`).

## Production Build

```bash
npm.cmd --prefix client run build
```

## Notes

- History persists in JSON and keeps the newest 500 records.
- Frontend uses Vite proxy settings to call the backend during local development.
- Input validation is enforced on both UI and API layers.

## Deploy (Render - Recommended)

This repo now includes a production Blueprint file: `render.yaml`.

### 1. Push project to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/mechanical-engineering-toolkit.git
git push -u origin main
```

### 2. Open Render Blueprint

Replace `<YOUR_GITHUB_REPO_URL>` with your HTTPS repo URL and open:

```text
https://dashboard.render.com/blueprint/new?repo=<YOUR_GITHUB_REPO_URL>
```

Example:

```text
https://dashboard.render.com/blueprint/new?repo=https://github.com/yourname/mechanical-engineering-toolkit
```

### 3. Deploy

1. Select your Render workspace
2. Keep plan as `free`
3. Click **Apply**
4. Wait for build and deploy
5. Open the generated Render URL

### Production notes

- `server/src/app.js` serves `client/dist` in production, so frontend + backend run from one Render web service.
- Health endpoint: `/health`
- JSON history storage is file-based and ephemeral on free cloud instances.
