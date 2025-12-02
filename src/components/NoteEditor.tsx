import { useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Save,
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Trash2,
  Pin,
  PinOff,
  Moon,
  Sun,
  Strikethrough,
  Type,
  ChevronDown,
} from "lucide-react";
import DOMPurify from "dompurify";
import type { Note, InsertNote, Class } from "../../shared/schema";

const noteCategories = [
  "general",
  "lecture",
  "homework",
  "study",
  "meeting",
  "ideas",
  "research",
  "project",
];

// Available fonts for the editor
const FONTS = [
  { name: "Default", value: "" },
  { name: "Inter", value: "Inter" },
  { name: "Georgia", value: "Georgia" },
  { name: "Times New Roman", value: "Times New Roman" },
  { name: "Arial", value: "Arial" },
  { name: "Verdana", value: "Verdana" },
  { name: "Courier New", value: "Courier New" },
  { name: "Comic Sans MS", value: "Comic Sans MS" },
  { name: "Trebuchet MS", value: "Trebuchet MS" },
  { name: "Impact", value: "Impact" },
  { name: "Palatino", value: "Palatino Linotype" },
];

// Toolbar Button Component
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded-lg transition-all duration-150 ease-in-out
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          isActive
            ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }
      `}
    >
      {children}
    </button>
  );
}

// Toolbar Divider
function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

// Editor Toolbar Component
interface EditorToolbarProps {
  editor: Editor | null;
}

function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex justify-center w-full p-2 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 overflow-x-auto">
      <div className="flex flex-wrap items-center gap-0.5">
      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Font Family Selector */}
      <div className="relative">
        <select
          value={editor.getAttributes("textStyle").fontFamily || ""}
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().setFontFamily(e.target.value).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
          className="h-8 pl-2 pr-7 text-xs rounded-lg bg-transparent border border-border text-foreground cursor-pointer hover:bg-muted focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
          title="Font Family"
        >
          {FONTS.map((font) => (
            <option
              key={font.name}
              value={font.value}
              style={{ fontFamily: font.value || "inherit" }}
            >
              {font.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
      </div>

      <ToolbarDivider />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      </div>
    </div>
  );
}

interface NoteEditorProps {
  note?: Note;
  onSave: (noteData: Partial<InsertNote>) => Promise<void>;
  onClose: () => void;
  classes: Class[];
}

export default function NoteEditor({
  note,
  onSave,
  onClose,
  classes,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || "");
  const [category, setCategory] = useState(note?.category || "general");
  const [classId, setClassId] = useState(note?.classId ? note.classId : "none");
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  // Initialize Tiptap editor with error handling
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Start writing your note...",
      }),
    ],
    content: note?.content || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "max-w-none focus:outline-none min-h-[300px] text-foreground",
      },
    },
  });

  // Track content changes for auto-save
  const [contentChanged, setContentChanged] = useState(false);

  // Set up editor update listener
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      setContentChanged(true);
    };
    
    editor.on('update', handleUpdate);
    
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  // Auto-save functionality
  useEffect(() => {
    if (!editor || !note?.id) return;
    if (!contentChanged && !title) return;

    const hasContent = title.trim() || editor.getText().trim();

    if (!hasContent) return;

    const autoSaveTimer = setTimeout(() => {
      handleAutoSave();
      setContentChanged(false);
    }, 3000);

    return () => clearTimeout(autoSaveTimer);
  }, [title, contentChanged, note?.id]);

  const handleAutoSave = async () => {
    if (!note?.id || !editor) return;

    const htmlContent = editor.getHTML();
    const sanitizedContent = DOMPurify.sanitize(htmlContent);

    if (!title.trim() && !sanitizedContent.replace(/<[^>]*>/g, "").trim())
      return;

    try {
      await onSave({
        title: title || "Untitled Note",
        content: sanitizedContent,
        category,
        classId: classId === "none" ? undefined : classId,
        isPinned,
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  const handleManualSave = async () => {
    if (!editor) return;

    const htmlContent = editor.getHTML();
    const sanitizedContent = DOMPurify.sanitize(htmlContent);

    try {
      setIsSaving(true);
      await onSave({
        title: title || "Untitled Note",
        content: sanitizedContent,
        category,
        classId: classId === "none" ? undefined : classId,
        isPinned,
      });
      setLastSaved(new Date());
      toast({
        title: "Saved",
        description: "Note saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearNote = useCallback(() => {
    if (!editor) return;

    setTitle("");
    editor.commands.clearContent();
    toast({
      title: "Cleared",
      description: "Note content has been cleared",
    });
  }, [editor, toast]);

  // Show loading state while editor initializes
  if (!editor) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span>Notes</span>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {title || "Untitled"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pin Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPinned(!isPinned)}
            className={isPinned ? "text-amber-500" : "text-muted-foreground"}
            title={isPinned ? "Unpin note" : "Pin note"}
          >
            {isPinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </Button>

          {/* Clear Note */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearNote}
            className="text-muted-foreground hover:text-destructive"
            title="Clear note"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          {/* Save Button */}
          <Button onClick={handleManualSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isSaving ? "Saving..." : "Save"}
            </span>
          </Button>
        </div>
      </header>

      {/* Main Content Area - Full Screen */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Toolbar - Sticky at top */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <EditorToolbar editor={editor} />
        </div>

        {/* Full Width Editor */}
        <div className="flex-1 px-6 sm:px-12 lg:px-20 py-8">
          {/* Title Input */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="text-3xl sm:text-4xl font-bold border-none bg-transparent p-0 mb-8 focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/40 max-w-4xl"
          />

          {/* Tiptap Editor - Full Height */}
          <div className="max-w-4xl min-h-[calc(100vh-300px)]">
            <EditorContent editor={editor} className="min-h-full" />
          </div>
        </div>

        {/* Footer with Metadata */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-6 sm:px-12 lg:px-20 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground max-w-4xl">
            <div className="flex items-center gap-4">
              {/* Category Select */}
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-card border-border">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {noteCategories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Class Select */}
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-card border-border">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    No class
                  </SelectItem>
                  {classes
                    .filter((cls) => cls.id && cls.id.trim() !== "")
                    .map((cls) => (
                      <SelectItem key={cls.id} value={cls.id} className="text-xs">
                        {cls.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Last Saved */}
            <div className="flex items-center gap-2">
              {isSaving && (
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Saving...
                </span>
              )}
              {lastSaved && !isSaving && (
                <span>Last saved {lastSaved.toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
