import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ExportData {
  version: string;
  exportDate: string;
  user: {
    email?: string;
    name?: string;
    uid: string;
  };
  data: {
    habits: any[];
    notes: any[];
    tasks: any[];
    flashcards: any[];
    journal: any[];
    settings: any;
    calendar: any[];
    analytics: any;
  };
}

export interface ImportOptions {
  overwrite?: boolean;
  merge?: boolean;
  skipConflicts?: boolean;
}

export const useDataPortability = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const exportAllData = async (): Promise<ExportData> => {
    if (!user) throw new Error('No user logged in');

    const exportData: ExportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      user: {
        email: user.email || undefined,
        name: user.displayName || undefined,
        uid: user.uid
      },
      data: {
        habits: JSON.parse(localStorage.getItem(`habits_${user.uid}`) || '[]'),
        notes: JSON.parse(localStorage.getItem(`notes_${user.uid}`) || '[]'),
        tasks: JSON.parse(localStorage.getItem(`tasks_${user.uid}`) || '[]'),
        flashcards: JSON.parse(localStorage.getItem(`flashcards_${user.uid}`) || '[]'),
        journal: JSON.parse(localStorage.getItem(`journal_${user.uid}`) || '[]'),
        settings: JSON.parse(localStorage.getItem(`settings_${user.uid}`) || '{}'),
        calendar: JSON.parse(localStorage.getItem(`calendar_${user.uid}`) || '[]'),
        analytics: JSON.parse(localStorage.getItem(`analytics_${user.uid}`) || '{}'),
      }
    };

    return exportData;
  };

  const exportToJSON = async (): Promise<void> => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alteon-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your data has been exported as a JSON file.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data.",
        variant: "destructive"
      });
    }
  };

  const exportToCSV = async (dataType: keyof ExportData['data']): Promise<void> => {
    try {
      const allData = await exportAllData();
      const data = allData.data[dataType];

      if (!Array.isArray(data) || data.length === 0) {
        toast({
          title: "No Data Found",
          description: `No ${dataType} data to export.`,
          variant: "destructive"
        });
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alteon-${dataType}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "CSV Exported",
        description: `Your ${dataType} data has been exported as a CSV file.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: `There was an error exporting ${dataType} data.`,
        variant: "destructive"
      });
    }
  };

  const importFromJSON = async (file: File, options: ImportOptions = {}): Promise<void> => {
    try {
      if (!user) throw new Error('No user logged in');

      const text = await file.text();
      const importData: ExportData = JSON.parse(text);

      // Validate import data structure
      if (!importData.version || !importData.data) {
        throw new Error('Invalid export file format');
      }

      const { overwrite = false, merge = true } = options;

      // Import each data type
      Object.entries(importData.data).forEach(([key, value]) => {
        if (!value) return;

        const storageKey = `${key}_${user.uid}`;
        
        if (overwrite) {
          localStorage.setItem(storageKey, JSON.stringify(value));
        } else if (merge) {
          const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
          
          if (Array.isArray(existing) && Array.isArray(value)) {
            // Merge arrays, avoiding duplicates based on id
            const merged = [...existing];
            value.forEach(item => {
              if (!item.id || !existing.find(e => e.id === item.id)) {
                merged.push(item);
              }
            });
            localStorage.setItem(storageKey, JSON.stringify(merged));
          } else {
            // For objects, merge properties
            const merged = { ...existing, ...value };
            localStorage.setItem(storageKey, JSON.stringify(merged));
          }
        }
      });

      toast({
        title: "Data Imported",
        description: "Your data has been successfully imported.",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "There was an error importing your data. Please check the file format.",
        variant: "destructive"
      });
    }
  };

  const importFromCSV = async (file: File, dataType: keyof ExportData['data']): Promise<void> => {
    try {
      if (!user) throw new Error('No user logged in');

      const text = await file.text();
      const lines = text.split('\n');
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least headers and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        return obj;
      }).filter(row => Object.values(row).some(val => val)); // Remove empty rows

      const storageKey = `${dataType}_${user.uid}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Add unique IDs if not present
      const dataWithIds = data.map(item => ({
        ...item,
        id: item.id || `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));

      // Merge with existing data
      const merged = [...existing, ...dataWithIds];
      localStorage.setItem(storageKey, JSON.stringify(merged));

      toast({
        title: "CSV Imported",
        description: `Your ${dataType} data has been imported successfully.`,
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "There was an error importing the CSV file.",
        variant: "destructive"
      });
    }
  };

  const clearAllData = (): void => {
    if (!user) return;

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(user.uid)) {
        localStorage.removeItem(key);
      }
    });

    toast({
      title: "Data Cleared",
      description: "All your local data has been deleted.",
    });
  };

  const getDataSummary = () => {
    if (!user) return null;

    const summary = {
      habits: JSON.parse(localStorage.getItem(`habits_${user.uid}`) || '[]').length,
      notes: JSON.parse(localStorage.getItem(`notes_${user.uid}`) || '[]').length,
      tasks: JSON.parse(localStorage.getItem(`tasks_${user.uid}`) || '[]').length,
      flashcards: JSON.parse(localStorage.getItem(`flashcards_${user.uid}`) || '[]').length,
      journal: JSON.parse(localStorage.getItem(`journal_${user.uid}`) || '[]').length,
    };

    return summary;
  };

  return {
    exportAllData,
    exportToJSON,
    exportToCSV,
    importFromJSON,
    importFromCSV,
    clearAllData,
    getDataSummary
  };
};
