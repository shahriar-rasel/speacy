
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import { Bot, User as UserIcon } from "lucide-react";

interface Message {
  role: string;
  content: string;
}

interface TranscriptProps {
  messages: Message[];
}

export function Transcript({ messages }: TranscriptProps) {
  return (
    <div className="flex flex-col gap-6 p-2">
      {messages.map((msg, idx) => {
        const isUser = msg.role === "user";
        return (
          <div
            key={idx}
            className={clsx(
              "flex gap-4 w-full group",
              isUser ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg border border-white/10 mt-1",
              isUser
                ? "bg-gradient-to-br from-secondary to-blue-600 text-white"
                : "bg-gradient-to-br from-zinc-800 to-black text-primary"
            )}>
              {isUser ? <UserIcon size={14} strokeWidth={2.5} /> : <Bot size={16} />}
            </div>

            {/* Message Bubble */}
            <div
              className={clsx(
                "max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-lg backdrop-blur-sm transition-all duration-300",
                isUser
                  ? "bg-secondary/10 border border-secondary/20 text-white rounded-tr-none hover:bg-secondary/20"
                  : "bg-white/5 border border-white/10 text-zinc-200 rounded-tl-none hover:bg-white/10"
              )}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
