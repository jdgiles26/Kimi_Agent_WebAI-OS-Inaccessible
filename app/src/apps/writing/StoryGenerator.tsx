import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function StoryGenerator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('storygen');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Story Generator"
      description="Generate creative stories"
      inputLabel="Story Prompt"
      inputPlaceholder="Enter a story prompt or theme..."
      outputLabel="Generated Story"
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
