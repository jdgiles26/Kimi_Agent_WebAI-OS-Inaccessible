import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function QueryGenerator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('querygen');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Query Generator"
      description="Text to SQL/NoSQL"
      inputLabel="Requirements"
      inputPlaceholder="Describe the query you need..."
      inputType="code"
      outputLabel="Generated Query"
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
