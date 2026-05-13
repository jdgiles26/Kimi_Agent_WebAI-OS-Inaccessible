import { AIAppLayout, useAIProcessor } from '@/apps/AppLayout';

export default function SEOOptimizer({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const { isProcessing, output, process, progress, errorMessage, modelLabel } = useAIProcessor('seooptimizer');

  const handleProcess = (input: string) => {
    process(input);
  };

  return (
    <AIAppLayout
      title="SEO Optimizer"
      description="Suggest keyword improvements"
      inputLabel="Blog Post Content"
      inputPlaceholder="Paste your blog post or content..."
      outputLabel="SEO Suggestions"
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
