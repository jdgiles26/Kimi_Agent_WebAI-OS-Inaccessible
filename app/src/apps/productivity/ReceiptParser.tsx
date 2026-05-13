import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function ReceiptParser({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('receiptparser');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Receipt Parser"
      description="Extract from PDFs and images"
      inputLabel="Receipt Content"
      inputPlaceholder="Paste receipt text or describe..."
      outputLabel="Parsed Receipt"
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
