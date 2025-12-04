# Teacher Portal - Deployment Guide

## ✅ Ready for Vercel Free Tier!

This app now runs **100% in the browser** - no backend needed!

## Quick Deploy

### 1. Get Gemini API Key (Free)
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy it (starts with `AIza...`)

### 2. Deploy to Vercel
```bash
npm install -g vercel
vercel
```

That's it! ✨

## Local Testing

```bash
npm run dev
```

Then:
1. Open `http://localhost:5173`
2. Login: `teacher@demo.com` / `password`
3. Go to Settings → Add your Gemini API key
4. Try importing a PDF!

## How It Works

- PDF is processed in your browser using `pdfjs-dist`
- Each page is converted to an image
- Sent directly to Gemini Vision API
- AI extracts questions with perfect formulas & diagrams
- All processing happens client-side

## Features

✅ Extract MCQ questions from any PDF
✅ Handles mathematical formulas (√, ², ∫, etc.)
✅ Preserves diagrams and images
✅ Works with messy/scanned PDFs
✅ Dark mode
✅ Responsive design
✅ Print test papers

## Free Tier Limits

**Gemini API Free Tier:**
- 15 requests/minute
- 1500 requests/day
- Perfect for personal/classroom use

## Notes

- Gemini API key is stored in browser `localStorage`
- All data (tests, questions) stored locally in browser
- No data sent to any server except Gemini API
- Works offline after first load (PWA)
