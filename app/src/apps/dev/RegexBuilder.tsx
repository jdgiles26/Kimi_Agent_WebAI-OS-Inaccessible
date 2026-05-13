import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function RegexBuilder({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('regexbuilder');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Regex Builder"
      description="Text to regex patterns"
      inputLabel="Description"
      inputPlaceholder="Describe what you want to match..."
      outputLabel="Regex Pattern"
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
