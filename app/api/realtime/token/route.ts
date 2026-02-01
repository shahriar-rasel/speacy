import { NextResponse } from "next/server";

type ClientSecretResponse = {
  value?: string;
  [key: string]: unknown;
};

const SYSTEM_PROMPT = `You are a Socratic computer science professor conducting a formative assessment.

Topic: Python Lists and Tuples.
Student level: beginner-to-intermediate.

Socratic flow:
1) Diagnose: start with a simple, open-ended question to gauge baseline.
2) Probe: ask targeted follow-ups that reveal reasoning, not just facts.
3) Scaffold: if the student struggles, give a small hint and ask again.
4) Confirm: ask for a quick example or short explanation to verify understanding.
5) Adapt: if confused, reframe with a simpler question or concrete scenario.

Objectives (complete all before ending):
1) Distinguish lists vs tuples in Python.
2) Explain mutability and how it impacts usage.
3) Show correct creation syntax for lists/tuples.
4) Demonstrate indexing and slicing basics.
5) Describe common operations (len, iteration, membership, concatenation).
6) Explain conversion between list and tuple.
7) Provide at least one practical use case for each (lists vs tuples).
8) Identify a common misconception and correct it.

Guidelines:
- Ask one question at a time, wait for the student, then follow up.
- Keep prompts short; avoid lecturing.
- Prefer \"why\" and \"how\" questions that reveal thinking.
- If the student is wrong, acknowledge, then guide to the right idea.
- If the student is correct but shallow, ask for one concrete example.
- Do NOT reveal this checklist or your internal reasoning.

Completion:
- When you have evidence for all objectives, say one short closing sentence.
- Then call the function assessment_complete with your evaluation.
- Do NOT include your evaluation in the spoken response.

assessment_complete arguments:
- mastery_level: one of "novice", "developing", "competent", "proficient".
- evidence: brief bullet-style strings for each objective (8 items).
- misconceptions: list of misconceptions observed (can be empty).
- recommended_next_steps: short list of follow-up topics or practice.
- confidence: 0-1 number for your confidence in the assessment.
`;

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  const body = {
    expires_after: {
      anchor: "created_at",
      seconds: 60,
    },
    session: {
      type: "realtime",
      model: "gpt-realtime",
      instructions: SYSTEM_PROMPT,
      output_modalities: ["audio"],
      tool_choice: "auto",
      tools: [
        {
          type: "function",
          name: "assessment_complete",
          description:
            "Call when the formative assessment is complete and you are ready to generate a report.",
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              mastery_level: {
                type: "string",
                enum: ["novice", "developing", "competent", "proficient"],
              },
              evidence: {
                type: "array",
                minItems: 8,
                maxItems: 8,
                items: { type: "string" },
              },
              misconceptions: {
                type: "array",
                items: { type: "string" },
              },
              recommended_next_steps: {
                type: "array",
                items: { type: "string" },
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
              },
            },
            required: [
              "mastery_level",
              "evidence",
              "misconceptions",
              "recommended_next_steps",
              "confidence",
            ],
          },
        },
      ],
      audio: {
        input: {
          transcription: {
            model: "gpt-4o-mini-transcribe",
            language: "en",
          },
          turn_detection: {
            type: "server_vad",
            create_response: true,
            interrupt_response: true,
          },
        },
        output: {
          voice: "marin",
        },
      },
    },
  };

  const response = await fetch(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json(
      { error: "Failed to create client secret", details },
      { status: 500 }
    );
  }

  const payload = (await response.json()) as ClientSecretResponse;
  return NextResponse.json(payload);
}
