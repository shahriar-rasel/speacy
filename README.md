# Speacy Realtime Tutor Prototype

This is a minimal Next.js prototype that connects to OpenAI Realtime via WebRTC,
logs raw events, and displays student transcripts.

## Setup

1. Create a `.env.local` file with your OpenAI API key:

```
OPENAI_API_KEY=sk-...
TEACHER_PASSWORD=change-me
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
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

## Teacher Dashboard

Visit `/teacher`, enter the `TEACHER_PASSWORD`, and browse reports by session ID.

## Supabase Auth

- Login: `/auth/login`
- Register: `/auth/register`
- Confirm link: `/auth/confirm`
- Instructor dashboard: `/dashboard`
