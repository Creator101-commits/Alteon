import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedSignInPage } from "@/components/ui/enhanced-sign-in";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect } from "react";

const CREDS_KEY = 'alteon_saved_credentials';

export default function AuthPage() {
  const { user, signIn, signInWithEmailPassword, signUpWithEmailPassword } = useAuth();
  const { theme } = useTheme();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [savedPassword, setSavedPassword] = useState("");

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CREDS_KEY);
      if (saved) {
        const { email, password, rememberMe } = JSON.parse(saved);
        if (rememberMe && email && password) {
          setSavedEmail(email);
          setSavedPassword(password);
          // Auto-login with saved credentials
          signInWithEmailPassword(email, password).catch((err) => {
            console.error('Auto-login failed:', err);
            // Clear invalid credentials
            localStorage.removeItem(CREDS_KEY);
          });
        }
      }
    } catch (err) {
      console.error('Failed to load saved credentials:', err);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const rememberMe = formData.get("rememberMe") === "on";

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await signInWithEmailPassword(email, password);
      
      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem(CREDS_KEY, JSON.stringify({ email, password, rememberMe: true }));
      } else {
        localStorage.removeItem(CREDS_KEY);
      }
    } catch (error: any) {
      console.error("Email sign in error:", error);
      if (error?.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (error?.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else if (error?.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error?.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Failed to sign in. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (enableSync?: boolean) => {
    try {
      setIsLoading(true);
      setError("");
      await signIn(enableSync);
    } catch (error: any) {
      console.error("Google sign in error:", error);
      if (error?.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups for this site and try again.');
      } else if (error?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled.');
      } else if (error?.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please contact support.');
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = () => {
    // TODO: Implement password reset functionality
    alert("Password reset functionality coming soon!");
  };

  const handleCreateAccount = () => {
    setLocation("/signup");
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedSignInPage
        title={<span className="font-medium text-foreground">Welcome to Alteon</span>}
        description="Your study companion. Sign in to organize your classes and assignments."
        heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
        savedEmail={savedEmail}
        savedPassword={savedPassword}
      />
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card px-6 py-4 rounded-lg shadow-lg">
            <p className="text-card-foreground">Signing in...</p>
          </div>
        </div>
      )}
    </div>
  );
}
