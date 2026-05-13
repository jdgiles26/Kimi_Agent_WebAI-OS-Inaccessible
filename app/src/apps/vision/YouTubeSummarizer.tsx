import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function YTSummarizer({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('ytsummarizer');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="YT Summarizer"
      description="Generate chapter markers from videos"
      inputLabel="YouTube URL"
      inputPlaceholder="Paste YouTube video URL..."
      outputLabel="Video Summary"
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
