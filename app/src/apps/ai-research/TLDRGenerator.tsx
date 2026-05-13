import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function TLDRGenerator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('tldr');

  const handleGenerate = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="TL;DR Generator"
      description="Produce 3-bullet summaries of long content"
      inputLabel="Long Content"
      inputPlaceholder="Paste long article, document, or text to summarize..."
      inputType="textarea"
      outputLabel="3-Bullet Summary"
      isProcessing={isProcessing}
      onSubmit={handleGenerate}
      output={output}
      actionLabel="Summarize"
      modelLabel={modelLabel}
      progress={progress}
      errorMessage={errorMessage}
      webGPUSupported={webGPUStatus?.supported}
    />
  );
}
