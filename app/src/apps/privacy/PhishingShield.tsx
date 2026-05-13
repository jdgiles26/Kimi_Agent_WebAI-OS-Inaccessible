import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function PhishingShield({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('phishshield');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Phishing Shield"
      description="Detect spoofed login pages"
      inputLabel="URL or Page Content"
      inputPlaceholder="Paste URL or HTML to analyze..."
      outputLabel="Security Report"
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
