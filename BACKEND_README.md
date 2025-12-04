# Teacher Portal - Backend Setup

## Architecture
This app uses a **Python backend** with **AI-powered PDF extraction** via Vision-Language Models (VLM) running on Kaggle GPUs.

## Local Development

### Prerequisites
- Python 3.9+
- Node.js 18+
- Kaggle Account & API Key

### Backend Setup
```bash
cd teachers-portal
pip install -r api/requirements.txt
uvicorn api.index:app --reload --port 8000
```

### Frontend
```bash
npm run dev
```

## Deployment (Vercel)

### 1. Deploy Frontend + Backend
```bash
npm install -g vercel
vercel
```

Vercel will automatically:
- Build React frontend
- Deploy Python serverless functions from `/api`

### 2. Configure Kaggle VLM (Required)

The backend needs a Kaggle-hosted VLM instance. Follow these steps:

#### Option A: Kaggle Notebook API (Recommended)
1. Go to Kaggle and create a new notebook
2. Install Qwen2.5-VL:
   ```python
   !pip install transformers torch pillow
   
   from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
   model = Qwen2VLForConditionalGeneration.from_pretrained("Qwen/Qwen2-VL-7B-Instruct")
   processor = AutoProcessor.from_pretrained("Qwen/Qwen2-VL-7B-Instruct")
   ```

3. Create an inference endpoint that accepts:
   - `image_base64`: Base64 encoded image
   - `prompt`: Text prompt

4. Expose via Kaggle API or create a simple Flask app

#### Option B: Use Groq API (simpler, no VLM)
If Kaggle VLM setup is complex, you can use Groq's text LLMs instead:
1. Replace VLM call with Groq API in `api/utils/kaggle_client.py`
2. Send extracted PDF text to Groq Llama model
3. Parse questions from text (less accurate for formulas/diagrams)

### 3. Update Frontend Settings
After deployment, users need to:
1. Go to **Settings** page
2. Enter Kaggle/Groq API credentials
3. Credentials are stored in browser localStorage

## Environment Variables (Optional)
Create `.env` file:
```
KAGGLE_USERNAME=your_username
KAGGLE_API_KEY=your_api_key
```

## Notes
- Vercel free tier has 10s timeout - upgrade to Pro if needed
- Images are processed in memory (no cloud storage)
- All user data stored in browser localStorage

## TODO
- [ ] Complete Kaggle VLM integration in `api/utils/kaggle_client.py`
- [ ] Add error handling for large PDFs
- [ ] Implement pagination for multi-page PDFs
