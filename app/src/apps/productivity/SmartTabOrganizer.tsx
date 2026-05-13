import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function TabOrganizer({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('taborganizer');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Tab Organizer"
      description="Group tabs by context"
      inputLabel="Tab List"
      inputPlaceholder="List your open tabs or topics..."
      outputLabel="Organized Groups"
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
