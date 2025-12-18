/**
 * HAC Settings Component
 * Allows users to connect their Home Access Center account
 */

import React, { useState } from 'react';
import { useHAC } from '@/contexts/HACContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  Link2, 
  Unlink, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';

export function HACSettings() {
  const { 
    isConnected, 
    isLoading, 
    error, 
    connect, 
    disconnect, 
    cachedUsername,
    gradesData,
    refreshGrades
  } = useHAC();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim() || !password.trim()) {
      setLocalError('Please enter both username and password');
      return;
    }

    const success = await connect({
      username: username.trim(),
      password: password.trim(),
    });

    if (success) {
      // Clear form on success
      setUsername('');
      setPassword('');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setUsername('');
    setPassword('');
  };

  const displayError = localError || error;

  if (isConnected) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <GraduationCap className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Home Access Center</CardTitle>
                <CardDescription>Grade tracking connected</CardDescription>
              </div>
            </div>
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Account</span>
              <span className="font-medium">{cachedUsername}</span>
            </div>
            {gradesData && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Courses</span>
                  <span className="font-medium">{gradesData.grades.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Average</span>
                  <span className="font-medium">{gradesData.overallAverage.toFixed(1)}%</span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => refreshGrades()}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Grades
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDisconnect}
              className="flex-1"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your credentials are stored locally and never sent to our servers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Home Access Center</CardTitle>
            <CardDescription>Connect your HAC account to view grades</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleConnect} className="space-y-4">
          {displayError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="hac-username">HAC Username</Label>
            <Input
              id="hac-username"
              type="text"
              placeholder="student.name@k12.leanderisd.org"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hac-password">HAC Password</Label>
            <div className="relative">
              <Input
                id="hac-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Connect HAC Account
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your credentials are stored locally on your device and are only used to fetch your grades directly from HAC.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
