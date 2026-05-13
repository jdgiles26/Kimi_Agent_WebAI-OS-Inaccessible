import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function CSStoTailwind({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('css2tailwind');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="CSS to Tailwind"
      description="Convert CSS to utility classes"
      inputLabel="CSS Code"
      inputPlaceholder="Paste CSS to convert..."
      inputType="code"
      outputLabel="Tailwind Classes"
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
