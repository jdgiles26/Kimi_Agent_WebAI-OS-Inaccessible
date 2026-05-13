import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function ResumeBuilder({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('resumebuilder');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Resume Builder"
      description="AI resume creation"
      inputLabel="Your Information"
      inputPlaceholder="Paste your experience and skills..."
      outputLabel="Generated Resume"
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
