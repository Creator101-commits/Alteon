import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useColorCustomization, BACKGROUND_THEMES } from '@/contexts/ColorCustomizationContext';
import { Eye, Moon, Sun } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ColorCustomizationSettings = () => {
  const { customization, updateCustomization, resetToDefault } = useColorCustomization();
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);

  const handleBackgroundThemeChange = (theme: string) => {
    updateCustomization({ backgroundTheme: theme as any });
  };

  const handleReset = () => {
    resetToDefault();
    toast({
      title: "Theme Reset",
      description: "Your theme has been reset to default.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Theme
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose your preferred theme
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs"
        >
          {showPreview ? 'Hide' : 'Show'} Preview
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="text-xs"
        >
          Reset
        </Button>
      </div>

      {/* Enhanced Preview */}
      {showPreview && (
        <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <Eye className="w-5 h-5" />
              Live Preview
            </CardTitle>
            <p className="text-muted-foreground">
              See how your theme looks in action
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="w-full h-12 text-base font-medium">Primary Action</Button>
              <Button variant="secondary" className="w-full h-12 text-base font-medium">Secondary Action</Button>
              <Button variant="outline" className="w-full h-12 text-base font-medium">Outline Action</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-2 text-lg">Sample Card</h4>
                <p className="text-muted-foreground mb-3">
                  This is how your content cards will appear with the selected theme.
                </p>
                <div className="flex gap-2">
                  <Button size="sm">Action</Button>
                  <Button size="sm" variant="outline">Cancel</Button>
                </div>
              </Card>
              
              <Card className="p-4 bg-muted/50">
                <h4 className="font-semibold mb-2 text-lg">Muted Card</h4>
                <p className="text-muted-foreground mb-3">
                  Secondary content areas use muted backgrounds for hierarchy.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary">Action</Button>
                  <Button size="sm" variant="ghost">Cancel</Button>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Theme Selection - Only Light and Dark */}
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(BACKGROUND_THEMES).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => handleBackgroundThemeChange(key)}
            className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
              customization.backgroundTheme === key 
                ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
                : 'border-border hover:border-primary/50'
            }`}
            style={{
              backgroundColor: theme.background,
              color: theme.foreground,
            }}
          >
            <div className="flex flex-col items-center gap-3">
              {key === 'dark' ? (
                <Moon className="w-8 h-8" />
              ) : (
                <Sun className="w-8 h-8" />
              )}
              <span className="text-lg font-medium">{theme.name}</span>
            </div>
            {customization.backgroundTheme === key && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
