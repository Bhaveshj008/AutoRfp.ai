import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RfpSummaryCard } from '@/components/rfp/RfpSummaryCard';
import { Spinner } from '@/components/common/Spinner';
import { useAnalyzeRfp, useCreateRfp } from '@/hooks/useRfps';
import { Bot, ArrowRight, ArrowLeft, Save, Sparkles } from 'lucide-react';

const EXAMPLE_PROMPT = "I need to procure laptops and monitors for our new office. Budget is $50,000 total. Need delivery within 30 days. We need 20 laptops with 16GB RAM and 15 monitors 27-inch. Payment terms should be net 30, and we need at least 1 year warranty.";

export default function RfpCreatePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const { analyze, isAnalyzing, structuredData, reset } = useAnalyzeRfp();
  const createRfpMutation = useCreateRfp();

  const handleAnalyze = () => {
    if (!prompt.trim()) return;
    analyze(prompt);
  };

  const handleSave = async () => {
    if (!structuredData) return;
    
    const result = await createRfpMutation.mutateAsync({
      prompt,
      structured: structuredData,
    });
    
    if (result?.rfp_id) {
      navigate(`/rfps/${result.rfp_id}`);
    }
  };

  const handleBack = () => {
    reset();
  };

  const handleAutoFill = () => {
    setPrompt(EXAMPLE_PROMPT);
  };

  // Show review screen if we have structured data
  if (structuredData) {
    return (
      <AppShell title="Review RFP">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Review & Confirm</h2>
              <p className="text-muted-foreground">
                AI has extracted the following structure from your description
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              AI Evaluated
            </div>
          </div>

          <RfpSummaryCard rfp={structuredData} />

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <Bot className="h-6 w-6 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">AI Assistant</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    "I've extracted the key requirements from your description. Does this look correct? You can save this RFP and then invite vendors to submit proposals."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Edit
            </Button>
            <Button
              onClick={handleSave}
              disabled={createRfpMutation.isPending}
              size="lg"
            >
              {createRfpMutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save RFP
                </>
              )}
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Show input screen
  return (
    <AppShell title="Create RFP">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Create New RFP</h2>
          <p className="text-muted-foreground">
            Describe your procurement needs and AI will structure it for you
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Describe your procurement needs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. I need 50 office chairs and 10 desks delivered to NY by next Friday..."
              className="min-h-[160px] resize-none"
              disabled={isAnalyzing}
            />
            <div className="flex items-center justify-between">
              <Button
                variant="link"
                className="p-0 h-auto text-primary"
                onClick={handleAutoFill}
                disabled={isAnalyzing || prompt.length > 0}
              >
                Auto-fill Example
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={!prompt.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze & Structure
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">AI-Powered Extraction</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Our AI will automatically extract key details like budget, items, quantities, delivery requirements, and payment terms from your natural language description.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
