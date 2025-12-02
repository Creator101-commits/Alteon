import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Privacy Policy</h1>
        </div>
      </header>

      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
            <CardDescription>
              Last updated: {new Date().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
              <div className="space-y-3 text-muted-foreground">
                <h3 className="text-lg font-medium text-foreground">1.1 Account Information</h3>
                <p>When you create an account, we collect:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Email address</li>
                  <li>Name and display name</li>
                  <li>Profile picture (if provided via Google)</li>
                  <li>Authentication tokens for third-party services</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">1.2 Educational Data</h3>
                <p>To provide our services, we may collect:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Class schedules and course information</li>
                  <li>Assignment data and deadlines</li>
                  <li>Study notes and flashcards</li>
                  <li>Calendar events and schedules</li>
                  <li>Productivity analytics and usage patterns</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">1.3 Third-Party Integration Data</h3>
                <p>With your consent, we access data from:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Google Calendar (events, calendars)</li>
                  <li>Google Classroom (assignments, courses)</li>
                  <li>Notion (notes, databases)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>We use your information to:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Provide and maintain our educational productivity services</li>
                  <li>Sync your data across integrated platforms</li>
                  <li>Send notifications about assignments and deadlines</li>
                  <li>Generate analytics about your study habits</li>
                  <li>Improve our AI-powered features</li>
                  <li>Provide customer support</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Data Storage and Security</h2>
              <div className="space-y-3 text-muted-foreground">
                <h3 className="text-lg font-medium text-foreground">3.1 Storage Locations</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Supabase/Firestore:</strong> User profiles and app settings</li>
                  <li><strong>Local Storage:</strong> Cached data for offline access</li>
                  <li><strong>Third-party APIs:</strong> Data remains on your connected platforms</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">3.2 Security Measures</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Encrypted data transmission (HTTPS/TLS)</li>
                  <li>Secure OAuth 2.0 authentication</li>
                  <li>Access tokens stored securely</li>
                  <li>Regular security updates and monitoring</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Third-Party Services</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>Our app integrates with the following third-party services:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Google Services:</strong> Calendar, Classroom, Authentication</li>
                  <li><strong>Supabase:</strong> Authentication, database, hosting</li>
                  <li><strong>AI:</strong> AI chat functionality</li>
                  <li><strong>Notion:</strong> Note synchronization</li>
                </ul>
                <p className="mt-3">Each service has its own privacy policy and terms of service.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Your Rights</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>You have the right to:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Delete your account and data</li>
                  <li>Export your data</li>
                  <li>Disconnect third-party integrations</li>
                  <li>Opt out of data collection</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Data Retention</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>We retain your data as follows:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Account Data:</strong> Until you delete your account</li>
                  <li><strong>Study Data:</strong> Retained for functionality and analytics</li>
                  <li><strong>Cached Data:</strong> Automatically refreshed periodically</li>
                  <li><strong>Analytics:</strong> Aggregated data may be retained longer</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Children's Privacy</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Our service is designed for students of all ages. For users under 13, 
                  parental consent is required. We comply with COPPA requirements for 
                  children's data protection.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Changes to Privacy Policy</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We may update this privacy policy from time to time. We will notify users 
                  of any material changes via email or through the app interface.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Contact Information</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  If you have questions about this privacy policy or our data practices, 
                  please contact us at:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                                    <p><strong>Email:</strong> alteon@gmail.com</p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
