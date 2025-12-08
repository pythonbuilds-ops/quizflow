import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const MathText = ({ text }) => {
    if (!text) return null;

    // Split text by LaTeX delimiters:
    // $$...$$ for block math
    // $...$ for inline math
    // \[...\] for block math
    // \(...\) for inline math
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\(.*?\\\))/g);

    const cleanMath = (str) => str.replace(/–/g, '-');

    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    return <BlockMath key={index} math={cleanMath(part.slice(2, -2))} />;
                } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                    return <BlockMath key={index} math={cleanMath(part.slice(2, -2))} />;
                } else if (part.startsWith('$') && part.endsWith('$')) {
                    return <InlineMath key={index} math={cleanMath(part.slice(1, -1))} />;
                } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
                    return <InlineMath key={index} math={cleanMath(part.slice(2, -2))} />;
                } else {
                    return <span key={index}>{part}</span>;
                }
            })}
        </span>
    );
};

export default MathText;
