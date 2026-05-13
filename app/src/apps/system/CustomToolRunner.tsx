import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AppLayout, AIAppLayout, useAIProcessor } from '@/apps/AppLayout';
import ImageWorkbench from '@/apps/_shared/ImageWorkbench';
import AudioWorkbench from '@/apps/_shared/AudioWorkbench';
import { loadCustomTools, type CustomTool } from '@/lib/ai/customTools';
import type { ToolPlan } from '@/lib/ai/toolModelMap';

/**
 * Loads the saved CustomTool referenced by window data and renders the
 * appropriate workbench (text / image / audio) using its plan.
 */
export default function CustomToolRunner({
  data,
  webGPUStatus,
}: {
  data?: { toolId?: string };
  webGPUStatus?: { supported: boolean };
}) {
  const [tool, setTool] = useState<CustomTool | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tools = await loadCustomTools();
      if (cancelled) return;
      const found = tools.find((t) => t.id === data?.toolId);
      if (!found) setMissing(true);
      else setTool(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [data?.toolId]);

  if (missing) {
    return (
      <AppLayout title="Custom Tool" description="">
        <div className="h-full flex items-center justify-center text-center">
          <div className="max-w-sm space-y-2">
            <AlertTriangle className="w-8 h-8 text-[#fbbf24] mx-auto" />
            <div className="text-sm text-[#e8e8f0]">This custom tool was deleted.</div>
            <div className="text-[11px] text-[#585870]">Open Tool Studio to create a new one.</div>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!tool)
    return (
      <AppLayout title="Loading…">
        <div className="h-full flex items-center justify-center text-[11px] text-[#585870]">
          Loading custom tool…
        </div>
      </AppLayout>
    );

  const plan: ToolPlan = {
    task: tool.task,
    modelId: tool.modelId,
    prompt: tool.prompt,
    maxTokens: tool.maxTokens,
    candidateLabels: tool.candidateLabels,
    inputKind: tool.inputKind,
    modelLabel: tool.modelLabel,
  };

  if (tool.inputKind === 'image') {
    return (
      <ImageWorkbench
        title={tool.name}
        description={tool.description}
        plan={plan}
        webGPUSupported={!!webGPUStatus?.supported}
      />
    );
  }
  if (tool.inputKind === 'audio') {
    return (
      <AudioWorkbench
        title={tool.name}
        description={tool.description}
        plan={plan}
        webGPUSupported={!!webGPUStatus?.supported}
      />
    );
  }

  return <CustomTextRunner tool={tool} plan={plan} webGPUSupported={!!webGPUStatus?.supported} />;
}

function CustomTextRunner({
  tool,
  plan,
  webGPUSupported,
}: {
  tool: CustomTool;
  plan: ToolPlan;
  webGPUSupported: boolean;
}) {
  // We bypass appId resolution by passing the plan override directly.
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor(
    undefined,
    plan,
  );

  return (
    <AIAppLayout
      title={tool.name}
      description={tool.description}
      inputLabel={tool.inputKind === 'code' ? 'Code' : 'Input'}
      inputType={tool.inputKind === 'long-text' ? 'textarea' : tool.inputKind === 'code' ? 'code' : 'textarea'}
      outputLabel="Result"
      isProcessing={isProcessing}
      onSubmit={(s) => process(s)}
      output={output}
      modelLabel={modelLabel}
      progress={progress}
      errorMessage={errorMessage}
      webGPUSupported={webGPUSupported}
    />
  );
}
