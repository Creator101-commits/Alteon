import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useBoardContext } from '@/contexts/BoardContext';
import { useUIContext } from '@/contexts/UIContext';
import { format } from 'date-fns';

export const CardDetailModal: React.FC = () => {
  const {
    updateCard,
    deleteCard
  } = useBoardContext();

  const {
    isCardModalOpen,
    selectedCard,
    closeCardModal
  } = useUIContext();

  const [title, setTitle] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  // Auto-save debounce
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedCard) {
      setTitle(selectedCard.title);
      setIsCompleted(selectedCard.isCompleted || false);
      setDueDate(selectedCard.dueDate ? new Date(selectedCard.dueDate) : undefined);
    }
  }, [selectedCard]);

  const handleSave = async () => {
    if (!selectedCard) return;

    await updateCard(selectedCard.id, {
      title,
      isCompleted,
      dueDate: dueDate || null
    });
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    
    // Debounce auto-save
    if (saveTimeout) clearTimeout(saveTimeout);
    setSaveTimeout(setTimeout(handleSave, 1000));
  };



  const handleDelete = async () => {
    if (!selectedCard) return;
    
    if (window.confirm('Delete this card? This cannot be undone.')) {
      await deleteCard(selectedCard.id);
      closeCardModal();
    }
  };

  const handleClose = async () => {
    // Clear any pending save timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      setSaveTimeout(null);
    }
    
    // Save any pending changes before closing
    await handleSave();
    
    // Close the modal
    closeCardModal();
  };

  if (!selectedCard) return null;

  return (
    <AnimatePresence>
      {isCardModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={closeCardModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-card z-50 shadow-2xl"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-border flex items-start justify-between">
                <div className="flex-1">
                  <Input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="text-2xl font-semibold border-none p-0 h-auto focus-visible:ring-0"
                    placeholder="Card title"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={async (checked) => {
                        const newCompleted = checked as boolean;
                        setIsCompleted(newCompleted);
                        // Save immediately with the new value
                        if (selectedCard) {
                          await updateCard(selectedCard.id, {
                            title,
                            isCompleted: newCompleted
                          });
                        }
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      Mark as complete
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeCardModal}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {/* Due Date */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4" />
                      Due Date
                    </Label>
                    <DateTimePicker
                      date={dueDate}
                      onDateChange={(date) => {
                        setDueDate(date);
                        // Auto-save due date change
                        if (saveTimeout) clearTimeout(saveTimeout);
                        setSaveTimeout(setTimeout(() => {
                          if (selectedCard) {
                            updateCard(selectedCard.id, {
                              title,
                              isCompleted,
                              dueDate: date || null
                            });
                          }
                        }, 500));
                      }}
                      placeholder="Set a due date"
                    />
                  </div>

                  {/* Metadata */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Created {selectedCard.createdAt ? format(new Date(selectedCard.createdAt), 'PPp') : 'Unknown'}
                    </p>
                    {selectedCard.updatedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last updated {format(new Date(selectedCard.updatedAt), 'PPp')}
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="p-6 border-t border-border flex justify-between">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                >
                  Delete Card
                </Button>
                <Button onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
