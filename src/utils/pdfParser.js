import * as pdfjsLib from 'pdfjs-dist';

// Set worker source to local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const parsePdfQuestions = async (file, onProgress) => {
    const log = (msg) => {
        console.log('[PDF Parser]', msg);
        if (onProgress) onProgress(msg);
    };

    try {
        log('Starting parse...');
        const arrayBuffer = await file.arrayBuffer();
        log('File loaded to buffer');

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        log(`PDF loaded. Pages: ${pdf.numPages}`);

        let allItems = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            log(`Processing page ${i}...`);
            const page = await pdf.getPage(i);

            // 1. Get Text Content
            const textContent = await page.getTextContent();
            let textItems = textContent.items.map(item => ({
                type: 'text',
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height,
                hasEOL: item.hasEOL
            }));
            log(`Page ${i}: Found ${textItems.length} text items`);

            // 2. Get Images (Safe Mode)
            let imageItems = [];
            try {
                const operatorList = await page.getOperatorList();
                const commonObjs = page.commonObjs;
                const objs = page.objs;

                for (let j = 0; j < operatorList.fnArray.length; j++) {
                    const fn = operatorList.fnArray[j];
                    const args = operatorList.argsArray[j];

                    if (fn === pdfjsLib.OPS.paintImageXObject) {
                        const imgName = args[0];

                        const getImgObj = () => new Promise((resolve) => {
                            if (objs.has(imgName)) {
                                objs.get(imgName, resolve);
                            } else if (commonObjs.has(imgName)) {
                                commonObjs.get(imgName, resolve);
                            } else {
                                resolve(null);
                            }
                        });

                        const imgObj = await getImgObj();

                        if (imgObj) {
                            const width = imgObj.width;
                            const height = imgObj.height;

                            // Skip very small images (icons, bullets)
                            if (width < 30 || height < 30) continue;

                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            const imgData = ctx.createImageData(width, height);

                            if (imgObj.kind === pdfjsLib.ImageKind.RGBA_32BPP) {
                                imgData.data.set(imgObj.data);
                            } else if (imgObj.kind === pdfjsLib.ImageKind.RGB_24BPP) {
                                let data = imgObj.data;
                                let i = 0, j = 0;
                                while (i < data.length) {
                                    imgData.data[j++] = data[i++];
                                    imgData.data[j++] = data[i++];
                                    imgData.data[j++] = data[i++];
                                    imgData.data[j++] = 255;
                                }
                            } else {
                                continue;
                            }

                            ctx.putImageData(imgData, 0, 0);

                            // Find position using transform matrix
                            let currentMatrix = [1, 0, 0, 1, 0, 0];
                            for (let k = j - 1; k >= 0; k--) {
                                if (operatorList.fnArray[k] === pdfjsLib.OPS.transform) {
                                    currentMatrix = operatorList.argsArray[k];
                                    break;
                                }
                            }

                            const imgX = currentMatrix[4];
                            const imgY = currentMatrix[5];
                            const imgWidth = currentMatrix[0] * width;
                            const imgHeight = currentMatrix[3] * height;

                            imageItems.push({
                                type: 'image',
                                src: canvas.toDataURL(),
                                x: imgX,
                                y: imgY,
                                width: imgWidth,
                                height: imgHeight
                            });
                        }
                    }
                }
                log(`Page ${i}: Found ${imageItems.length} images`);
            } catch (imgError) {
                log(`Page ${i}: Image extraction warning - ${imgError.message}`);
            }

            // 3. Filter out text that overlaps with images (likely OCR'd formula text)
            if (imageItems.length > 0) {
                const overlapsImage = (textItem) => {
                    return imageItems.some(img => {
                        // Check if text bounds overlap with image bounds (with some tolerance)
                        const textRight = textItem.x + (textItem.width || 50);
                        const textTop = textItem.y + (textItem.height || 10);
                        const imgRight = img.x + img.width;
                        const imgBottom = img.y - img.height; // PDF coords are flipped

                        // Check for overlap
                        const xOverlap = !(textItem.x > imgRight || textRight < img.x);
                        const yOverlap = !(textItem.y < imgBottom || textTop > img.y);

                        return xOverlap && yOverlap;
                    });
                };

                const beforeFilter = textItems.length;
                textItems = textItems.filter(item => {
                    // Only filter if it's a small fragment (likely formula text)
                    if (item.str.trim().length < 5) {
                        return !overlapsImage(item);
                    }
                    return true;
                });
                const filtered = beforeFilter - textItems.length;
                if (filtered > 0) {
                    log(`Page ${i}: Filtered ${filtered} overlapping text items`);
                }
            }

            // 4. Merge and Sort
            const pageItems = [...textItems, ...imageItems];
            pageItems.sort((a, b) => b.y - a.y || a.x - b.x);

            allItems = [...allItems, ...pageItems];
        }

        log('Parsing items to questions...');
        const questions = parseItemsToQuestions(allItems, log);
        log(`Found ${questions.length} questions`);
        return questions;

    } catch (e) {
        log(`CRITICAL ERROR: ${e.message}`);
        throw e;
    }
};

