import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Chrome } from "lucide-react";
import { useLocation } from "wouter";

interface SyncFeatureWrapperProps {
  children: ReactNode;
  feature: string;
  description?: string;
}

export const SyncFeatureWrapper = ({ 
  children, 
  feature,
  description = "This feature requires Google account authentication to sync data."
}: SyncFeatureWrapperProps) => {
  const { hasGoogleAccess } = useAuth();
  const [, setLocation] = useLocation();

  if (hasGoogleAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-full mb-4">
              <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">
              {feature} - Premium Feature
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              {description}
            </p>
            <Alert>
              <Chrome className="h-4 w-4" />
              <AlertDescription>
                Sign in with Google to unlock sync features and access your classroom data automatically.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => setLocation("/auth")} 
              className="w-full"
            >
              <Chrome className="w-4 h-4 mr-2" />
              Upgrade to Google Sync
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Dimmed content */}
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>
    </div>
  );
};

// Hook to check if user has Google access
export const useGoogleAccess = () => {
  const { hasGoogleAccess } = useAuth();
  return hasGoogleAccess;
};
