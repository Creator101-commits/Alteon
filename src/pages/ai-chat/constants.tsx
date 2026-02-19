import React from "react";
import { Eye, Brain } from "lucide-react";

export const STARTER_PROMPTS = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "get deep research insights",
    prompt: "I need deep research insights on this topic. Can you provide comprehensive analysis and findings?"
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: "solve",
    prompt: "I need help solving a problem. Can you work through this step by step with me?"
  }
];

export const SYSTEM_PROMPT_SUFFIX = `

**Advanced Formatting Guidelines:**
- Use **bold** for important terms and key concepts
- Use *italics* for emphasis and definitions
- Use \`inline code\` for technical terms, commands, or formulas
- Use code blocks with syntax highlighting for multi-line code:
  \`\`\`python
  def hello_world():
      print("Hello, World!")
  \`\`\`
- Use # ## ### for headings to organize long responses
- Use numbered lists (1. 2. 3.) for sequential steps
- Use bullet points (- * •) for feature lists
- Use > blockquotes for important definitions or key concepts
- Use tables for comparisons or data:
  | Feature | Description | Example |
  |---------|-------------|---------|
  | Bold | **text** | **Important** |
- Use --- for section breaks
- Use checklists - [ ] for tasks or troubleshooting steps
- Use emoji appropriately for warnings (), tips (), success (), etc.
- Use $$math$$ for mathematical equations: $$E = mc^2$$
- Use inline math: $\\alpha + \\beta = \\gamma$
- Create Mermaid diagrams for flowcharts, sequence diagrams, etc:
  \`\`\`mermaid
  graph TD
      A[Start] --> B{Decision}
      B -->|Yes| C[Action 1]
      B -->|No| D[Action 2]
  \`\`\`
- Create callout boxes with emoji + **title** for important information:
   **Pro Tip**
  Content here
  
**Supported Programming Languages for Syntax Highlighting:**
JavaScript, TypeScript, Python, Java, C++, C#, PHP, Ruby, Go, Rust, SQL, JSON, YAML, HTML, CSS, SCSS, JSX, TSX, Vue, Svelte, Swift, Kotlin, Dart, R, MATLAB, LaTeX, Bash, Docker, Git, and many more.

**Mermaid Diagram Types:**
- Flowcharts: \`\`\`mermaid graph TD\`\`\`
- Sequence diagrams: \`\`\`mermaid sequenceDiagram\`\`\`
- Class diagrams: \`\`\`mermaid classDiagram\`\`\`
- Gantt charts: \`\`\`mermaid gantt\`\`\`
- Pie charts: \`\`\`mermaid pie\`\`\`
- Git graphs: \`\`\`mermaid gitGraph\`\`\`

Structure your responses with clear headings, proper spacing, and logical flow. Make complex topics easy to understand through good formatting. Use the advanced features to create rich, educational content.`;
