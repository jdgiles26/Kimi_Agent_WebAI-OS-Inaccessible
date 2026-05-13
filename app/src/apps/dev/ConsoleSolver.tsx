import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function ConsoleSolver({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('consolesolver');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Console Solver"
      description="Fix console errors"
      inputLabel="Error Message"
      inputPlaceholder="Paste console error..."
      outputLabel="Suggested Fix"
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
