# Build Scripts

## increment-build.js

Automatically increments build numbers in `app.json` before building.

**What it does:**
- Increments `ios.buildNumber` (string, e.g., "3" → "4")
- Increments `android.versionCode` (number, e.g., 1 → 2)

**Usage:**

```bash
# Standalone
node scripts/increment-build.js

# Via npm (recommended)
npm run increment-build
```

**Why?** EAS Build rejects duplicate build numbers, forcing rebuilds and wasting free builds. This script ensures every build has unique numbers.

**After building:** Commit the updated `app.json` to track build number history.
