import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function TOSAnalyzer({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('tosanalyzer');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="TOS Analyzer"
      description="Scan terms of service"
      inputLabel="Terms of Service"
      inputPlaceholder="Paste TOS text..."
      outputLabel="Red Flags Report"
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
