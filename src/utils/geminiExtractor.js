import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const extractQuestionsWithGemini = async (file, _unusedApiKey, onProgress) => {
    const apiKey = 'AIzaSyCdxI4LEFiOwsOI9pCc-WeMZ0eSMuL3KMc';

    const MODEL_NAME_ACTUAL = 'gemini-2.5-pro';

    onProgress?.('Preparing PDF for analysis...');

    try {
        // 1. Convert PDF File to Base64
        const base64Data = await fileToGenerativePart(file);

        onProgress?.('Uploading entire PDF to Gemini (this allows it to link Answer Keys)...');

        // 2. Construct the Prompt
        const prompt = `
        You are an expert Educational Content Digitizer. 
        Your task is to extract exam questions from the provided PDF document.

        CRITICAL INSTRUCTION: 
        You have the ENTIRE PDF. You must look at the questions (usually at the start) AND the Answer Key (usually at the very end of the PDF). 
        You must link the matching answer to the specific question.

        DATA EXTRACTION RULES:
        1. **Sections**: Identify the current Subject (Physics, Chemistry, Math) and Section (Section I, Part A, etc.).
        2. **Question Text**: Extract the full text. **CRITICAL**: Convert ALL mathematical expressions to LaTeX notation (e.g., convert 'sqrt(x)' to '$\\sqrt{x}$', 'x^2' to '$x^2$', '1/2' to '$\\frac{1}{2}$'). Use $...$ for inline math and $$...$$ for block math.
        3. **Diagrams**: If a question contains a visual diagram/graph/figure, set "has_diagram" to true and append "[DIAGRAM]" to the end of the question text.
        4. **Options**: Extract options. If it's an Integer type question, leave options empty.
        5. **Answer Linking**: Scroll to the end of the document, find the Answer Key table, and map the correct answer to this question number.

        JSON OUTPUT STRUCTURE:
        Return ONLY a JSON array. No markdown formatting.
        [
            {
                "id": 1,
                "section": "Physics - Section I",
                "question_number": "1",
                "question_type": "MCQ" | "MULTIMCQ" | "INTEGER" | "MATRIX",
                "question_text": "The full text of the question... [DIAGRAM]",
                "has_diagram": true,
                "options": [
                    { "id": "A", "text": "Option A text", "is_correct": false },
                    { "id": "B", "text": "Option B text", "is_correct": true }
                ],
                "correct_answer_value": "B", 
                "explanation": "Brief explanation if context implies it"
            }
        ]
        `;

        // 3. Call API with Retry Logic
        const MAX_RETRIES = 5;
        let response;
        let lastError;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 1) {
                    onProgress?.(`Attempt ${attempt}/${MAX_RETRIES}: Retrying Gemini API request...`);
                } else {
                    onProgress?.('Sending request to Gemini...');
                }

                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME_ACTUAL}:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: prompt },
                                    {
                                        inline_data: {
                                            mime_type: "application/pdf",
                                            data: base64Data
                                        }
                                    }
                                ]
                            }],
                            generationConfig: {
                                temperature: 0.1,
                                response_mime_type: "application/json",
                                maxOutputTokens: 55000 // Allow large JSON response
                            }
                        })
                    }
                );

                if (response.ok) break; // Success!

                // If not ok, throw to catch block for retry
                const errData = await response.json();
                throw new Error(errData.error?.message || `API Error: ${response.status}`);

            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt} failed:`, error);

                if (attempt < MAX_RETRIES) {
                    const delay = 2000 * attempt; // 2s, 4s, 6s, 8s
                    onProgress?.(`Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        if (!response || !response.ok) {
            throw lastError || new Error('Failed to connect to Gemini API after multiple attempts.');
        }

        onProgress?.('Analysis complete. Parsing JSON...');

        const result = await response.json();
        const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        console.log("--- RAW GEMINI JSON RESPONSE ---");
        console.log(generatedText);
        console.log("----------------------------------");

        if (!generatedText) throw new Error('Gemini returned empty response.');

        // 4. Parse JSON
        // The model is forced to return application/json, but we clean just in case
        let cleanJson = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
        let rawQuestions;
        try {
            rawQuestions = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            throw new Error("Failed to parse Gemini response. Please try again.");
        }

        // Map to internal format
        const questions = (Array.isArray(rawQuestions) ? rawQuestions : [rawQuestions]).map((q, idx) => {
            const normalizedType = q.question_type ? q.question_type.toLowerCase() : 'mcq';
            const isMultiSelect = normalizedType === 'multimcq' || (q.options || []).filter(o => o.is_correct).length > 1;

            return {
                id: Date.now() + Math.random() + idx,
                section: q.section || 'General',
                questionNumber: q.question_number || (idx + 1).toString(),
                type: normalizedType === 'multimcq' ? 'mcq' : normalizedType,
                multiSelect: isMultiSelect,
                text: q.question_text || '',
                hasDiagram: q.has_diagram || false,
                options: (q.options || []).map((opt, optIdx) => ({
                    id: opt.id || String.fromCharCode(65 + optIdx), // A, B, C...
                    text: opt.text,
                    isCorrect: opt.is_correct || false
                })),
                correctAnswer: q.correct_answer_value,
                explanation: q.explanation || ''
            };
        });

        onProgress?.(`Successfully extracted ${questions.length} questions with linked answers.`);
        return questions;

    } catch (error) {
        console.error("Extraction Failed:", error);
        onProgress?.(`Error: ${error.message}`);
        throw error;
    }
};

/**
 * Helper to convert File object to Base64 string for Gemini
 */
const fileToGenerativePart = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
