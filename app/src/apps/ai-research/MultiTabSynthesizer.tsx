import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function MultiTabSynthesizer({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('synthesizer');

  const handleSynthesize = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Multi-Tab Synthesizer"
      description="Cross-reference data across open browser tabs"
      inputLabel="Topic or Query"
      inputPlaceholder="Enter a topic to synthesize across your open tabs (e.g., 'climate change statistics 2025')..."
      outputLabel="Synthesis Results"
      isProcessing={isProcessing}
      onSubmit={handleSynthesize}
      output={output}
      modelLabel={modelLabel}
      progress={progress}
      errorMessage={errorMessage}
      webGPUSupported={webGPUStatus?.supported}
    />
  );
}
