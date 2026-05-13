import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function MeetingSummarizer({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('meetingsum');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Meeting Summarizer"
      description="Summarize conferences"
      inputLabel="Meeting Transcript"
      inputPlaceholder="Paste meeting transcript..."
      outputLabel="Summary"
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
