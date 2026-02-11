import clsx from "clsx";

interface CodePanelProps {
    code: string;
    language: string;
    isEditable?: boolean;
    onChange?: (code: string) => void;
    className?: string;
}

export function CodePanel({
    code,
    language,
    isEditable = false,
    onChange,
    className,
}: CodePanelProps) {
    return (
        <div className={clsx("flex flex-col bg-[#1e1e1e] text-zinc-100", className)}>
            <div className="flex items-center justify-between border-b border-zinc-800 bg-[#252526] px-4 py-2 text-xs font-medium text-zinc-400">
                <span className="uppercase">{language}</span>
                {isEditable && <span className="text-zinc-500">Editable</span>}
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed">
                {isEditable ? (
                    <textarea
                        value={code}
                        onChange={(e) => onChange?.(e.target.value)}
                        className="h-full w-full resize-none border-none bg-transparent p-0 text-zinc-300 focus:ring-0 outline-none"
                        spellCheck={false}
                    />
                ) : (
                    <pre className="whitespace-pre-wrap">{code}</pre>
                )}
            </div>
        </div>
    );
}
