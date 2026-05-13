import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function SubscriptionScanner({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('subscanner');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Subscription Scanner"
      description="Find recurring payments"
      inputLabel="Account Statement"
      inputPlaceholder="Paste statement text..."
      outputLabel="Detected Subscriptions"
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
