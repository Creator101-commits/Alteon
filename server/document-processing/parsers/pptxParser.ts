import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { v4 as uuid } from "uuid";
import type { ParsedDocumentContent } from "../types";

const SLIDE_PATH = /ppt\/slides\/slide\d+\.xml$/;
const NOTES_PATH = /ppt\/notesSlides\/notesSlide\d+\.xml$/;
const MEDIA_PATH = /ppt\/media\//;

export async function parsePptx(buffer: Buffer): Promise<ParsedDocumentContent> {
  const zip = await JSZip.loadAsync(buffer);
  const textBlocks: ParsedDocumentContent["textBlocks"] = [];
  const hierarchy: ParsedDocumentContent["hierarchy"] = [];
  const images: ParsedDocumentContent["images"] = [];
  const tables: ParsedDocumentContent["tables"] = [];
  const equations: ParsedDocumentContent["equations"] = [];

  const slideFiles = Object.keys(zip.files).filter((name) => SLIDE_PATH.test(name));
  const noteFiles = new Map<string, string>();

  Object.keys(zip.files)
    .filter((name) => NOTES_PATH.test(name))
    .forEach((name) => noteFiles.set(name.replace("notesSlides/", "slides/"), name));

  for (const slideName of slideFiles.sort()) {
    const slideXml = await zip.files[slideName].async("string");
    const doc = new DOMParser().parseFromString(slideXml, "application/xml");

    const textElements = Array.from(doc.getElementsByTagName("a:t")) as Element[];

    const slideText = textElements.map((el: Element) => el.textContent?.trim() || "").filter(Boolean);
    const heading = slideText[0] || `Slide ${slideName.match(/(\d+)/)?.[1] || ""}`;

    textBlocks.push({
      id: uuid(),
      heading,
      content: slideText.slice(1).join("\n"),
    });

    hierarchy.push({
      id: uuid(),
      level: 1,
      title: heading,
    });

    const tableElements = Array.from(doc.getElementsByTagName("a:tbl")) as Element[];
    tableElements.forEach((tbl: Element, tblIndex: number) => {
      const rows = Array.from(tbl.getElementsByTagName("a:tr"))
        .map((row: Element) =>
          Array.from(row.getElementsByTagName("a:t"))
            .map((cell: Element) => cell.textContent?.trim() || "")
        );

      tables.push({
        id: uuid(),
        title: `${heading} - Table ${tblIndex + 1}`,
        rows,
      });
    });

    const notesName = noteFiles.get(slideName);
    if (notesName && zip.files[notesName]) {
      const noteXml = await zip.files[notesName].async("string");
      const noteDoc = new DOMParser().parseFromString(noteXml, "application/xml");
      const noteElements = Array.from(noteDoc.getElementsByTagName("a:t")) as Element[];
      const noteText = noteElements
        .map((el: Element) => el.textContent?.trim() || "")
        .filter(Boolean)
        .join("\n");

      if (noteText) {
        textBlocks.push({
          id: uuid(),
          heading: `${heading} (Notes)`,
          content: noteText,
        });
      }
    }
  }

  Object.keys(zip.files)
    .filter((name) => MEDIA_PATH.test(name))
    .forEach((name) => {
      images.push({
        id: uuid(),
        caption: name.split("/").pop() || "",
        dataUrl: undefined,
      });
    });

  return {
    kind: "pptx",
    textBlocks,
    images,
    tables,
    metadata: {
      slideCount: slideFiles.length,
      title: slideFiles.length ? textBlocks[0]?.heading ?? undefined : undefined,
    },
    equations,
    hierarchy,
  };
}
