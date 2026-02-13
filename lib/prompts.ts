/**
 * Centralized system prompts for Speacy.
 *
 * Every AI interaction (text-chat, OpenAI Realtime, Hume EVI, grading)
 * pulls its system instructions from here so there is exactly ONE
 * source of truth.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface ExaminerPromptOptions {
    /** The exam topic, e.g. "Lists and Tuples" */
    topic: string;
    /** Optional assignment description */
    description?: string;
    /** Question prompts the AI must cover */
    questions?: string[];
    /** Learning goals to assess */
    learningGoals?: string[];
}

// ─── Examiner Prompt ─────────────────────────────────────────────────

/**
 * Build the system prompt for the oral-exam AI examiner.
 *
 * Used by:
 *  - OpenAI Chat Completions  (app/api/chat/route.ts)
 *  - OpenAI Realtime Sessions (app/api/session/route.ts  +  assessment page)
 *  - Hume EVI                 (HumeVoiceWrapper via assessment page)
 */
export function buildExaminerPrompt(opts: ExaminerPromptOptions): string {
    const {
        topic,
        description = "A standard oral exam.",
        questions,
        learningGoals,
    } = opts;

    const goalsList =
        learningGoals && learningGoals.length > 0
            ? learningGoals.join("\n- ")
            : "Assess basic understanding.";

    const questionsList =
        questions && questions.length > 0
            ? questions.join("\n- ")
            : "Ask 3 fundamental questions about the topic.";

    return `You are a friendly but rigorous oral examiner. Your goal is to assess the student's understanding of the topic: ${topic}.
Description: ${description}

Learning Goals:
- ${goalsList}

Specific Questions you MUST cover (adapt as needed):
- ${questionsList}

INSTRUCTIONS:
1. BE CONCISE. Do not give long explanations. Ask questions directly.
2. Start by greeting the student and explaining the exam context.
3. Ask questions one by one.
4. Do NOT reveal the answers unless the student is completely stuck, and even then, be brief.
5. When the student has answered the questions or if they ask to stop, say "Thank you, the exam is complete" and IMMEDIATELY call the "end_assessment" tool.
6. Do not continue the conversation after calling the tool.`;
}

// ─── Grader Prompt ───────────────────────────────────────────────────

/**
 * Build the system prompt for the AI grader that evaluates an exam
 * transcript.
 *
 * Used by:
 *  - app/api/grade/route.ts
 */
export function buildGraderPrompt(): string {
    return `You are an expert oral exam grader. Analyze the transcript and the accompanying metadata.

Metadata contains 'latency' (ms delay before student answer). High latency (>3000ms) indicates hesitation.

Provide the output in JSON format with:
- score (0-100)
- fluency_score (0-100): Based on flow, lack of filler words (um, uh, like), and sentence structure.
- pacing_score (0-100): Based on appropriate response times (latency).
- feedback (general summary)
- strengths (array of strings)
- weaknesses (array of strings)
- nuances (array of strings, specific details missed/hit)`;
}
