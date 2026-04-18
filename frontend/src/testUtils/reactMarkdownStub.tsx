import type { FC, ReactNode } from "react";

/**
 * Lightweight react-markdown replacement for Jest. The real package ships
 * ESM-only and ts-jest can't parse it without switching the whole repo to
 * ESM. The stub renders the markdown string with minimal parsing so tests
 * can assert on speaker headers (`**Alice (00:03):**` → bold) without
 * pulling the real renderer.
 */
interface StubProps {
  readonly children?: ReactNode;
}

const renderInline = (text: string, keyPrefix: string): ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${idx}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-${idx}`}>{part}</span>;
  });
};

const ReactMarkdownStub: FC<StubProps> = ({ children }) => {
  if (typeof children !== "string") {
    return <div>{children}</div>;
  }
  const lines = children.split("\n");
  return (
    <div>
      {lines.map((line, idx) => (
        <p key={`md-${idx}`}>{renderInline(line, `md-${idx}`)}</p>
      ))}
    </div>
  );
};

export default ReactMarkdownStub;
