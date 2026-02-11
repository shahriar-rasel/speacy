
import clsx from "clsx";
import { Terminal, Copy, Sparkles } from "lucide-react";

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
        <div className={clsx("flex flex-col rounded-xl overflow-hidden glass-card", className)}>
            {/* Retro-Modern Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-sm" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-sm" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-sm" />
                    </div>
                    <div className="h-4 w-[1px] bg-white/10 mx-1" />
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                        <Terminal size={14} className="text-secondary" />
                        <span>editor.exe</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 bg-white/5 px-2 py-1 rounded border border-white/5">
                        {language}
                    </span>
                    {isEditable && (
                        <span className="flex items-center gap-1 text-[10px] text-accent animate-pulse">
                            <Sparkles size={10} />
                            EDIT MODE
                        </span>
                    )}
                </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed custom-scrollbar relative">
                {/* Line Numbers Background */}
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-white/2 border-r border-white/5 pointer-events-none" />

                <div className="pl-8 relative z-10">
                    {isEditable ? (
                        <textarea
                            value={code}
                            onChange={(e) => onChange?.(e.target.value)}
                            className="w-full h-[calc(100vh-200px)] resize-none bg-transparent p-0 text-zinc-300 focus:outline-none placeholder-zinc-700 selection:bg-primary/30"
                            spellCheck={false}
                        />
                    ) : (
                        <pre className="whitespace-pre-wrap text-zinc-300">{code}</pre>
                    )}
                </div>
            </div>

            {/* Footer Status Bar */}
            <div className="px-4 py-1.5 bg-black/40 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-600 font-mono">
                <span>UTF-8</span>
                <span>{code.length} chars</span>
            </div>
        </div>
    );
}
