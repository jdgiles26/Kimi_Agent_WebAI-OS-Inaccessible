import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function SmartReplier({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('smartreply');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Smart Replier"
      description="Draft contextual responses"
      inputLabel="Message Context"
      inputPlaceholder="Paste the message you need to reply to..."
      outputLabel="Suggested Reply"
      isProcessing={isProcessing}
      onSubmit={handleProcess}
      output={output}
      modelLabel={modelLabel}
      progress={progress}
      errorMessage={errorMessage}
      webGPUSupported={webGPUStatus?.supported}
    />
  );
}
