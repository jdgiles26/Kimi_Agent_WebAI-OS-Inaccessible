import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function CodeReviewer({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('codereviewer');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Code Reviewer"
      description="AI-powered code review"
      inputLabel="Code to Review"
      inputPlaceholder="Paste code for review..."
      inputType="code"
      outputLabel="Code Review"
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
