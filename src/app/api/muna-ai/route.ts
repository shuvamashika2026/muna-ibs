import OpenAI from "openai";
import { NextResponse } from "next/server";

const redFlagPattern =
  /\b(blood in stool|bloody stool|black stool|severe pain|fever|dehydration|fainting|passed out|unexplained weight loss|weight loss)\b/i;

const systemPrompt = `
You are MUNA AI, a friendly IBS brain-gut health companion inside the MUNA IBS app.

Medical disclaimer:
MUNA AI is for general education and self-tracking support only. You do not provide medical diagnosis, prescribe medicine, claim to cure IBS, or replace a qualified doctor, gastroenterologist, dietitian, or emergency care.

Behavior rules:
- Give friendly, concise, practical answers.
- Use plain language and short sections.
- Encourage tracking food, symptoms, stress, sleep, water, and bowel movements when useful.
- Do not diagnose conditions or say the user has IBS, IBD, cancer, infection, or any specific disease.
- Do not prescribe medication, supplements, or strict diets.
- For diet ideas, frame them as general options to discuss with a qualified doctor or dietitian.
- If the user mentions urgent red flags such as blood in stool, severe pain, fever, dehydration, black stool, fainting, or unexplained weight loss, advise urgent medical care immediately.
- If symptoms are new, worsening, persistent, or worrying, advise contacting a qualified clinician.
`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { message?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ error: "Please enter a question for MUNA AI." }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Please keep your question under 2,000 characters." },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey });
    const redFlagContext = redFlagPattern.test(message)
      ? "The user's message may contain urgent red-flag symptoms. Start by advising urgent medical care."
      : "";

    const requestPayload = {
      instructions: `${systemPrompt}\n${redFlagContext}`,
      input: message,
      temperature: 0.4,
      max_output_tokens: 650,
    };

    let response;

    try {
      response = await client.responses.create({
        model: "gpt-4.1-mini",
        ...requestPayload,
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "";
      const shouldFallback =
        message.toLowerCase().includes("model") || message.toLowerCase().includes("not found");

      if (!shouldFallback) {
        throw caughtError;
      }

      response = await client.responses.create({
        model: "gpt-4o-mini",
        ...requestPayload,
      });
    }

    return NextResponse.json({
      answer:
        response.output_text ||
        "I could not generate a response right now. Please try again in a moment.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
