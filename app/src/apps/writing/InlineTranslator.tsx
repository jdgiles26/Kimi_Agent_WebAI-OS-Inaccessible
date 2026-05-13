import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function Translator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('translator');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Translator"
      description="Translate text preserving layout"
      inputLabel="Text to Translate"
      inputPlaceholder="Enter text and target language..."
      outputLabel="Translation"
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
