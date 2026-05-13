import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function EquationSolver({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('equationsolver');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="Equation Solver"
      description="OCR and solve math problems"
      inputLabel="Math Problem"
      inputPlaceholder="Type or describe the equation..."
      outputLabel="Solution"
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
