import React, { useState } from 'react';
import { Eye, EyeOff, Check, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>
);

// --- TYPE DEFINITIONS ---

interface EnhancedSignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: (enableSync?: boolean) => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  isSignUp?: boolean;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

const GoogleSyncOption = ({ 
  onSelect, 
  selected, 
  title, 
  description, 
  features, 
  badge 
}: {
  onSelect: () => void;
  selected: boolean;
  title: string;
  description: string;
  features: string[];
  badge?: string;
}) => (
  <Card 
    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
      selected ? 'ring-2 ring-violet-500 bg-violet-50/50 dark:bg-violet-950/20' : 'hover:shadow-md'
    }`}
    onClick={onSelect}
  >
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        {badge && <Badge variant="secondary">{badge}</Badge>}
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-violet-500 bg-violet-500' : 'border-gray-300'
        }`}>
          {selected && <Check className="w-4 h-4 text-white" />}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardHeader>
    <CardContent className="pt-0">
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

// --- MAIN COMPONENT ---

export const EnhancedSignInPage: React.FC<EnhancedSignInPageProps> = ({
  title = <span className="font-light text-foreground tracking-tighter">Welcome</span>,
  description = "Access your account and continue your journey with us",
  heroImageSrc,
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
  isSignUp = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleOptions, setShowGoogleOptions] = useState(false);
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(true);

  const handleGoogleSignInClick = () => {
    if (!showGoogleOptions) {
      setShowGoogleOptions(true);
      return;
    }
    onGoogleSignIn?.(googleSyncEnabled);
  };

  const handleBackToSignIn = () => {
    setShowGoogleOptions(false);
  };

  if (showGoogleOptions) {
    return (
      <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw]">
        {/* Left column: Google sync options */}
        <section className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-2">
                  Choose Your Experience
                </h1>
                <p className="text-muted-foreground">
                  Select how you'd like to use Google integration with Alteon
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <GoogleSyncOption
                  onSelect={() => setGoogleSyncEnabled(true)}
                  selected={googleSyncEnabled}
                  title="Full Google Sync"
                  description="Complete integration with Google Classroom and Calendar"
                  features={[
                    "Sync Google Classroom courses & assignments",
                    "Import Google Calendar events",
                    "Automatic data synchronization",
                    "Real-time updates from Google services"
                  ]}
                  badge="Recommended"
                />

                <GoogleSyncOption
                  onSelect={() => setGoogleSyncEnabled(false)}
                  selected={!googleSyncEnabled}
                  title="Basic Google Login"
                  description="Sign in with Google without data synchronization"
                  features={[
                    "Secure Google authentication",
                    "Create custom classes manually",
                    "Add assignments manually",
                    "No automatic data imports"
                  ]}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-blue-900 dark:text-blue-100 font-medium mb-1">
                      You can change this setting later
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Don't worry! You can enable or disable Google sync anytime in your account settings.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleBackToSignIn}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleGoogleSignInClick}
                  className="flex-1 flex items-center justify-center gap-3"
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Right column: hero image */}
        {heroImageSrc && (
          <section className="hidden md:block flex-1 relative p-4">
            <img
              src={heroImageSrc}
              alt="Hero image"
              className="absolute inset-4 rounded-3xl object-cover w-full h-full"
            />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw]">
      {/* Left column: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">{title}</h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

            <form className="space-y-5" onSubmit={onSignIn}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="Enter your email address" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none" />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                  <span className="text-foreground/90">Keep me signed in</span>
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); onResetPassword?.(); }} className="hover:underline text-violet-400 transition-colors">Reset password</a>
              </div>

              <button type="submit" className="animate-element animate-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                {isSignUp ? "Create Account" : "Sign In"}
              </button>
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center">
              <span className="w-full border-t border-border"></span>
              <span className="px-4 text-sm text-muted-foreground bg-background absolute">Or continue with</span>
            </div>

            <button onClick={handleGoogleSignInClick} className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors">
                <GoogleIcon />
                {isSignUp ? "Sign up with Google" : "Continue with Google"}
            </button>

            <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
              {isSignUp ? (
                <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="text-violet-400 hover:underline transition-colors">Sign In</a></>
              ) : (
                <>New to our platform? <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="text-violet-400 hover:underline transition-colors">Create Account</a></>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4">
          <img
            src={heroImageSrc}
            alt="Hero image"
            className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl object-cover w-full h-full"
          />
        </section>
      )}
    </div>
  );
};
