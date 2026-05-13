import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function MusicGenerator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('musicgen');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Music Generator"
      description="Ambient music from text"
      inputLabel="Mood or Theme"
      inputPlaceholder="Describe the music you want..."
      outputLabel="Generated Music Notes"
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
