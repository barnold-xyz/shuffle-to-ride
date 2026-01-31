# Auto-Increment Build Numbers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create build scripts that automatically increment iOS buildNumber and Android versionCode before building, preventing wasted EAS builds from duplicate build numbers.

**Architecture:** A Node.js script reads app.json, increments both build numbers, writes back, and commits the change. npm scripts chain increment → build commands.

**Tech Stack:** Node.js (fs module), npm scripts, EAS CLI

---

## Task 1: Create increment-build script

**Files:**
- Create: `app/scripts/increment-build.js`

**Step 1: Create scripts directory**

```bash
mkdir -p app/scripts
```

**Step 2: Write increment script**

Create `app/scripts/increment-build.js`:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');

function incrementBuildNumbers() {
  // Read app.json
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

  // Increment iOS buildNumber (string)
  const currentIosBuild = parseInt(appJson.expo.ios.buildNumber, 10);
  const newIosBuild = currentIosBuild + 1;
  appJson.expo.ios.buildNumber = String(newIosBuild);

  // Increment Android versionCode (number)
  const currentAndroidVersion = appJson.expo.android.versionCode;
  const newAndroidVersion = currentAndroidVersion + 1;
  appJson.expo.android.versionCode = newAndroidVersion;

  // Write back to app.json
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

  // Print what happened
  console.log('✅ Build numbers incremented:');
  console.log(`   iOS buildNumber: ${currentIosBuild} → ${newIosBuild}`);
  console.log(`   Android versionCode: ${currentAndroidVersion} → ${newAndroidVersion}`);
  console.log('');
  console.log('⚠️  Remember to commit app.json after the build completes!');
}

incrementBuildNumbers();
```

**Step 3: Make script executable (Unix-like systems)**

```bash
chmod +x app/scripts/increment-build.js
```

**Step 4: Test the script**

```bash
cd app
node scripts/increment-build.js
```

Expected output:
```
✅ Build numbers incremented:
   iOS buildNumber: 3 → 4
   Android versionCode: 1 → 2

⚠️  Remember to commit app.json after the build completes!
```

**Step 5: Verify app.json was updated**

```bash
cat app/app.json | grep -A 1 "buildNumber\|versionCode"
```

Expected: Shows buildNumber: "4" and versionCode: 2

**Step 6: Revert the test increment**

```bash
git restore app/app.json
```

**Step 7: Commit the script**

```bash
git add app/scripts/increment-build.js
git commit -m "feat: add build number auto-increment script"
```

---

## Task 2: Add npm build scripts

**Files:**
- Modify: `app/package.json`

**Step 1: Add build scripts to package.json**

Add these scripts to the `"scripts"` section:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "increment-build": "node scripts/increment-build.js",
    "build:android": "npm run increment-build && npx eas-cli build --platform android --profile preview",
    "build:ios": "npm run increment-build && npx eas-cli build --platform ios --profile production",
    "build:both": "npm run increment-build && npx eas-cli build --platform all --profile production"
  }
}
```

**Step 2: Test the increment script via npm**

```bash
cd app
npm run increment-build
```

Expected: Same output as before (increments shown)

**Step 3: Verify and revert**

```bash
git diff app/app.json  # Should show incremented values
git restore app/app.json
```

**Step 4: Commit package.json changes**

```bash
git add app/package.json
git commit -m "feat: add build scripts with auto-increment"
```

---

## Task 3: Update documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update build instructions in CLAUDE.md**

Replace the "Full Rebuild" section with:

```markdown
### Full Rebuild (native changes)
Required when changing `package.json`, `app.json`, native dependencies, or Expo SDK:

```bash
cd app
npx expo install --check                                         # Fix dependency mismatches
npx expo-doctor                                                  # Check for common issues

# Use automated build scripts (auto-increments build numbers)
npm run build:android      # Android APK (increments versionCode)
npm run build:ios          # iOS (increments buildNumber)
npm run build:both         # Both platforms

npx eas-cli submit --platform ios                                # Submit to TestFlight
```

**Build numbers:** Automatically incremented by build scripts. Commit `app.json` after successful builds.

**Version bumping:** Manually bump `version` in `app.json` for user-facing releases (e.g., "1.0.0" → "1.1.0").

**Rule of thumb:** Changed only `.ts`/`.tsx` files? Use OTA. Changed `package.json` or `app.json`? Rebuild.
```
```

**Step 2: Commit documentation update**

```bash
git add CLAUDE.md
git commit -m "docs: update build instructions to use automated scripts"
```

---

## Task 4: Create README for scripts directory

**Files:**
- Create: `app/scripts/README.md`

**Step 1: Document the script**

Create `app/scripts/README.md`:

```markdown
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
```

**Step 2: Commit README**

```bash
git add app/scripts/README.md
git commit -m "docs: add README for build scripts"
```

---

## Testing the Complete Flow

**Manual test:**

1. Run `npm run build:android` (dry run if not ready to actually build, but test the increment part)
2. Verify build numbers incremented in `app.json`
3. Commit the changes: `git add app/app.json && git commit -m "chore: increment build numbers for vX.Y.Z build"`

---

## Summary

After completion:
- ✅ `app/scripts/increment-build.js` - Auto-increment script
- ✅ `app/package.json` - Build commands with auto-increment
- ✅ `app/scripts/README.md` - Script documentation
- ✅ `CLAUDE.md` - Updated build instructions

**New workflow:**
```bash
cd app
npm run build:ios           # Increments → builds
git add app.json
git commit -m "chore: increment build numbers for build"
```
