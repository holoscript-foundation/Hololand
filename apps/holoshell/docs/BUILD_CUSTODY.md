# HoloShell Build Custody

Builds are now treated as live hardware custody, not anonymous terminal noise.

Run:

```powershell
pnpm run holoshell:build-custody
```

Outputs:

- `.tmp/holoshell/build-custody.json`
- `.tmp/holoshell/build-custody.js`

The receipt groups active build-related PIDs into build trees, records age and
memory pressure, hides raw command lines by default, and blocks direct build
termination behind a break-glass stop policy.
