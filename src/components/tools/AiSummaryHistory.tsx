import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiDelete } from "@/lib/api";
import { AiSummary } from "@shared/schema";
import {
  Bot,
  FileText,
  Youtube,
  Mic,
  Trash2,
  Copy,
  Download,
  Calendar,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";

export const AiSummaryHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [summaries, setSummaries] = useState<AiSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<AiSummary | null>(null);

  // Load AI summaries from database
  const loadAiSummaries = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const response = await apiGet(`/api/users/${user.uid}/ai-summaries`);
      if (response.ok) {
        const data = await response.json();
        setSummaries(data);
        console.log(' Loaded AI summaries:', data.length);
      } else {
        console.error('Failed to load AI summaries:', response.status);
        toast({
          title: "Error",
          description: "Failed to load AI summaries",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading AI summaries:', error);
      toast({
        title: "Error",
        description: "Failed to load AI summaries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load AI summaries on component mount
  useEffect(() => {
    loadAiSummaries();
  }, [user?.uid]);

  // Delete AI summary
  const deleteSummary = async (summaryId: string) => {
    try {
      const response = await apiDelete(`/api/ai-summaries/${summaryId}`);
      
      if (response.ok) {
        setSummaries(prev => prev.filter(s => s.id !== summaryId));
        if (selectedSummary?.id === summaryId) {
          setSelectedSummary(null);
        }
        
        toast({
          title: "Summary deleted",
          description: "AI summary has been removed",
        });
      } else {
        throw new Error('Failed to delete AI summary');
      }
    } catch (error) {
      console.error('Error deleting AI summary:', error);
      toast({
        title: "Error",
        description: "Failed to delete AI summary",
        variant: "destructive",
      });
    }
  };

  // Copy summary to clipboard
  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied!",
        description: "Summary copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Get file type icon
  const getFileTypeIcon = (fileType: string | null) => {
    switch (fileType?.toLowerCase()) {
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "youtube":
        return <Youtube className="h-4 w-4" />;
      case "audio":
        return <Mic className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get summary type color
  const getSummaryTypeColor = (summaryType: string | null) => {
    switch (summaryType?.toLowerCase()) {
      case "quick":
        return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200";
      case "detailed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200";
      case "bullet":
        return "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200";
      default:
        return "bg-muted text-foreground";
    }
  };

  // Filter summaries by search term
  const filteredSummaries = summaries.filter(summary =>
    summary.title.toLowerCase().includes(selectedSummary?.title.toLowerCase() || '') ||
    summary.summary.toLowerCase().includes(selectedSummary?.title.toLowerCase() || '')
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Summary History</h2>
          <p className="text-muted-foreground">
            View and manage your AI-generated summaries
          </p>
        </div>
        <Button onClick={loadAiSummaries} variant="outline">
          <Bot className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {summaries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No AI Summaries Yet</h3>
            <p className="text-muted-foreground text-center">
              Create your first AI summary by using the AI Chat feature to summarize content.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSummaries.map((summary) => (
            <Card key={summary.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getFileTypeIcon(summary.fileType)}
                      <CardTitle className="text-lg">{summary.title}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(summary.createdAt || ''), "MMM dd, yyyy")}</span>
                      <Clock className="h-3 w-3 ml-2" />
                      <span>{format(new Date(summary.createdAt || ''), "HH:mm")}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {summary.summaryType && (
                      <Badge className={getSummaryTypeColor(summary.summaryType)}>
                        {summary.summaryType}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedSummary(
                        expandedSummary === summary.id ? null : summary.id
                      )}
                    >
                      {expandedSummary === summary.id ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedSummary === summary.id && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Summary Content */}
                    <div>
                      <h4 className="font-semibold mb-2">Summary</h4>
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="whitespace-pre-wrap text-sm">
                          {summary.summary}
                        </p>
                      </div>
                    </div>

                    {/* Original Content (if available) */}
                    {summary.originalContent && (
                      <div>
                        <h4 className="font-semibold mb-2">Original Content</h4>
                        <div className="bg-muted p-4 rounded-lg max-h-32 overflow-y-auto">
                          <p className="text-sm text-muted-foreground">
                            {summary.originalContent.length > 500 
                              ? `${summary.originalContent.substring(0, 500)}...`
                              : summary.originalContent
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(summary.summary)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Summary
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const blob = new Blob([summary.summary], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${summary.title}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSummary(summary.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Summary Statistics */}
      {summaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summaries.length}</div>
                <div className="text-sm text-muted-foreground">Total Summaries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {summaries.filter(s => s.summaryType === 'quick').length}
                </div>
                <div className="text-sm text-muted-foreground">Quick Summaries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {summaries.filter(s => s.summaryType === 'detailed').length}
                </div>
                <div className="text-sm text-muted-foreground">Detailed Summaries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {summaries.filter(s => s.summaryType === 'bullet').length}
                </div>
                <div className="text-sm text-muted-foreground">Bullet Summaries</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
