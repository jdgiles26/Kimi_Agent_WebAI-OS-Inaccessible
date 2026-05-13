import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function MemeGenerator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('memegen');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Meme Generator"
      description="AI-powered meme creation"
      inputLabel="Meme Idea"
      inputPlaceholder="Describe the meme you want to create..."
      outputLabel="Meme Concept"
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
