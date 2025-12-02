import fetch from "node-fetch";
import { v4 as uuid } from "uuid";
import type { Assignment, Flashcard, Note } from "@shared/schema";
import type { EducationalAssets, ParsedDocumentContent } from "../types";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface GenerateAssetsInput {
  jobId: string;
  userId: string;
  document: ParsedDocumentContent;
}

const DEFAULT_MODEL = "llama-3.1-8b-instant";
const PREMIUM_MODEL = "llama-3.1-70b-versatile";
const MAX_CONTEXT_SLICE = 12_000;

export async function generateEducationalAssets(input: GenerateAssetsInput): Promise<EducationalAssets> {
  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  const serializedDocument = serializeDocument(input.document);
  const basePrompt = buildBasePrompt(serializedDocument);

  if (!apiKey) {
    return buildFallbackAssets(input, serializedDocument);
  }

  const usePremiumModel = serializedDocument.length > MAX_CONTEXT_SLICE / 2;

  const [notes, flashcards, studyGuide, assignments, chatSummary] = await Promise.all([
    callGroq(apiKey, basePrompt + NOTES_PROMPT, usePremiumModel ? PREMIUM_MODEL : DEFAULT_MODEL),
    callGroq(apiKey, basePrompt + FLASHCARD_PROMPT, DEFAULT_MODEL),
    callGroq(apiKey, basePrompt + STUDY_GUIDE_PROMPT, usePremiumModel ? PREMIUM_MODEL : DEFAULT_MODEL),
    callGroq(apiKey, basePrompt + ASSIGNMENT_PROMPT, DEFAULT_MODEL),
    callGroq(apiKey, basePrompt + CHAT_SUMMARY_PROMPT, DEFAULT_MODEL),
  ]);

  return {
    notes: parseNotes(notes, input),
    flashcards: parseFlashcards(flashcards, input),
    studyGuides: parseStudyGuides(studyGuide, input),
    assignments: parseAssignments(assignments, input),
    chatSummary: parseChatSummary(chatSummary, input),
  };
}

async function callGroq(apiKey: string, prompt: string, model: string): Promise<string> {
  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are Alteon, an educational AI that produces impeccably accurate learning assets aligned with student success.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices?.[0]?.message?.content ?? "";
  } catch (error) {
    console.warn("AI generation failed; falling back to deterministic assets", error);
    return "";
  }
}

function serializeDocument(document: ParsedDocumentContent): string {
  const combinedBlocks = document.textBlocks.map((block) => `${block.heading ?? ""}\n${block.content}`).join("\n\n");
  return combinedBlocks.slice(0, MAX_CONTEXT_SLICE);
}

function buildBasePrompt(serialized: string): string {
  return `You will receive extracted document content. Produce outputs that are privacy-safe, accurate, and formatted using Markdown.

<document>${serialized}</document>
`;
}

const NOTES_PROMPT = `
Create hierarchical study notes. Use Markdown headings (##, ###) to mirror the document structure. Highlight key concepts, definitions, examples, and prerequisite knowledge.
`;

const FLASHCARD_PROMPT = `
Generate flashcards as a JSON array ONLY. Do not include any explanatory text, just output the JSON array.
Format: [{"question": "...", "answer": "...", "difficulty": "easy|medium|hard"}]
Mix factual recall, conceptual understanding, application, and multi-step reasoning.
IMPORTANT: Output ONLY valid JSON array, no other text.
`;

const STUDY_GUIDE_PROMPT = `
Design a study guide. Provide sections with objectives, prerequisite reminders, and suggested study sequences. Include cross-references between concepts.
`;

const ASSIGNMENT_PROMPT = `
Suggest assignments in JSON array form ONLY. Do not include any explanatory text, just output the JSON array.
Format: [{"title": "...", "description": "...", "dueInDays": 7, "category": "reading|practice|discussion|assessment", "estimatedMinutes": 30}]
IMPORTANT: Output ONLY valid JSON array, no other text.
`;

const CHAT_SUMMARY_PROMPT = `
Provide a bullet list of five insightful questions a student might ask and concise answers referencing the document.
`;