const parseItemsToQuestions = (items, log) => {
    const questions = [];
    let currentQuestion = null;
    let currentOption = null;

    // More permissive patterns for questions and options
    const isQuestionStart = (str) => {
        // Matches: "1)", "1.", "Q1", "Question 1", "(1)", etc.
        return /^(?:Q|Question|Ex|Example)?\s*\d+[\.)]/i.test(str) ||
            /^\(\d+\)/.test(str) ||
            /^\d+\s*[\.)]\s*[A-Z]/.test(str); // "1) A small mass..."
    };

    const isOptionStart = (str) => {
        // Matches: "a)", "a.", "(a)", "A)", "A.", "(A)", "i)", etc.
        // Also handle square root symbols and math: √, ∫, etc.
        return /^(?:[a-d]|[A-D]|[i-iv]+)[\.)]/i.test(str) ||
            /^\([a-d]\)/i.test(str);
    };

    items.forEach(item => {
        if (item.type === 'text') {
            let text = item.str.trim();
            if (!text) return;

            // Clean up common OCR artifacts
            text = text.replace(/\s+/g, ' '); // Normalize spaces

            if (isQuestionStart(text)) {
                // Save previous question
                if (currentQuestion) questions.push(currentQuestion);

                currentQuestion = {
                    id: Date.now() + Math.random(),
                    text: text,
                    image: null,
                    multiSelect: false,
                    options: []
                };
                currentOption = null;
            } else if (isOptionStart(text) && currentQuestion) {
                currentOption = {
                    id: Date.now() + Math.random(),
                    text: text,
                    image: null,
                    isCorrect: false
                };
                currentQuestion.options.push(currentOption);
            } else {
                // Continuation text
                if (currentOption) {
                    currentOption.text += ' ' + text;
                } else if (currentQuestion) {
                    currentQuestion.text += ' ' + text;
                }
            }
        } else if (item.type === 'image') {
            // Attach image to current context
            if (currentOption) {
                // If this looks like a formula/small image, attach to option
                if (!currentOption.image) currentOption.image = item.src;
            } else if (currentQuestion) {
                if (!currentQuestion.image) currentQuestion.image = item.src;
            }
        }
    });

    if (currentQuestion) questions.push(currentQuestion);

    // Clean and filter
    const validQuestions = questions.map(q => ({
        ...q,
        text: q.text.replace(/\s+/g, ' ').trim(),
        options: q.options.map(o => ({
            ...o,
            text: o.text.replace(/\s+/g, ' ').trim()
        }))
    })).filter(q => q.options.length >= 2);

    // Fallback mode
    if (validQuestions.length === 0 && items.length > 0) {
        log('Strict parsing failed. Attempting fallback mode...');

        const chunks = [];
        let currentChunk = { text: '', images: [] };

        items.forEach(item => {
            if (item.type === 'text') {
                const text = item.str.trim();
                if (!text) return;

                // New chunk on number start
                if (/^\d+[\.)]\s/.test(text)) {
                    if (currentChunk.text) chunks.push(currentChunk);
                    currentChunk = { text: text, images: [] };
                } else {
                    currentChunk.text += ' ' + text;
                }
            } else if (item.type === 'image') {
                currentChunk.images.push(item.src);
            }
        });
        if (currentChunk.text) chunks.push(currentChunk);

        return chunks.filter(c => c.text.length > 10).map(c => ({
            id: Date.now() + Math.random(),
            text: c.text.replace(/\s+/g, ' ').trim(),
            image: c.images[0] || null,
            multiSelect: false,
            options: [
                { id: 1, text: 'Option A', image: null, isCorrect: false },
                { id: 2, text: 'Option B', image: null, isCorrect: false },
                { id: 3, text: 'Option C', image: null, isCorrect: false },
                { id: 4, text: 'Option D', image: null, isCorrect: false }
            ]
        }));
    }

    return validQuestions;
};
