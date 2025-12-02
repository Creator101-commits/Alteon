import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBoardContext } from '@/contexts/BoardContext';
import { useUIContext } from '@/contexts/UIContext';

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

export const BoardDialog: React.FC = () => {
  const { createBoard, updateBoard } = useBoardContext();
  const { isBoardDialogOpen, editingBoard, closeBoardDialog } = useUIContext();

  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [customColor, setCustomColor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isBoardDialogOpen && editingBoard) {
      setTitle(editingBoard.title);
      setSelectedColor(editingBoard.background || PRESET_COLORS[0]);
    } else {
      setTitle('');
      setSelectedColor(PRESET_COLORS[0]);
      setCustomColor('');
    }
  }, [isBoardDialogOpen, editingBoard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const background = customColor || selectedColor;
      
      if (editingBoard) {
        await updateBoard(editingBoard.id, { title: title.trim(), background });
      } else {
        await createBoard(title.trim(), background);
      }
      
      closeBoardDialog();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isBoardDialogOpen} onOpenChange={closeBoardDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingBoard ? 'Edit Board' : 'Create New Board'}
            </DialogTitle>
            <DialogDescription>
              {editingBoard
                ? 'Update your board settings'
                : 'Create a new board to organize your tasks'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Board Name */}
            <div className="space-y-2">
              <Label htmlFor="title">Board Name</Label>
              <Input
                id="title"
                placeholder="e.g., CS 101, Personal Projects, Homework"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/100 characters
              </p>
            </div>

            {/* Background Color */}
            <div className="space-y-3">
              <Label>Background Color</Label>
              
              {/* Preset Colors */}
              <div className="grid grid-cols-8 gap-2">
                {PRESET_COLORS.map((color) => (
                  <motion.button
                    key={color}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      w-10 h-10 rounded-lg cursor-pointer
                      ring-offset-2
                      ${selectedColor === color && !customColor
                        ? 'ring-2 ring-primary'
                        : 'hover:ring-2 hover:ring-primary/50'
                      }
                    `}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setSelectedColor(color);
                      setCustomColor('');
                    }}
                  />
                ))}
              </div>

              {/* Custom Color */}
              <div className="space-y-2">
                <Label htmlFor="customColor" className="text-sm">
                  Or choose custom color
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="customColor"
                    type="color"
                    value={customColor || selectedColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-20 h-10 p-1 cursor-pointer"
                  />
                  {customColor && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomColor('')}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div
                className="h-24 rounded-lg flex items-center justify-center text-white font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${customColor || selectedColor}ee 0%, ${customColor || selectedColor}88 100%)`
                }}
              >
                {title || 'Board Preview'}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeBoardDialog}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : editingBoard
                ? 'Update Board'
                : 'Create Board'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
