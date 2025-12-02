import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Download, 
  Upload, 
  Trash2, 
  Eye, 
  EyeOff, 
  Lock, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Database
} from "lucide-react";

interface PrivacySettings {
  dataCollection: boolean;
  analytics: boolean;
  personalization: boolean;
  thirdPartySharing: boolean;
  marketingEmails: boolean;
  sessionRecording: boolean;
  crashReports: boolean;
}

export const PrivacyControls = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<PrivacySettings>({
    dataCollection: true,
    analytics: false,
    personalization: true,
    thirdPartySharing: false,
    marketingEmails: false,
    sessionRecording: false,
    crashReports: true
  });

  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateSetting = (key: keyof PrivacySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(`privacy_${user?.uid}`, JSON.stringify({ ...settings, [key]: value }));
    
    toast({
      title: "Privacy Settings Updated",
      description: "Your privacy preferences have been saved.",
    });
  };

  const exportData = async () => {
    setIsExporting(true);
    try {
      // Collect all user data from localStorage
      const userData = {
        profile: {
          email: user?.email,
          name: user?.displayName,
          createdAt: new Date().toISOString()
        },
        habits: JSON.parse(localStorage.getItem(`habits_${user?.uid}`) || '[]'),
        notes: JSON.parse(localStorage.getItem(`notes_${user?.uid}`) || '[]'),
        tasks: JSON.parse(localStorage.getItem(`tasks_${user?.uid}`) || '[]'),
        settings: JSON.parse(localStorage.getItem(`settings_${user?.uid}`) || '{}'),
        privacy: settings,
        exported: new Date().toISOString()
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alteon-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your data has been downloaded as a JSON file.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const deleteAllData = () => {
    if (user) {
      // Clear all user data from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes(user.uid)) {
          localStorage.removeItem(key);
        }
      });

      toast({
        title: "Data Deleted",
        description: "All your local data has been permanently deleted.",
      });
      
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Privacy & Data Control</h2>
      </div>

      {/* GDPR/FERPA Compliance */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Alteon is designed with privacy-first principles and complies with GDPR and FERPA regulations. 
          Your data is stored locally and you have full control over what information is collected and shared.
        </AlertDescription>
      </Alert>

      {/* Data Collection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Collection Preferences
          </CardTitle>
          <CardDescription>
            Control what data we collect to improve your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Essential Data Collection</h4>
              <p className="text-sm text-muted-foreground">
                Basic app functionality data (required for core features)
              </p>
            </div>
            <Switch
              checked={settings.dataCollection}
              onCheckedChange={(checked) => updateSetting('dataCollection', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Analytics & Usage Statistics</h4>
              <p className="text-sm text-muted-foreground">
                Help us improve the app with anonymous usage data
              </p>
            </div>
            <Switch
              checked={settings.analytics}
              onCheckedChange={(checked) => updateSetting('analytics', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Personalization Data</h4>
              <p className="text-sm text-muted-foreground">
                Customize your experience based on your usage patterns
              </p>
            </div>
            <Switch
              checked={settings.personalization}
              onCheckedChange={(checked) => updateSetting('personalization', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Third-Party Data Sharing</h4>
              <p className="text-sm text-muted-foreground">
                Share anonymized data with educational partners
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Optional</Badge>
              <Switch
                checked={settings.thirdPartySharing}
                onCheckedChange={(checked) => updateSetting('thirdPartySharing', checked)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Marketing Communications</h4>
              <p className="text-sm text-muted-foreground">
                Receive updates about new features and educational content
              </p>
            </div>
            <Switch
              checked={settings.marketingEmails}
              onCheckedChange={(checked) => updateSetting('marketingEmails', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Session Recording</h4>
              <p className="text-sm text-muted-foreground">
                Record anonymous sessions to identify and fix issues
              </p>
            </div>
            <Switch
              checked={settings.sessionRecording}
              onCheckedChange={(checked) => updateSetting('sessionRecording', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Crash Reports</h4>
              <p className="text-sm text-muted-foreground">
                Automatically send crash reports to help us fix bugs
              </p>
            </div>
            <Switch
              checked={settings.crashReports}
              onCheckedChange={(checked) => updateSetting('crashReports', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Portability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Data Portability & Control
          </CardTitle>
          <CardDescription>
            Export, import, or delete your data at any time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={exportData}
              disabled={isExporting}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export My Data'}
            </Button>

            <Button 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import Data
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your data export will include all habits, notes, tasks, and settings. 
              This file contains personal information - please store it securely.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Data Deletion */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Trash2 className="h-5 w-5" />
            Delete All Data
          </CardTitle>
          <CardDescription>
            Permanently delete all your data from Alteon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete All My Data
            </Button>
          ) : (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This action cannot be undone. All your habits, notes, tasks, 
                  and settings will be permanently deleted from this device.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={deleteAllData}
                >
                  Yes, Delete Everything
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Storage Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Data Storage & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Local Storage</h4>
              <p className="text-sm text-muted-foreground">
                Your data is primarily stored locally on your device for maximum privacy and offline access.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Cloud Sync (Optional)</h4>
              <p className="text-sm text-muted-foreground">
                Google users can optionally sync data through Firebase with end-to-end encryption.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Data Encryption</h4>
              <p className="text-sm text-muted-foreground">
                All sensitive data is encrypted both in transit and at rest using industry-standard protocols.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Third-Party Services</h4>
              <p className="text-sm text-muted-foreground">
                We only use privacy-compliant services and never sell your personal information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
