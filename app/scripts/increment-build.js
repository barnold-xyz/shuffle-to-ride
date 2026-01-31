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
