import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function APIGuru({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('apiguru');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="API Guru"
      description="Generate curl/fetch requests"
      inputLabel="API Documentation"
      inputPlaceholder="Paste API docs or describe endpoint..."
      outputLabel="Generated Request"
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
