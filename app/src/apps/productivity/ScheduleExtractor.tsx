import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function ScheduleExtractor({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('schedulex');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Schedule Extractor"
      description="Parse dates from text"
      inputLabel="Text with Dates"
      inputPlaceholder="Paste text containing dates and events..."
      outputLabel="Extracted Events"
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
