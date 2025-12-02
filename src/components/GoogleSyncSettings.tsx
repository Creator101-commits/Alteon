import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserData } from '@/lib/firebase';
import { RefreshCw, CheckCircle, XCircle, Settings, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const GoogleSyncSettings = () => {
  const { user, userData, restoreUserData } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const hasGoogleAccess = userData?.hasGoogleAccess === true;
  const hasGoogleCalendar = userData?.hasGoogleCalendar === true;

  const handleToggleGoogleCalendar = async (enabled: boolean) => {
    if (!user?.uid) return;

    setIsUpdating(true);
    try {
      await updateUserData(user.uid, {
        hasGoogleCalendar: enabled,
      });

      toast({
        title: "Settings Updated",
        description: `Google Calendar sync ${enabled ? 'enabled' : 'disabled'} successfully.`,
      });

      // Restore user data to reflect changes
      await restoreUserData();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update Google Calendar settings.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReconnectGoogle = async () => {
    try {
      toast({
        title: "Reconnect Google",
        description: "Please sign out and sign in again with Google to reconnect your account.",
      });
    } catch (error: any) {
      toast({
        title: "Reconnection Failed",
        description: "Failed to reconnect Google account.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Google Integration Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${hasGoogleAccess ? 'bg-green-500' : 'bg-gray-400'}`} />
            <div>
              <p className="font-medium">Google Account Connection</p>
              <p className="text-sm text-muted-foreground">
                {hasGoogleAccess ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          <Badge variant={hasGoogleAccess ? 'default' : 'secondary'}>
            {hasGoogleAccess ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Google Calendar Toggle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Google Calendar Sync</h3>
              <p className="text-sm text-muted-foreground">
                View and sync events from your Google Calendar
              </p>
            </div>
            <Switch
              checked={hasGoogleCalendar}
              onCheckedChange={handleToggleGoogleCalendar}
              disabled={isUpdating || !userData?.googleAccessToken}
            />
          </div>

          {!userData?.googleAccessToken && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You need to sign in with Google to enable calendar synchronization.
                <Button
                  variant="link"
                  className="p-0 h-auto ml-2"
                  onClick={handleReconnectGoogle}
                >
                  Reconnect Google account
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Features List */}
        <div className="space-y-3">
          <h3 className="font-medium">Available Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <CheckCircle className={`w-4 h-4 ${hasGoogleCalendar ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm">Google Calendar Sync</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Create Classes Manually</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Create Assignments Manually</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Track Progress & Due Dates</span>
            </div>
          </div>
        </div>

        {/* Sync Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Classes and assignments are now managed manually. You can create, edit, and delete them directly from the Classes and Assignments pages.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
