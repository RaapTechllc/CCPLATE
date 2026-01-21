"use client";

import { Highlight, themes } from "prism-react-renderer";

interface CodeBlockProps {
  code: string;
  language?: "typescript" | "prisma" | "json" | "bash" | "tsx";
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({ 
  code, 
  language = "typescript", 
  showLineNumbers = true,
  className = ""
}: CodeBlockProps) {
  return (
    <Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
      {({ className: preClassName, style, tokens, getLineProps, getTokenProps }) => (
        <pre 
          className={`${preClassName} ${className} overflow-auto rounded-lg p-4 text-sm`}
          style={style}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {showLineNumbers && (
                <span className="inline-block w-8 text-right mr-4 text-gray-500 select-none">
                  {i + 1}
                </span>
              )}
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
