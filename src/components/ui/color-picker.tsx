import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Palette, RotateCcw } from 'lucide-react';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
  showCustomInput?: boolean;
}

interface ColorSwatchProps {
  color: string;
  name: string;
  isSelected: boolean;
  onClick: () => void;
}

const ColorSwatch = ({ color, name, isSelected, onClick }: ColorSwatchProps) => (
  <div className="flex flex-col items-center gap-2">
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
        isSelected ? 'border-white ring-2 ring-offset-2 ring-offset-background' : 'border-border'
      }`}
      style={{ backgroundColor: color }}
    >
      {isSelected && <Check className="w-4 h-4 text-white mx-auto" />}
    </button>
    <span className="text-xs text-muted-foreground text-center">{name}</span>
  </div>
);

export const ColorPicker = ({ value, onChange, label, showCustomInput = true }: ColorPickerProps) => {
  const [customColor, setCustomColor] = useState(value || '#8b5cf6');
  const [isOpen, setIsOpen] = useState(false);

  const predefinedColors = [
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Emerald', value: '#059669' },
  ];

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
    setIsOpen(false);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <div 
              className="w-4 h-4 rounded border"
              style={{ backgroundColor: value || customColor }}
            />
            <Palette className="w-4 h-4" />
            {label || 'Choose Color'}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Predefined Colors</h4>
              <div className="grid grid-cols-6 gap-3">
                {predefinedColors.map((color) => (
                  <ColorSwatch
                    key={color.value}
                    color={color.value}
                    name={color.name}
                    isSelected={value === color.value}
                    onClick={() => handleColorSelect(color.value)}
                  />
                ))}
              </div>
            </div>
            
            {showCustomInput && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Custom Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="w-16 h-10 p-1 border rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    placeholder="#8b5cf6"
                    className="flex-1"
                  />
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface ThemeColorPickerProps {
  themes: Record<string, { name: string; background: string }>;
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
  label: string;
}

export const ThemeColorPicker = ({ themes, selectedTheme, onThemeChange, label }: ThemeColorPickerProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(themes).map(([key, theme]) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
              selectedTheme === key ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onThemeChange(key)}
          >
            <CardContent className="p-3">
              <div 
                className="w-full h-16 rounded mb-2 border"
                style={{ backgroundColor: theme.background }}
              />
              <div className="text-center">
                <p className="text-sm font-medium">{theme.name}</p>
                {selectedTheme === key && (
                  <Check className="w-4 h-4 text-primary mx-auto mt-1" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
