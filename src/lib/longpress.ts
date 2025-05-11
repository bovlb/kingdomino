export function longpress(node: HTMLElement, callback: (e: PointerEvent) => void, delay = 500) {
    let timer: ReturnType<typeof setTimeout>;
  
    function handlePointerDown(e: PointerEvent) {
      timer = setTimeout(() => callback(e), delay);
    }
  
    function cancel() {
      clearTimeout(timer);
    }
  
    node.addEventListener('pointerdown', handlePointerDown);
    node.addEventListener('pointerup', cancel);
    node.addEventListener('pointerleave', cancel);
    node.addEventListener('pointercancel', cancel);
  
    return {
      destroy() {
        cancel();
        node.removeEventListener('pointerdown', handlePointerDown);
        node.removeEventListener('pointerup', cancel);
        node.removeEventListener('pointerleave', cancel);
        node.removeEventListener('pointercancel', cancel);
      }
    };
  }