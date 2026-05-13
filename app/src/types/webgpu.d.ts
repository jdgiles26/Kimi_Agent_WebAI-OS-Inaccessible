interface Navigator {
  gpu?: GPU;
}

interface GPU {
  requestAdapter(): Promise<GPUAdapter | null>;
}

interface GPUAdapter {
  requestAdapterInfo(): Promise<GPUAdapterInfo>;
}

interface GPUAdapterInfo {
  vendor?: string;
  architecture?: string;
  description?: string;
}
