import { createRequire } from "module";
import type { ParsedDocumentContent } from "../types";
import { v4 as uuid } from "uuid";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function parsePdf(buffer: Buffer): Promise<ParsedDocumentContent> {
  const data = await pdfParse(buffer);

  const textBlocks: ParsedDocumentContent["textBlocks"] = [];
  const hierarchy: ParsedDocumentContent["hierarchy"] = [];
  const tables: ParsedDocumentContent["tables"] = [];
  const equations: ParsedDocumentContent["equations"] = [];
  const images: ParsedDocumentContent["images"] = [];

  // Split text into sections based on common heading patterns
  const lines = data.text.split("\n").filter((line: string) => line.trim());
  let currentSection = { heading: null as string | null, content: [] as string[] };

  lines.forEach((line: string) => {
    const trimmed = line.trim();
    
    // Detect headings: numbered (1., 1.1), ALL CAPS, or # markdown-style
    const isHeading = 
      /^\d+(\.\d+)*\.?\s+[A-Z]/.test(trimmed) || // 1. Title or 1.1 Title
      /^[A-Z][A-Z\s]{5,}$/.test(trimmed) ||        // ALL CAPS TITLE
      /^#{1,6}\s+/.test(trimmed);                  // # Markdown heading

    if (isHeading && trimmed.length < 100) {
      // Save previous section
      if (currentSection.content.length > 0) {
        textBlocks.push({
          id: uuid(),
          heading: currentSection.heading,
          content: currentSection.content.join("\n"),
        });
      }

      // Start new section
      const heading = trimmed.replace(/^#{1,6}\s+/, "");
      currentSection = { heading, content: [] };

      // Add to hierarchy
      const level = trimmed.startsWith("#") 
        ? trimmed.split("#").length - 1 
        : trimmed.match(/^\d+\./) ? 1 : 2;

      hierarchy.push({
        id: uuid(),
        level,
        title: heading,
      });
    } else {
      currentSection.content.push(trimmed);
    }

    // Detect tables
    if (/\b(Table|TABLE)\s+\d+/i.test(trimmed)) {
      tables.push({
        id: uuid(),
        title: trimmed,
        rows: [],
      });
    }

    // Detect equations (LaTeX-like patterns)
    const eqMatches = trimmed.match(/[=∑∫∏π√±×÷]/g);
    if (eqMatches && eqMatches.length >= 2) {
      equations.push({
        id: uuid(),
        latex: trimmed,
      });
    }
  });

  // Save last section
  if (currentSection.content.length > 0) {
    textBlocks.push({
      id: uuid(),
      heading: currentSection.heading,
      content: currentSection.content.join("\n"),
    });
  }

  // If no sections were created, create one default section
  if (textBlocks.length === 0 && data.text) {
    textBlocks.push({
      id: uuid(),
      heading: null,
      content: data.text.slice(0, 5000), // First 5000 chars
    });
  }

  return {
    kind: "pdf",
    textBlocks,
    images,
    tables,
    metadata: {
      title: data.info?.Title || undefined,
      author: data.info?.Author || undefined,
      createdAt: data.info?.CreationDate || undefined,
      updatedAt: data.info?.ModDate || undefined,
      pageCount: data.numpages,
    },
    equations,
    hierarchy,
  };
}