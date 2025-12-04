
if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to extract questions');
}

const data = await response.json();

if (onProgress) {
    onProgress(`Extracted ${data.total_questions} questions from ${data.total_pages} pages`);
}

// Convert backend format to frontend format
return data.questions.map(q => ({
    id: Date.now() + Math.random(),
    text: q.question_text,
    image: q.image_base64 ? `data:image/png;base64,${q.image_base64}` : null,
    multiSelect: false,
    options: q.options.map((optText, idx) => ({
        id: idx + 1,
        text: optText,
        image: null,
        isCorrect: false
    }))
}));

    } catch (error) {
    console.error('API Error:', error);
    throw error;
}
};

export const checkAPIHealth = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        return response.ok;
    } catch {
        return false;
    }
};
