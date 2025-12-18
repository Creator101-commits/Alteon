import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorCustomizationSettings } from '@/components/ColorCustomizationSettings';
import { GoogleSyncSettings } from '@/components/GoogleSyncSettings';
import { HACSettings } from '@/components/HACSettings';
import { Palette, Settings as SettingsIcon, RefreshCw, User } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('appearance');

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
            <TabsTrigger value="appearance" className="text-sm">
              Appearance
            </TabsTrigger>
            <TabsTrigger value="sync" className="text-sm">
              Google Sync
            </TabsTrigger>
            <TabsTrigger value="account" className="text-sm">
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-8">
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
