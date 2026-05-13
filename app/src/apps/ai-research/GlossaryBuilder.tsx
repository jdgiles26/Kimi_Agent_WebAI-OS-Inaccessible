import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function GlossaryBuilder({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('glossary');

  const handleBuild = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Glossary Builder"
      description="Automatically define complex jargon"
      inputLabel="Text with Technical Terms"
      inputPlaceholder="Paste text containing technical jargon..."
      inputType="textarea"
      outputLabel="Generated Glossary"
      isProcessing={isProcessing}
      onSubmit={handleBuild}
      output={output}
      actionLabel="Build Glossary"
      modelLabel={modelLabel}
      progress={progress}
      errorMessage={errorMessage}
      webGPUSupported={webGPUStatus?.supported}
    />
  );
}
