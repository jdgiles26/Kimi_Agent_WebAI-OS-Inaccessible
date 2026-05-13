import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function BugHunter({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('bughunter');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Bug Hunter"
      description="Scan code for vulnerabilities"
      inputLabel="Code to Scan"
      inputPlaceholder="Paste code to scan..."
      inputType="code"
      outputLabel="Vulnerability Report"
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
