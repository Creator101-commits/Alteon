import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorCustomizationSettings } from '@/components/ColorCustomizationSettings';
import { GoogleSyncSettings } from '@/components/GoogleSyncSettings';
import { HACSettings } from '@/components/HACSettings';
import { usePreferences } from '@/contexts/AppStateContext';
import { Palette, Settings as SettingsIcon, RefreshCw, User, PanelBottom, PanelLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

function NavigationStyleSelector() {
  const { preferences, updatePreferences } = usePreferences();
  const currentStyle = preferences.navigationStyle || 'dock';

  const handleStyleChange = (style: 'dock' | 'sidebar') => {
    updatePreferences({ navigationStyle: style });
    localStorage.setItem('navigationStyle', style);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PanelBottom className="h-5 w-5" />
          Navigation Style
        </CardTitle>
        <CardDescription>
          Choose how you want to navigate through the app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Dock Option */}
          <button
            onClick={() => handleStyleChange('dock')}
            className={cn(
              "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
              currentStyle === 'dock'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
            )}
          >
            {currentStyle === 'dock' && (
              <div className="absolute top-2 right-2">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="w-full aspect-video bg-muted rounded-lg relative overflow-hidden">
              {/* Mini preview of dock layout */}
              <div className="absolute inset-x-2 top-2 h-2 bg-muted-foreground/20 rounded" />
              <div className="absolute inset-x-4 top-6 bottom-8 bg-muted-foreground/10 rounded" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-foreground/80 rounded-full flex items-center justify-center gap-1 px-2">
                <div className="w-1.5 h-1.5 rounded-full bg-background/60" />
                <div className="w-1.5 h-1.5 rounded-full bg-background/60" />
                <div className="w-1.5 h-1.5 rounded-full bg-background/60" />
                <div className="w-1.5 h-1.5 rounded-full bg-background/60" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Dock</p>
              <p className="text-xs text-muted-foreground">Bottom navigation bar</p>
            </div>
          </button>

          {/* Sidebar Option */}
          <button
            onClick={() => handleStyleChange('sidebar')}
            className={cn(
              "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
              currentStyle === 'sidebar'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
            )}
          >
            {currentStyle === 'sidebar' && (
              <div className="absolute top-2 right-2">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="w-full aspect-video bg-muted rounded-lg relative overflow-hidden">
              {/* Mini preview of sidebar layout */}
              <div className="absolute inset-y-2 left-2 w-6 bg-foreground/80 rounded flex flex-col items-center gap-1 py-2">
                <div className="w-2 h-2 rounded bg-background/60" />
                <div className="w-2 h-2 rounded bg-background/60" />
                <div className="w-2 h-2 rounded bg-background/60" />
                <div className="w-2 h-2 rounded bg-background/60" />
              </div>
              <div className="absolute top-2 left-10 right-2 h-2 bg-muted-foreground/20 rounded" />
              <div className="absolute top-6 left-10 right-2 bottom-2 bg-muted-foreground/10 rounded" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Sidebar</p>
              <p className="text-xs text-muted-foreground">Left navigation panel</p>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('preferences');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto py-8 px-6">
        {/* Simple Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Customize your experience
          </p>
        </div>

        {/* Simple Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preferences" className="text-sm">
              Preferences
            </TabsTrigger>
            <TabsTrigger value="sync" className="text-sm">
              Google Sync
            </TabsTrigger>
            <TabsTrigger value="account" className="text-sm">
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preferences" className="space-y-8">
            <NavigationStyleSelector />
            <ColorCustomizationSettings />
          </TabsContent>

          <TabsContent value="sync" className="space-y-8">
            <GoogleSyncSettings />
          </TabsContent>

          <TabsContent value="account" className="space-y-8">
            {/* HAC Settings */}
            <HACSettings />
            
            {/* Future account settings placeholder */}
            <Card className="border-2 border-dashed">
              <CardHeader className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">More Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <p className="text-muted-foreground text-sm">
                  Profile management and security settings coming soon!
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
