import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function ToneShifter({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('toneshifter');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Tone Shifter"
      description="Rewrite text in any tone"
      inputLabel="Text to Rewrite"
      inputPlaceholder="Paste text and specify desired tone..."
      outputLabel="Rewritten Text"
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
