import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function CompetitorMatrix({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('compmatrix');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Competitor Matrix"
      description="Build comparison tables from product tabs"
      inputLabel="Products to Compare"
      inputPlaceholder="Enter product names separated by commas..."
      outputLabel="Comparison Matrix"
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
