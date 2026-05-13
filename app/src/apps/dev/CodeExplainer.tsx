import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function CodeExplainer({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('codeexplainer');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Code Explainer"
      description="Code to plain English"
      inputLabel="Code Snippet"
      inputPlaceholder="Paste code to explain..."
      inputType="code"
      outputLabel="Explanation"
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
