#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');

function incrementBuildNumbers() {
  let appJson;

  // Read and parse app.json with error handling
  try {
    const fileContents = fs.readFileSync(APP_JSON_PATH, 'utf8');
    appJson = JSON.parse(fileContents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`❌ Error: app.json not found at ${APP_JSON_PATH}`);
      process.exit(1);
    } else if (error instanceof SyntaxError) {
      console.error('❌ Error: app.json contains invalid JSON');
      console.error(error.message);
      process.exit(1);
    } else {
      console.error('❌ Error reading app.json:', error.message);
      process.exit(1);
    }
  }

  // Validate structure
  if (!appJson?.expo?.ios?.buildNumber || !appJson?.expo?.android?.versionCode) {
    console.error('❌ Error: app.json missing required build number fields');
    console.error('Expected: expo.ios.buildNumber and expo.android.versionCode');
    process.exit(1);
  }

  // Parse and validate iOS buildNumber
  const currentIosBuild = parseInt(appJson.expo.ios.buildNumber, 10);
  if (isNaN(currentIosBuild) || currentIosBuild < 0) {
    console.error(`❌ Error: Invalid iOS buildNumber: "${appJson.expo.ios.buildNumber}"`);
    process.exit(1);
  }

  // Validate Android versionCode
  const currentAndroidVersion = appJson.expo.android.versionCode;
  if (typeof currentAndroidVersion !== 'number' || isNaN(currentAndroidVersion) || currentAndroidVersion < 0) {
    console.error(`❌ Error: Invalid Android versionCode: ${currentAndroidVersion}`);
    process.exit(1);
  }

  // Increment
  const newIosBuild = currentIosBuild + 1;
  const newAndroidVersion = currentAndroidVersion + 1;

  appJson.expo.ios.buildNumber = String(newIosBuild);
  appJson.expo.android.versionCode = newAndroidVersion;

  // Write back with error handling
  try {
    fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
  } catch (error) {
    console.error('❌ Error writing app.json:', error.message);
    process.exit(1);
  }

  // Success output
  console.log('✅ Build numbers incremented:');
  console.log(`   iOS buildNumber: ${currentIosBuild} → ${newIosBuild}`);
  console.log(`   Android versionCode: ${currentAndroidVersion} → ${newAndroidVersion}`);
  console.log('');
  console.log('⚠️  Remember to commit app.json after the build completes!');
}

incrementBuildNumbers();
