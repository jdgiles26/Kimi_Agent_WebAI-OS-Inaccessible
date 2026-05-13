import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function PromptUpgrader({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('promptupgrader');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Prompt Upgrader"
      description="Enhance prompts for LLMs"
      inputLabel="Basic Prompt"
      inputPlaceholder="Enter your basic prompt..."
      outputLabel="Enhanced Prompt"
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
