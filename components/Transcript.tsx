import clsx from "clsx";
import ReactMarkdown from "react-markdown";

interface Message {
  role: string;
  content: string;
}

interface TranscriptProps {
  messages: Message[];
}

export function Transcript({ messages }: TranscriptProps) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={clsx(
            "flex flex-col gap-1",
            msg.role === "user" ? "items-end" : "items-start"
          )}
        >
          <div
            className={clsx(
              "max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm",
              msg.role === "user"
                ? "bg-blue-600 text-white rounded-br-none"
                : "bg-zinc-800 text-zinc-300 rounded-bl-none"
            )}
          >
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}
