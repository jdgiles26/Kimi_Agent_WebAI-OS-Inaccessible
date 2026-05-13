import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function CitationGenerator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('citation');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Citation Generator"
      description="Format pages into APA/MLA citations"
      inputLabel="Content or URL"
      inputPlaceholder="Paste content or URL to generate citations..."
      outputLabel="Citation"
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
