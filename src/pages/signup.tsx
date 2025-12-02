import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedSignInPage } from "@/components/ui/enhanced-sign-in";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect } from "react";

export default function SignupPage() {
  const { user, signIn, signUpWithEmailPassword } = useAuth();
  const { theme } = useTheme();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      // For signup, we'll use a default display name based on email
      const displayName = email.split('@')[0];
      await signUpWithEmailPassword(email, password, displayName);
    } catch (error: any) {
      console.error("Email sign up error:", error);
      if (error?.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (error?.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error?.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError('Failed to create account. Please try again.');
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
        setError('Sign-up was cancelled.');
      } else if (error?.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please contact support.');
      } else {
        setError('Failed to sign up with Google. Please try again.');
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
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedSignInPage
        title={<span className="font-medium text-foreground">Create Your Account</span>}
        description="Join Alteon to organize your studies and stay on track with your assignments."
        heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
        onSignIn={handleSignUp}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
        isSignUp={true}
      />
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card px-6 py-4 rounded-lg shadow-lg">
            <p className="text-card-foreground">Creating account...</p>
          </div>
        </div>
      )}
    </div>
  );
}
