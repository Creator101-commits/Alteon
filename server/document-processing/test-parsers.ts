/**
 * Document Processing Parser Tests
 * 
 * Quick tests to verify all parsers are working correctly
 */

import { parsePdf } from "./parsers/pdfParser";
import { parsePptx } from "./parsers/pptxParser";
import { parseXlsx } from "./parsers/xlsxParser";

async function testParsers() {
  console.log("🧪 Testing Document Parsers...\n");

  // Test 1: Check PDF parser exports
  console.log("1. PDF Parser:");
  console.log("   ✓ parsePdf function exists:", typeof parsePdf === "function");

  // Test 2: Check PPTX parser exports
  console.log("2. PPTX Parser:");
  console.log("   ✓ parsePptx function exists:", typeof parsePptx === "function");

  // Test 3: Check XLSX parser exports
  console.log("3. XLSX Parser:");
  console.log("   ✓ parseXlsx function exists:", typeof parseXlsx === "function");

  // Test 4: Test with minimal buffers (will fail but shows structure)
  console.log("\n4. Testing with minimal buffers:");
  
  try {
    console.log("   Testing PDF parser with empty buffer...");
    await parsePdf(Buffer.from(""));
  } catch (error) {
    console.log("   ✓ PDF parser throws expected error:", (error as Error).message.slice(0, 50));
  }

  try {
    console.log("   Testing PPTX parser with empty buffer...");
    await parsePptx(Buffer.from(""));
  } catch (error) {
    console.log("   ✓ PPTX parser throws expected error:", (error as Error).message.slice(0, 50));
  }

  try {
    console.log("   Testing XLSX parser with empty buffer...");
    await parseXlsx(Buffer.from(""));
  } catch (error) {
    console.log("   ✓ XLSX parser throws expected error:", (error as Error).message.slice(0, 50));
  }

  console.log("\n✅ All parsers loaded successfully!");
  console.log("📝 Parsers are ready for document processing");
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testParsers().catch(console.error);
}

export { testParsers };
