import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function MindMapGenerator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('mindmapgen');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Mind Map Generator"
      description="Visual mind maps from topics"
      inputLabel="Central Topic"
      inputPlaceholder="Enter a topic to generate a mind map..."
      outputLabel="Mind Map Structure"
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
