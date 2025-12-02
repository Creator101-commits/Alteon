import { createRequire } from "module";
import { v4 as uuid } from "uuid";
import type { ParsedDocumentContent } from "../types";

const require = createRequire(import.meta.url);
const { read, utils } = require("xlsx") as typeof import("xlsx");

export async function parseXlsx(buffer: Buffer): Promise<ParsedDocumentContent> {
  const workbook = read(buffer, { type: "buffer", cellFormula: true, cellHTML: true, cellNF: true });
  const textBlocks: ParsedDocumentContent["textBlocks"] = [];
  const tables: ParsedDocumentContent["tables"] = [];
  const equations: ParsedDocumentContent["equations"] = [];

  (workbook.SheetNames as string[]).forEach((sheetName: string, worksheetIndex: number) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return;
    }

    const jsonRows = utils.sheet_to_json(worksheet, { header: 1, raw: true }) as unknown[][];
    const stringifiedTable = jsonRows.map((row: unknown[]) => row.map((cell: unknown) => formatCell(cell)) as string[]);

    tables.push({
      id: uuid(),
      title: `${sheetName} (Worksheet ${worksheetIndex + 1})`,
      rows: stringifiedTable,
    });

    const sheetSummary = stringifiedTable
      .map((row: string[]) => row.join(" | "))
      .filter(Boolean)
      .slice(0, 20)
      .join("\n");

    textBlocks.push({
      id: uuid(),
      heading: sheetName,
      content: sheetSummary,
    });

    Object.keys(worksheet)
      .filter((cellId) => cellId.startsWith("!") === false)
      .forEach((cellId) => {
        const cell = worksheet[cellId];
        if (cell?.f) {
          equations.push({
            id: uuid(),
            latex: cell.f,
          });
        }
      });
  });

  return {
    kind: "xlsx",
    textBlocks,
    images: [],
    tables,
    metadata: {
      worksheetCount: workbook.SheetNames.length,
    },
    equations,
  hierarchy: (workbook.SheetNames as string[]).map((name: string, index: number) => ({
      id: uuid(),
      level: 1,
      title: `${index + 1}. ${name}`,
    })),
  };
}

function formatCell(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "string") return cell.trim();
  if (typeof cell === "number") return cell.toString();
  if (typeof cell === "boolean") return cell ? "Yes" : "No";
  if (cell instanceof Date) return cell.toISOString();
  if (Array.isArray(cell)) return cell.map((item) => formatCell(item)).join(", ");
  if (typeof cell === "object") return JSON.stringify(cell);
  return String(cell);
}
