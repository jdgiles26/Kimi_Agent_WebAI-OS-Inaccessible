import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function PasswordAnalyzer({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('passanalyzer');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Password Analyzer"
      description="AI password strength"
      inputLabel="Password"
      inputPlaceholder="Enter password to analyze (stays local)..."
      outputLabel="Strength Analysis"
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
