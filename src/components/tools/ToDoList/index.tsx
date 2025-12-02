import React from 'react';
import { Loader2 } from 'lucide-react';
import { BoardProvider, useBoardContext } from '@/contexts/BoardContext';
import { UIProvider } from '@/contexts/UIContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { KanbanView } from './KanbanView';
import { CardDetailModal } from './CardDetailModal';
import { BoardDialog } from './BoardDialog';

const ToDoListContent: React.FC = () => {
  const { loading, error } = useBoardContext();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your to-do boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <KanbanView />
        </div>
      </div>

      {/* Modals */}
      <CardDetailModal />
      <BoardDialog />
    </div>
  );
};

export const ToDoList: React.FC = () => {
  return (
    <BoardProvider>
      <UIProvider>
        <ToDoListContent />
      </UIProvider>
    </BoardProvider>
  );
};
