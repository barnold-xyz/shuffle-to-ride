#!/usr/bin/env node

// Thin wrapper around Gemini 2.5 Flash Image API for card art generation.
// Usage:
//   node generate-card.js --prompt-file prompt.txt --output path.png
//   node generate-card.js --prompt-file prompt.txt --output path.png --reference prev.png --feedback-file feedback.txt

const fs = require('fs');
const path = require('path');

// Load API key from .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const API_KEY = process.env.GOOGLE_API_KEY;
const MODEL = 'gemini-2.5-flash-image';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    parsed[key] = args[i + 1];
  }
  return parsed;
}

async function main() {
  if (!API_KEY) {
    console.error('Error: GOOGLE_API_KEY environment variable is not set');
    process.exit(1);
  }

  const args = parseArgs();

  // Support both inline --prompt and --prompt-file
  const prompt = args.prompt || (args['prompt-file'] && fs.readFileSync(path.resolve(args['prompt-file']), 'utf-8'));
  const feedback = args.feedback || (args['feedback-file'] && fs.readFileSync(path.resolve(args['feedback-file']), 'utf-8'));

  if (!prompt || !args.output) {
    console.error('Usage: node generate-card.js --prompt-file prompt.txt --output path.png [--reference prev.png --feedback-file feedback.txt]');
    process.exit(1);
  }

  // Build request parts
  const parts = [];

  // If we have a reference image for iteration, include it first
  if (args.reference && feedback) {
    const imgPath = path.resolve(args.reference);
    if (!fs.existsSync(imgPath)) {
      console.error(`Reference image not found: ${imgPath}`);
      process.exit(1);
    }
    const imgData = fs.readFileSync(imgPath).toString('base64');
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: imgData,
      },
    });
    parts.push({ text: feedback });
  }

  // Always include the main prompt
  parts.push({ text: prompt });

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  console.log('Calling Gemini API...');
  const response = await fetch(URL, {
    method: 'POST',
    headers: {
      'x-goog-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API error (${response.status}): ${errorText}`);
    process.exit(1);
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    console.error('Unexpected response structure (full):', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  // Extract image and text from response
  let imageFound = false;
  for (const part of data.candidates[0].content.parts) {
    if (part.text) {
      console.log('Model says:', part.text);
    }
    if (part.inlineData) {
      const outPath = path.resolve(args.output);
      const dir = path.dirname(outPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const buffer = Buffer.from(part.inlineData.data, 'base64');
      fs.writeFileSync(outPath, buffer);
      console.log(`Image saved to: ${outPath}`);
      imageFound = true;
    }
  }

  if (!imageFound) {
    console.error('No image in response. Parts received:');
    for (const part of data.candidates[0].content.parts) {
      if (part.text) console.error('  Text:', part.text);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
