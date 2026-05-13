import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function ThreadMaker({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('threadmaker');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Thread Maker"
      description="Convert articles to social threads"
      inputLabel="Article Text"
      inputPlaceholder="Paste article to convert to thread..."
      outputLabel="Social Thread"
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
