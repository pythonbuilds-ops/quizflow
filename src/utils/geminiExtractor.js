import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Extracts questions, sections, diagrams, and links answer keys from an entire PDF.
 * Uses Gemini 1.5 Pro with a large context window.
 * * @param {File} file - The PDF file object from the input.
 * @param {string} apiKey - Your Google Gemini API Key.
 * @param {function} onProgress - Callback for status updates.
 */
export const extractQuestionsWithGemini = async (file, _unusedApiKey, onProgress) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const MODEL_NAME = 'gemini-2.5-pro';

    const MODEL_NAME_ACTUAL = 'gemini-2.5-flash';

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

        function fixLatex(jsonText) {
            return jsonText
                // fix escaped LaTeX like \frac → \\frac
                .replace(/(?<!\\)\\([A-Za-z])/g, "\\\\$1")
                // fix \$ that Gemini sometimes outputs
                .replace(/(?<!\\)\$/g, "$")
                // remove trailing commas before ] or }
                .replace(/,\s*(\]|\})/g, "$1");
        }




        try {
            cleanJson = fixLatex(cleanJson);
            rawQuestions = JSON.parse(cleanJson);

        } catch (e) {
            console.error("JSON Parse Error:", e);
            throw new Error("Failed to parse Gemini response. Please try again.");
        }

        // Map to internal format
        const questions = (Array.isArray(rawQuestions) ? rawQuestions : [rawQuestions]).map((q, idx) => {
            const normalizedType = q.question_type ? q.question_type.toLowerCase() : 'mcq';

            // 1. Determine Correct Answer Value (robust check)
            let coreCorrectVal = q.correct_answer_value;
            if (coreCorrectVal === undefined || coreCorrectVal === null) coreCorrectVal = q.correct_answer;
            if (coreCorrectVal === undefined || coreCorrectVal === null) coreCorrectVal = q.answer;

            // Normalize to string list for checking
            const correctIds = new Set();
            if (Array.isArray(coreCorrectVal)) {
                coreCorrectVal.forEach(v => correctIds.add(String(v).trim().toUpperCase()));
            } else if (typeof coreCorrectVal === 'string') {
                coreCorrectVal.split(',').forEach(v => correctIds.add(String(v).trim().toUpperCase()));
            } else if (coreCorrectVal !== undefined && coreCorrectVal !== null) {
                correctIds.add(String(coreCorrectVal).toUpperCase());
            }

            // 2. Map Options & Sync isCorrect
            const mappedOptions = (q.options || []).map((opt, optIdx) => {
                const rawId = opt.id;
                const generatedId = String.fromCharCode(65 + optIdx); // A, B, C...
                const finalId = rawId || generatedId;

                // An option is correct if:
                // a) explicitly marked is_correct in JSON
                // b) its ID (raw or generated) matches the extracted correct value
                const explicitCorrect = opt.is_correct === true || String(opt.is_correct).toLowerCase() === 'true';
                const implicitCorrect = correctIds.has(String(finalId).toUpperCase()) || (rawId && correctIds.has(String(rawId).toUpperCase()));

                const isCorrect = explicitCorrect || implicitCorrect;

                // Return mapped option
                return {
                    id: finalId,
                    text: opt.text,
                    isCorrect: isCorrect
                };
            });

            // 3. Re-determine isMultiSelect based on actual correct options
            const correctOptionCount = mappedOptions.filter(o => o.isCorrect).length;
            const isMultiSelect = normalizedType === 'multimcq' || correctOptionCount > 1;

            // 4. Finalize correctAnswer string (Crucial for Frontend)
            // If we have mapped options with isCorrect, derive correctAnswer from them to be safe.
            // Otherwise fallback to the raw coreCorrectVal (for Integer type or unmatched cases).
            let finalCorrectAnswer = coreCorrectVal;

            if (mappedOptions.length > 0) {
                const derivedAnswers = mappedOptions.filter(o => o.isCorrect).map(o => o.id);
                if (derivedAnswers.length > 0) {
                    finalCorrectAnswer = derivedAnswers.join(', ');
                }
            }
            // For integer type, ensure we keep the raw value
            if (normalizedType === 'integer' && !finalCorrectAnswer) {
                finalCorrectAnswer = coreCorrectVal;
            }

            return {
                id: Date.now() + Math.random() + idx,
                section: q.section || 'General',
                questionNumber: q.question_number || (idx + 1).toString(),
                type: normalizedType === 'multimcq' ? 'mcq' : normalizedType,
                multiSelect: isMultiSelect,
                text: q.question_text || '',
                hasDiagram: q.has_diagram || false,
                options: mappedOptions,
                correctAnswer: finalCorrectAnswer, // Syncs with options or raw value
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
