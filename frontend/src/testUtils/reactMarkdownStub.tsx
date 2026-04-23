import type {FC, ReactNode} from "react";

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

const ReactMarkdownStub: FC<StubProps> = ({children}) => {
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
