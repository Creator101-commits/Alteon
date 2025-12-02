import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
          <h1 className="text-lg font-semibold">Terms of Service</h1>
        </div>
      </header>

      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
            <CardDescription>
              Last updated: {new Date().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  By accessing and using Alteon ("the Service"), you accept and agree to 
                  be bound by the terms and provision of this agreement. If you do not 
                  agree to abide by the above, please do not use this service.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Description of Service</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>Alteon is a comprehensive student productivity platform that provides:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Assignment and deadline tracking</li>
                  <li>Calendar integration and scheduling</li>
                  <li>Note-taking and organization tools</li>
                  <li>Flashcard creation and study tools</li>
                  <li>AI-powered study assistance</li>
                  <li>Productivity analytics and insights</li>
                  <li>Integration with educational platforms</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. User Accounts and Responsibilities</h2>
              <div className="space-y-3 text-muted-foreground">
                <h3 className="text-lg font-medium text-foreground">3.1 Account Creation</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>You must provide accurate and complete information</li>
                  <li>You are responsible for maintaining account security</li>
                  <li>One account per person</li>
                  <li>You must be at least 13 years old (with parental consent)</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">3.2 Acceptable Use</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Use the service for legitimate educational purposes</li>
                  <li>Do not share inappropriate or harmful content</li>
                  <li>Respect intellectual property rights</li>
                  <li>Do not attempt to hack or disrupt the service</li>
                  <li>Follow your institution's academic integrity policies</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Third-Party Integrations</h2>
              <div className="space-y-3 text-muted-foreground">
                <h3 className="text-lg font-medium text-foreground">4.1 Supported Platforms</h3>
                <p>Alteon integrates with various third-party services including:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Google Workspace (Calendar, Classroom)</li>
                  <li>Microsoft Outlook Calendar</li>
                  <li>Notion</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">4.2 Integration Terms</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>You must comply with each platform's terms of service</li>
                  <li>We are not responsible for third-party service availability</li>
                  <li>Integration permissions can be revoked at any time</li>
                  <li>Data syncing depends on third-party API availability</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Intellectual Property</h2>
              <div className="space-y-3 text-muted-foreground">
                <h3 className="text-lg font-medium text-foreground">5.1 Your Content</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>You retain ownership of your notes, assignments, and study materials</li>
                  <li>You grant us license to process and sync your data as needed</li>
                  <li>You are responsible for your content's legality and accuracy</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">5.2 Our Platform</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Alteon platform and features are our intellectual property</li>
                  <li>You may not copy, modify, or distribute our code</li>
                  <li>Reverse engineering is prohibited</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. AI and Automated Features</h2>
              <div className="space-y-3 text-muted-foreground">
                <h3 className="text-lg font-medium text-foreground">6.1 AI Chat and Study Assistance</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>AI responses are generated automatically and may contain errors</li>
                  <li>Do not rely solely on AI for critical academic decisions</li>
                  <li>AI interactions may be logged for service improvement</li>
                  <li>Follow your institution's AI usage policies</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">6.2 Data Processing</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>We use automated systems to organize and analyze your data</li>
                  <li>Analytics are generated from your usage patterns</li>
                  <li>No human review of your private study content</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Service Availability</h2>
              <div className="space-y-3 text-muted-foreground">
                <ul className="list-disc ml-6 space-y-1">
                  <li>We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
                  <li>Maintenance windows may temporarily affect availability</li>
                  <li>Third-party integration availability depends on external services</li>
                  <li>We reserve the right to modify or discontinue features</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Limitation of Liability</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Alteon is provided "as is" without warranties. We are not liable for:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Data loss or corruption</li>
                  <li>Academic consequences from using our service</li>
                  <li>Third-party service interruptions</li>
                  <li>AI-generated content accuracy</li>
                  <li>Missed deadlines or scheduling conflicts</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Academic Integrity</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Alteon is designed to enhance your learning, not replace it. Users must:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Follow their institution's academic honesty policies</li>
                  <li>Use AI assistance appropriately and ethically</li>
                  <li>Not submit AI-generated content as their own work</li>
                  <li>Understand the difference between study help and academic dishonesty</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Termination</h2>
              <div className="space-y-3 text-muted-foreground">
                <h3 className="text-lg font-medium text-foreground">10.1 Account Termination</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>You may delete your account at any time</li>
                  <li>We may suspend accounts for terms violations</li>
                  <li>Data deletion follows our retention policies</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">10.2 Effect of Termination</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Access to the service will be immediately revoked</li>
                  <li>Local data may remain on your device</li>
                  <li>Third-party integrations will be disconnected</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Changes to Terms</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  We reserve the right to modify these terms at any time. Users will be 
                  notified of significant changes via email or app notification. Continued 
                  use constitutes acceptance of updated terms.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Contact Information</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Questions about these Terms of Service should be directed to:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p><strong>Email:</strong> legal@alteon.app</p>
                  <p><strong>Support:</strong> support@alteon.app</p>
                </div>
              </div>
            </section>

            <section>
              <div className="space-y-3 text-muted-foreground">
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
