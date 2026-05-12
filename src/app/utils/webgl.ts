export function canCreateWebGLContext() {
  if (typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const context = (
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    ) as WebGLRenderingContext | WebGL2RenderingContext | null;

    if (!context) return false;

    const loseContext = context.getExtension?.('WEBGL_lose_context');
    loseContext?.loseContext();
    return true;
  } catch {
    return false;
  }
}