function buildFallbackAssets(input: GenerateAssetsInput, serialized: string): EducationalAssets {
  const sampleId = uuid();
  const preview = serialized.slice(0, 500);

  return {
    notes: [
      {
        id: uuid(),
        userId: input.userId,
        title: `Highlights from ${input.document.metadata.title ?? "uploaded document"}`,
        content: `# Key Takeaways\n\n${preview}\n\n*Generated via offline pipeline fallback.*`,
        classId: null,
        category: "study",
        tags: [],
        isPinned: false,
        color: "#ffffff",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    flashcards: [
      {
        id: uuid(),
        userId: input.userId,
        deckId: null,
        classId: null,
        cardType: "basic",
        front: "What are the primary concepts introduced in the uploaded document?",
        back: preview,
        clozeText: null,
        clozeIndex: null,
        difficulty: "medium",
        lastReviewed: null,
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        easeFactor: 250,
        interval: 0,
        maturityLevel: "new",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    studyGuides: [
      {
        id: sampleId,
        title: "Preliminary Study Guide",
        outline: [
          {
            heading: "Overview",
            summary: preview,
            references: [],
          },
        ],
        recommendedSchedule: [
          { dayOffset: 0, activity: "Skim the document", durationMinutes: 20 },
          { dayOffset: 1, activity: "Summarize key sections", durationMinutes: 30 },
        ],
      },
    ],
    assignments: [],
    chatSummary: {
      conversationId: uuid(),
      highlights: ["Offline fallback active. Provide a Groq API key to unlock advanced analysis."],
    },
  };
}

function parseNotes(content: string, input: GenerateAssetsInput): Note[] {
  if (!content) {
    return buildFallbackAssets(input, serializeDocument(input.document)).notes;
  }

  return [
    {
      id: uuid(),
      userId: input.userId,
      title: input.document.metadata.title || "AI Study Notes",
      content,
      classId: null,
      category: "study",
      tags: [],
      isPinned: false,
      color: "#ffffff",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

function parseFlashcards(content: string, input: GenerateAssetsInput): Flashcard[] {
  try {
    // Extract JSON from markdown code blocks if present
    let jsonContent = content.trim();
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    } else if (jsonContent.startsWith('[') === false) {
      // Try to find JSON array in the content
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonContent = arrayMatch[0];
      }
    }
    
    const parsed = JSON.parse(jsonContent) as Array<{ question: string; answer: string; difficulty?: string }>;
    if (!Array.isArray(parsed)) throw new Error("Invalid flashcard payload");
    return parsed.map((card) => ({
      id: uuid(),
      userId: input.userId,
      deckId: null,
      classId: null,
      cardType: "basic",
      front: card.question,
      back: card.answer,
      clozeText: null,
      clozeIndex: null,
      difficulty: (card.difficulty as "easy" | "medium" | "hard") || "medium",
      lastReviewed: null,
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      easeFactor: 250,
      interval: 0,
      maturityLevel: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  } catch (error) {
    console.warn("Unable to parse AI flashcards", error);
    return buildFallbackAssets(input, serializeDocument(input.document)).flashcards;
  }
}

function parseStudyGuides(content: string, input: GenerateAssetsInput) {
  if (!content) {
    return buildFallbackAssets(input, serializeDocument(input.document)).studyGuides;
  }

  const id = uuid();
  return [
    {
      id,
      title: input.document.metadata.title ? `${input.document.metadata.title} Study Guide` : "AI Study Guide",
      outline: content
        .split(/\n\n+/)
        .map((section) => ({
          heading: section.split("\n")[0] || "Section",
          summary: section,
          references: [],
        })),
      recommendedSchedule: [
        { dayOffset: 0, activity: "Review study guide", durationMinutes: 25 },
        { dayOffset: 1, activity: "Practice flashcards", durationMinutes: 20 },
        { dayOffset: 2, activity: "Attempt assignments", durationMinutes: 30 },
      ],
    },
  ];
}

function parseAssignments(content: string, input: GenerateAssetsInput): Assignment[] {
  if (!content) {
    return [];
  }

  try {
    // Extract JSON from markdown code blocks if present
    let jsonContent = content.trim();
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    } else if (jsonContent.startsWith('[') === false) {
      // Try to find JSON array in the content
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonContent = arrayMatch[0];
      }
    }
    
    const parsed = JSON.parse(jsonContent) as Array<{
      title: string;
      description: string;
      dueInDays?: number;
      category: string;
      durationMinutes?: number;
    }>;

    if (!Array.isArray(parsed)) throw new Error("Invalid assignment payload");

    return parsed.map((assignment) => ({
      id: uuid(),
      userId: input.userId,
      classId: null,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueInDays ? new Date(Date.now() + assignment.dueInDays * 24 * 60 * 60 * 1000) : null,
      status: "pending",
      priority: "medium",
      isCustom: true,
      source: "document_ai",
      syncStatus: "synced",
      googleClassroomId: null,
      googleCalendarId: null,
      createdAt: new Date(),
      completedAt: null,
    }));
  } catch (error) {
    console.warn("Unable to parse AI assignment suggestions", error);
    return [];
  }
}

function parseChatSummary(content: string, input: GenerateAssetsInput) {
  if (!content) {
    return {
      conversationId: uuid(),
      highlights: ["Ask Alteon AI follow-up questions once the Groq API key is configured."],
    };
  }

  const highlights = content
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  return {
    conversationId: uuid(),
    highlights,
  };
}
