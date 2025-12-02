import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DragItem {
  id: string;
  type: string;
  data: any;
  index?: number;
}

interface DropZone {
  id: string;
  type: string;
  accepts: string[];
  onDrop: (item: DragItem, index?: number) => void;
}

interface DragState {
  isDragging: boolean;
  draggedItem: DragItem | null;
  draggedOver: string | null;
  dropZones: Map<string, DropZone>;
}

interface DashboardWidget {
  id: string;
  type: 'calendar' | 'assignments' | 'habits' | 'notes' | 'pomodoro' | 'analytics' | 'flashcards';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  config?: Record<string, any>;
  isVisible: boolean;
}

interface DashboardLayout {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  gridSize: { cols: number; rows: number };
  lastModified: Date;
}

export const useDragAndDrop = () => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    draggedOver: null,
    dropZones: new Map(),
  });

  const [dashboardLayouts, setDashboardLayouts] = useState<DashboardLayout[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<string>('default');
  const { user } = useAuth();
  const { toast } = useToast();

  const dragRef = useRef<HTMLElement | null>(null);
  const dragPreview = useRef<HTMLElement | null>(null);

  // Drag and Drop Core Functions
  const startDrag = useCallback((item: DragItem, event: React.DragEvent) => {
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedItem: item,
    }));

    // Set drag data
    event.dataTransfer.setData('application/json', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'move';

    // Create custom drag preview
    if (dragPreview.current) {
      event.dataTransfer.setDragImage(dragPreview.current, 0, 0);
    }
  }, []);

  const endDrag = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      draggedItem: null,
      draggedOver: null,
    }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dropZoneId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    setDragState(prev => ({
      ...prev,
      draggedOver: dropZoneId,
    }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropZoneId: string, index?: number) => {
    e.preventDefault();
    
    try {
      const item: DragItem = JSON.parse(e.dataTransfer.getData('application/json'));
      const dropZone = dragState.dropZones.get(dropZoneId);
      
      if (dropZone && dropZone.accepts.includes(item.type)) {
        dropZone.onDrop(item, index);
        
        toast({
          title: 'Item Moved',
          description: `Successfully moved ${item.type} to ${dropZone.id}`,
        });
      }
    } catch (error) {
      console.error('Drop failed:', error);
      toast({
        title: 'Drop Failed',
        description: 'Could not complete the drop operation.',
        variant: 'destructive',
      });
    }
    
    endDrag();
  }, [dragState.dropZones, endDrag, toast]);

  // Drop zone registration
  const registerDropZone = useCallback((dropZone: DropZone) => {
    setDragState(prev => ({
      ...prev,
      dropZones: new Map(prev.dropZones).set(dropZone.id, dropZone),
    }));

    return () => {
      setDragState(prev => {
        const newDropZones = new Map(prev.dropZones);
        newDropZones.delete(dropZone.id);
        return {
          ...prev,
          dropZones: newDropZones,
        };
      });
    };
  }, []);

  // Dashboard Widget Management
  const createDashboardLayout = useCallback((name: string): DashboardLayout => {
    const newLayout: DashboardLayout = {
      id: `layout-${Date.now()}`,
      name,
      widgets: [],
      gridSize: { cols: 12, rows: 8 },
      lastModified: new Date(),
    };

    setDashboardLayouts(prev => [...prev, newLayout]);
    
    // Save to localStorage
    const savedLayouts = JSON.parse(localStorage.getItem(`dashboard_layouts_${user?.uid}`) || '[]');
    savedLayouts.push(newLayout);
    localStorage.setItem(`dashboard_layouts_${user?.uid}`, JSON.stringify(savedLayouts));

    return newLayout;
  }, [user?.uid]);

  const addWidgetToDashboard = useCallback((
    layoutId: string,
    widget: Omit<DashboardWidget, 'id' | 'position'>
  ) => {
    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}`,
      position: { x: 0, y: 0 }, // Will be positioned by grid system
    };

    setDashboardLayouts(prev => prev.map(layout =>
      layout.id === layoutId
        ? {
            ...layout,
            widgets: [...layout.widgets, newWidget],
            lastModified: new Date(),
          }
        : layout
    ));

    // Update localStorage
    const savedLayouts = JSON.parse(localStorage.getItem(`dashboard_layouts_${user?.uid}`) || '[]');
    const updatedLayouts = savedLayouts.map((layout: DashboardLayout) =>
      layout.id === layoutId
        ? {
            ...layout,
            widgets: [...layout.widgets, newWidget],
            lastModified: new Date(),
          }
        : layout
    );
    localStorage.setItem(`dashboard_layouts_${user?.uid}`, JSON.stringify(updatedLayouts));

    return newWidget;
  }, [user?.uid]);

  const moveWidget = useCallback((
    layoutId: string,
    widgetId: string,
    newPosition: { x: number; y: number }
  ) => {
    setDashboardLayouts(prev => prev.map(layout =>
      layout.id === layoutId
        ? {
            ...layout,
            widgets: layout.widgets.map(widget =>
              widget.id === widgetId
                ? { ...widget, position: newPosition }
                : widget
            ),
            lastModified: new Date(),
          }
        : layout
    ));

    // Update localStorage
    const savedLayouts = JSON.parse(localStorage.getItem(`dashboard_layouts_${user?.uid}`) || '[]');
    const updatedLayouts = savedLayouts.map((layout: DashboardLayout) =>
      layout.id === layoutId
        ? {
            ...layout,
            widgets: layout.widgets.map((widget: DashboardWidget) =>
              widget.id === widgetId
                ? { ...widget, position: newPosition }
                : widget
            ),
            lastModified: new Date(),
          }
        : layout
    );
    localStorage.setItem(`dashboard_layouts_${user?.uid}`, JSON.stringify(updatedLayouts));
  }, [user?.uid]);

  const removeWidget = useCallback((layoutId: string, widgetId: string) => {
    setDashboardLayouts(prev => prev.map(layout =>
      layout.id === layoutId
        ? {
            ...layout,
            widgets: layout.widgets.filter(widget => widget.id !== widgetId),
            lastModified: new Date(),
          }
        : layout
    ));

    // Update localStorage
    const savedLayouts = JSON.parse(localStorage.getItem(`dashboard_layouts_${user?.uid}`) || '[]');
    const updatedLayouts = savedLayouts.map((layout: DashboardLayout) =>
      layout.id === layoutId
        ? {
            ...layout,
            widgets: layout.widgets.filter((widget: DashboardWidget) => widget.id !== widgetId),
            lastModified: new Date(),
          }
        : layout
    );
    localStorage.setItem(`dashboard_layouts_${user?.uid}`, JSON.stringify(updatedLayouts));
  }, [user?.uid]);

  const resizeWidget = useCallback((
    layoutId: string,
    widgetId: string,
    newSize: 'small' | 'medium' | 'large'
  ) => {
    setDashboardLayouts(prev => prev.map(layout =>
      layout.id === layoutId
        ? {
            ...layout,
            widgets: layout.widgets.map(widget =>
              widget.id === widgetId
                ? { ...widget, size: newSize }
                : widget
            ),
            lastModified: new Date(),
          }
        : layout
    ));
  }, []);

  // Grid positioning helpers
  const getGridPosition = useCallback((
    mouseX: number,
    mouseY: number,
    containerRect: DOMRect,
    gridSize: { cols: number; rows: number }
  ) => {
    const cellWidth = containerRect.width / gridSize.cols;
    const cellHeight = containerRect.height / gridSize.rows;
    
    const relativeX = mouseX - containerRect.left;
    const relativeY = mouseY - containerRect.top;
    
    return {
      x: Math.floor(relativeX / cellWidth),
      y: Math.floor(relativeY / cellHeight),
    };
  }, []);

  const checkCollision = useCallback((
    layout: DashboardLayout,
    widgetId: string,
    position: { x: number; y: number },
    size: { width: number; height: number }
  ): boolean => {
    return layout.widgets.some(widget => {
      if (widget.id === widgetId) return false; // Don't check collision with self
      
      const widgetSize = getWidgetSize(widget.size);
      const widgetEnd = {
        x: widget.position.x + widgetSize.width,
        y: widget.position.y + widgetSize.height,
      };
      
      const newEnd = {
        x: position.x + size.width,
        y: position.y + size.height,
      };
      
      return !(
        position.x >= widgetEnd.x ||
        newEnd.x <= widget.position.x ||
        position.y >= widgetEnd.y ||
        newEnd.y <= widget.position.y
      );
    });
  }, []);

  const getWidgetSize = useCallback((size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small':
        return { width: 2, height: 2 };
      case 'medium':
        return { width: 4, height: 3 };
      case 'large':
        return { width: 6, height: 4 };
      default:
        return { width: 4, height: 3 };
    }
  }, []);

  // Auto-arrange widgets
  const autoArrangeWidgets = useCallback((layoutId: string) => {
    const layout = dashboardLayouts.find(l => l.id === layoutId);
    if (!layout) return;

    const sortedWidgets = [...layout.widgets].sort((a, b) => 
      getWidgetSize(b.size).width * getWidgetSize(b.size).height -
      getWidgetSize(a.size).width * getWidgetSize(a.size).height
    );

    let currentX = 0;
    let currentY = 0;
    let maxRowHeight = 0;

    const arrangedWidgets = sortedWidgets.map(widget => {
      const widgetSize = getWidgetSize(widget.size);
      
      // Check if widget fits in current row
      if (currentX + widgetSize.width > layout.gridSize.cols) {
        currentX = 0;
        currentY += maxRowHeight;
        maxRowHeight = 0;
      }
      
      const newPosition = { x: currentX, y: currentY };
      currentX += widgetSize.width;
      maxRowHeight = Math.max(maxRowHeight, widgetSize.height);
      
      return {
        ...widget,
        position: newPosition,
      };
    });

    setDashboardLayouts(prev => prev.map(l =>
      l.id === layoutId
        ? { ...l, widgets: arrangedWidgets, lastModified: new Date() }
        : l
    ));

    toast({
      title: 'Widgets Arranged',
      description: 'Dashboard widgets have been automatically arranged.',
    });
  }, [dashboardLayouts, getWidgetSize, toast]);

  // Load saved layouts
  const loadSavedLayouts = useCallback(() => {
    if (!user?.uid) return;
    
    const savedLayouts = JSON.parse(localStorage.getItem(`dashboard_layouts_${user.uid}`) || '[]');
    
    if (savedLayouts.length === 0) {
      // Create default layout
      const defaultLayout = createDashboardLayout('Default');
      setActiveDashboard(defaultLayout.id);
    } else {
      setDashboardLayouts(savedLayouts);
      if (!savedLayouts.find((l: DashboardLayout) => l.id === activeDashboard)) {
        setActiveDashboard(savedLayouts[0].id);
      }
    }
  }, [user?.uid, createDashboardLayout, activeDashboard]);

  // Touch support for mobile drag and drop
  const handleTouchStart = useCallback((item: DragItem, e: React.TouchEvent) => {
    e.preventDefault();
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedItem: item,
    }));
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!dragState.isDragging || !dragState.draggedItem) return;

    const touch = e.touches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (elementBelow) {
      const dropZoneId = elementBelow.getAttribute('data-drop-zone-id');
      if (dropZoneId) {
        setDragState(prev => ({
          ...prev,
          draggedOver: dropZoneId,
        }));
      }
    }
  }, [dragState.isDragging, dragState.draggedItem]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!dragState.isDragging || !dragState.draggedItem) return;

    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (elementBelow) {
      const dropZoneId = elementBelow.getAttribute('data-drop-zone-id');
      if (dropZoneId) {
        const dropZone = dragState.dropZones.get(dropZoneId);
        if (dropZone && dropZone.accepts.includes(dragState.draggedItem.type)) {
          dropZone.onDrop(dragState.draggedItem);
        }
      }
    }

    endDrag();
  }, [dragState, endDrag]);

  // Draggable component wrapper
  const useDraggable = useCallback((item: DragItem) => {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => startDrag(item, e),
      onDragEnd: endDrag,
      onTouchStart: (e: React.TouchEvent) => handleTouchStart(item, e),
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      style: {
        cursor: dragState.isDragging && dragState.draggedItem?.id === item.id ? 'grabbing' : 'grab',
        opacity: dragState.isDragging && dragState.draggedItem?.id === item.id ? 0.5 : 1,
        transform: dragState.isDragging && dragState.draggedItem?.id === item.id ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.2s ease',
      },
    };
  }, [startDrag, endDrag, handleTouchStart, handleTouchMove, handleTouchEnd, dragState]);

  // Droppable component wrapper
  const useDroppable = useCallback((dropZone: DropZone) => {
    useEffect(() => {
      const cleanup = registerDropZone(dropZone);
      return cleanup;
    }, [dropZone.id]);

    const isOver = dragState.draggedOver === dropZone.id;
    const canDrop = dragState.draggedItem ? dropZone.accepts.includes(dragState.draggedItem.type) : false;

    return {
      'data-drop-zone-id': dropZone.id,
      onDragOver: (e: React.DragEvent) => handleDragOver(e, dropZone.id),
      onDrop: (e: React.DragEvent) => handleDrop(e, dropZone.id),
      style: {
        backgroundColor: isOver && canDrop ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        border: isOver && canDrop ? '2px dashed #3b82f6' : '2px dashed transparent',
        transition: 'all 0.2s ease',
      },
      className: `${isOver && canDrop ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`,
    };
  }, [dragState, registerDropZone, handleDragOver, handleDrop]);

  // Grid layout utilities
  const snapToGrid = useCallback((
    position: { x: number; y: number },
    gridSize: { cols: number; rows: number },
    containerSize: { width: number; height: number }
  ) => {
    const cellWidth = containerSize.width / gridSize.cols;
    const cellHeight = containerSize.height / gridSize.rows;
    
    return {
      x: Math.round(position.x / cellWidth) * cellWidth,
      y: Math.round(position.y / cellHeight) * cellHeight,
    };
  }, []);

  const getGridCell = useCallback((
    position: { x: number; y: number },
    containerSize: { width: number; height: number },
    gridSize: { cols: number; rows: number }
  ) => {
    const cellWidth = containerSize.width / gridSize.cols;
    const cellHeight = containerSize.height / gridSize.rows;
    
    return {
      col: Math.floor(position.x / cellWidth),
      row: Math.floor(position.y / cellHeight),
    };
  }, []);

  // Sortable list functionality
  const useSortable = useCallback(<T extends { id: string }>(
    items: T[],
    onReorder: (newItems: T[]) => void
  ) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
      setDraggedIndex(index);
      startDrag({
        id: items[index].id,
        type: 'sortable-item',
        data: items[index],
        index,
      }, e);
    }, [items, startDrag]);

    const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
      e.preventDefault();
      if (draggedIndex === null) return;

      if (index !== draggedIndex) {
        const newItems = [...items];
        const draggedItem = newItems.splice(draggedIndex, 1)[0];
        newItems.splice(index, 0, draggedItem);
        onReorder(newItems);
        setDraggedIndex(index);
      }
    }, [draggedIndex, items, onReorder]);

    const handleDragEnd = useCallback(() => {
      setDraggedIndex(null);
      endDrag();
    }, [endDrag]);

    return {
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      draggedIndex,
    };
  }, [startDrag, endDrag]);

  // Export/Import dashboard layouts
  const exportDashboardLayout = useCallback((layoutId: string) => {
    const layout = dashboardLayouts.find(l => l.id === layoutId);
    if (!layout) return null;

    const exportData = {
      layout,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    // Create downloadable file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${layout.name.replace(/\s+/g, '-').toLowerCase()}-layout.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Layout Exported',
      description: `Dashboard layout "${layout.name}" has been exported.`,
    });

    return exportData;
  }, [dashboardLayouts, toast]);

  const importDashboardLayout = useCallback((file: File) => {
    return new Promise<DashboardLayout>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);
          
          if (!importData.layout || importData.version !== '1.0') {
            throw new Error('Invalid layout file format');
          }

          const newLayout: DashboardLayout = {
            ...importData.layout,
            id: `layout-${Date.now()}`,
            name: `${importData.layout.name} (Imported)`,
            lastModified: new Date(),
          };

          setDashboardLayouts(prev => [...prev, newLayout]);
          
          // Save to localStorage
          const savedLayouts = JSON.parse(localStorage.getItem(`dashboard_layouts_${user?.uid}`) || '[]');
          savedLayouts.push(newLayout);
          localStorage.setItem(`dashboard_layouts_${user?.uid}`, JSON.stringify(savedLayouts));

          toast({
            title: 'Layout Imported',
            description: `Dashboard layout "${newLayout.name}" has been imported successfully.`,
          });

          resolve(newLayout);
        } catch (error) {
          toast({
            title: 'Import Failed',
            description: 'Could not import dashboard layout. Please check the file format.',
            variant: 'destructive',
          });
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }, [user?.uid, toast]);

  // Initialize with default layout
  useEffect(() => {
    if (user?.uid && dashboardLayouts.length === 0) {
      loadSavedLayouts();
    }
  }, [user?.uid, dashboardLayouts.length, loadSavedLayouts]);

  return {
    // Drag state
    dragState,
    
    // Core drag and drop
    useDraggable,
    useDroppable,
    startDrag,
    endDrag,
    registerDropZone,
    
    // Dashboard management
    dashboardLayouts,
    activeDashboard,
    setActiveDashboard,
    createDashboardLayout,
    addWidgetToDashboard,
    moveWidget,
    removeWidget,
    resizeWidget,
    autoArrangeWidgets,
    
    // Grid utilities
    snapToGrid,
    getGridPosition,
    getGridCell,
    checkCollision,
    getWidgetSize,
    
    // Sortable lists
    useSortable,
    
    // Import/Export
    exportDashboardLayout,
    importDashboardLayout,
    loadSavedLayouts,
  };
};
