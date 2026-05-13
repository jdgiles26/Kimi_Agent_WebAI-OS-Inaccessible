import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function LogoGenerator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('logogen');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Logo Generator"
      description="Logo concepts from descriptions"
      inputLabel="Brand Description"
      inputPlaceholder="Describe your brand and style..."
      outputLabel="Logo Concepts"
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
