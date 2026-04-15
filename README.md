
# CRS Transport Dashboard

This dashboard started from a Figma-generated code bundle and is currently isolated to the CRS transport dashboard for static hosting and review.

Main source data:
- `../crs_transport_dashboard_ready.csv`

Generated app data files:
- `src/app/data/crsData.ts`
- `public/data/crs-records/index.json`
- `public/data/crs-records/chunk-*.json`

## Run locally

1. Install dependencies

```powershell
npm install
```

2. Regenerate the CRS app data layer from the latest CSV

```powershell
python build_crs_dashboard_data.py
```

3. Start the dev server

```powershell
npm run dev
```

If you want a fixed host/port for easy local viewing:

```powershell
npm run dev:host
```

4. Build a production bundle

```powershell
npm run build
```

5. Preview the production build locally

```powershell
npm run preview
```

Or preview on a fixed host/port:

```powershell
npm run preview:host
```

Production output goes to:
- `dist/`

## Notes

- The current app is static and client-side, which makes it easy to host on GitHub Pages or any static file host.
- Routing uses URL hashes so the built app works cleanly on static hosts without extra server rewrites.
- The generated TypeScript data file is large because it includes the CRS aggregate fact table.
- The deep-dive explorer now lazy-loads a sharded CRS record store from `public/data/crs-records/` instead of one monolithic JSON file, which keeps individual files below GitHub’s 100 MB limit.
- If the source CSV changes, rerun `python build_crs_dashboard_data.py` before rebuilding the app.

## GitHub Pages

If you push this folder to a GitHub repository, the included workflow can build and publish the CRS dashboard to GitHub Pages automatically.

1. Push the project to GitHub
2. In GitHub repo settings, enable Pages with GitHub Actions
3. Push to `main` or manually run the workflow
  
