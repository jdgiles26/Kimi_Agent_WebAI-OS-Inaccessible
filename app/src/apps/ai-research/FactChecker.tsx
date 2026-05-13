import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function FactChecker({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('factchecker');

  const handleCheck = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Fact Checker"
      description="Highlight claims and verify against trusted sources"
      inputLabel="Text to Verify"
      inputPlaceholder="Paste text with claims to fact-check..."
      inputType="textarea"
      outputLabel="Verification Results"
      isProcessing={isProcessing}
      onSubmit={handleCheck}
      output={output}
      actionLabel="Verify"
      modelLabel={modelLabel}
      progress={progress}
      errorMessage={errorMessage}
      webGPUSupported={webGPUStatus?.supported}
    />
  );
}
