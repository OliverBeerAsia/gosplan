# Test Report - v1.1.0

Date: 2026-02-12

## Automated Checks Executed

### 1) Production Build

Command:

```bash
npm run build
```

Result:

- PASS
- TypeScript compile succeeded.
- Vite production bundle generated.

### 2) Atlas Manifest Sanity

Command:

```bash
node -e "const fs=require('fs');const p='public/assets/atlas/pixel-city.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));const req=['ground','water','road','power_line','khrushchyovka','factory'];const miss=req.filter(k=>!j.frames[k]);if(miss.length){throw new Error('Missing frames: '+miss.join(','));}console.log('atlas-ok');"
```

Result:

- PASS
- Required atlas keys present.

### 3) Dev Server Boot Smoke

Command:

```bash
/bin/zsh -lc 'npm run dev -- --host 127.0.0.1 --port 4173 >/tmp/gosplan_dev.log 2>&1 & pid=$!; sleep 5; kill $pid; wait $pid 2>/dev/null || true; rg -n "ready in|Local:" /tmp/gosplan_dev.log'
```

Result:

- PASS
- Vite dev server starts successfully.

### 4) Preview Server Boot Smoke

Command:

```bash
/bin/zsh -lc 'npm run preview -- --host 127.0.0.1 --port 4174 >/tmp/gosplan_preview.log 2>&1 & pid=$!; sleep 5; kill $pid; wait $pid 2>/dev/null || true; rg -n \"Local:\" /tmp/gosplan_preview.log'
```

Result:

- PASS
- Preview server starts and serves production build.

## Manual Smoke Checklist (Pending Manual Verification)

- Game boots to title screen.
- New game starts and camera controls work.
- Zoning tools paint and clear cells.
- Demand values update in resource bar.
- Auto growth occurs under valid conditions.
- `P` toggles power overlay.
- `C` toggles service overlay.
- Selecting empty tile shows diagnostics in info panel.
- Save and load preserve zones and terrain.

## Residual Risk

- No headless browser automation is currently configured; UI regression risk remains medium until manual checklist is completed on target devices.
