import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function PoemGenerator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('poemgen');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Poem Generator"
      description="Poems in various styles"
      inputLabel="Theme or Topic"
      inputPlaceholder="Enter a theme for your poem..."
      outputLabel="Generated Poem"
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
