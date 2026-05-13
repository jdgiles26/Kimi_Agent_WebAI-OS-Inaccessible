import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function FormFillerAI({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('formfiller');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Form Filler AI"
      description="Auto-complete forms using context"
      inputLabel="Form Fields"
      inputPlaceholder="Describe the form fields and your context..."
      outputLabel="Filled Form"
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
