/**
 * HistoryTab — Shows previously generated summaries.
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Copy } from "lucide-react";
import { FormattedMessage } from "@/components/ui/FormattedMessage";
import type { Summary, SummaryType } from "./types";

interface HistoryTabProps {
  summaries: Summary[];
  copyToClipboard: (text: string) => void;
  getSummaryTypeIcon: (type: SummaryType) => React.ReactNode;
  getSummaryTypeColor: (type: SummaryType) => string;
}

export function HistoryTab({
  summaries,
  copyToClipboard,
  getSummaryTypeIcon,
  getSummaryTypeColor,
}: HistoryTabProps) {
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <Card className="min-h-full flex flex-col bg-card border-border backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Summary History</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {summaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  No summaries yet. Create your first summary to see it here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {summaries.map((summary) => (
                  <Card key={summary.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold">{summary.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {summary.timestamp.toLocaleDateString()} at{" "}
                            {summary.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            className={getSummaryTypeColor(
                              summary.summaryType
                            )}
                          >
                            {getSummaryTypeIcon(summary.summaryType)}
                            <span className="ml-1 capitalize">
                              {summary.summaryType}
                            </span>
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(summary.summary)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="bg-muted p-4 rounded-lg border border-border">
                        <FormattedMessage
                          content={summary.summary}
                          animated={false}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
