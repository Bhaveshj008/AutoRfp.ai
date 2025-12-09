import { useState } from 'react';
import { useEmails, useFetchEmails, useParseProposals } from '@/hooks/useRfps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Mail, RefreshCw, Zap } from 'lucide-react';
import { format } from 'date-fns';

interface EmailsListProps {
  rfpId: string | undefined;
  rfpStatus?: 'draft' | 'sent' | 'evaluating' | 'closed';
}

export function EmailsList({ rfpId, rfpStatus }: EmailsListProps) {
  const { data: emails = [], isLoading, refetch } = useEmails(rfpId);
  const fetchEmailsMutation = useFetchEmails();
  const parseProposalsMutation = useParseProposals();
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  const handleFetchEmails = async () => {
    await fetchEmailsMutation.mutateAsync();
    // Refetch emails after syncing
    refetch();
  };

  const handleParseProposals = async () => {
    if (!rfpId) return;
    await parseProposalsMutation.mutateAsync(rfpId);
  };

  if (!rfpId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Received Emails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Mail}
            title="No RFP selected"
            description="Please select an RFP to view emails"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Received Emails
          {emails.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
              {emails.length}
            </span>
          )}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFetchEmails}
            disabled={fetchEmailsMutation.isPending || rfpStatus === 'closed'}
            className="gap-2"
            title={rfpStatus === 'closed' ? 'Cannot fetch emails for a closed RFP' : ''}
          >
            <RefreshCw className="h-4 w-4" />
            {fetchEmailsMutation.isPending ? 'Fetching...' : 'Fetch Emails'}
          </Button>
          {emails.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleParseProposals}
              disabled={parseProposalsMutation.isPending || rfpStatus === 'closed'}
              className="gap-2"
              title={rfpStatus === 'closed' ? 'Cannot analyze proposals for a closed RFP' : ''}
            >
              <Zap className="h-4 w-4" />
              {parseProposalsMutation.isPending ? 'Analyzing...' : 'Run AI Analysis'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState message="Loading emails..." />
        ) : emails.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No emails received"
            description="Click 'Fetch Emails' to sync emails from your inbox"
          />
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <div
                key={email.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() =>
                  setExpandedEmailId(
                    expandedEmailId === email.id ? null : email.id
                  )
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">
                        {email.vendor_name || email.vendor_email}
                      </h4>
                      <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                        {email.direction}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {email.subject}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(email.received_at || email.created_at), 'PPpp')}
                    </p>
                  </div>
                </div>

                {expandedEmailId === email.id && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        From
                      </p>
                      <p className="text-sm">{email.vendor_email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        Subject
                      </p>
                      <p className="text-sm">{email.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        Message
                      </p>
                      <div className="mt-2 text-sm whitespace-pre-wrap bg-muted p-3 rounded max-h-60 overflow-y-auto">
                        {email.body_text}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
