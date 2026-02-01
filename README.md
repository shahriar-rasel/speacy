# Speacy Realtime Tutor Prototype

This is a minimal Next.js prototype that connects to OpenAI Realtime via WebRTC,
logs raw events, and displays student transcripts.

## Setup

1. Create a `.env.local` file with your OpenAI API key:

```
OPENAI_API_KEY=sk-...
```

2. Install dependencies and run the dev server:

```
npm install
npm run dev
```

3. Visit `http://localhost:3000` and start a session.

## Logs

Raw events are saved as JSON lines in:

```
data/realtime-events/<sessionId>.jsonl
```

Each line contains:

```
{ "ts": 123456789, "direction": "server", "event": { ... } }
```

## Reports

When the tutor completes the assessment, a report is generated in:

```
data/reports/<sessionId>.json
```

The report includes the parsed transcript, the tutor's internal assessment, and a
backend-generated summary.
