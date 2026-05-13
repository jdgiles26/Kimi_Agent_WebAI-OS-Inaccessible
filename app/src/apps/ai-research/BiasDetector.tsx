import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function BiasDetector({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('biasdetector');

  const handleDetect = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Bias Detector"
      description="Analyze articles for political or commercial slant"
      inputLabel="Article Text"
      inputPlaceholder="Paste article text to analyze for bias..."
      inputType="textarea"
      outputLabel="Bias Analysis"
      isProcessing={isProcessing}
      onSubmit={handleDetect}
      output={output}
      actionLabel="Analyze"
      modelLabel={modelLabel}
      progress={progress}
      errorMessage={errorMessage}
      webGPUSupported={webGPUStatus?.supported}
    />
  );
}
