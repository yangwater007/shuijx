/** 基础设施层 — 轻量事件总线，用于同层模块间通信 */

type EventHandler = (...args: unknown[]) => void;

class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  /** 订阅事件，返回取消订阅函数 */
  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  /** 取消订阅 */
  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  /** 触发事件 */
  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch (err) {
        console.error(`[EventBus] 事件 "${event}" 处理异常:`, err);
      }
    });
  }

  /** 清除所有订阅 */
  clear(): void {
    this.listeners.clear();
  }
}

/** 全局单例事件总线 */
const eventBus = new EventBus();
export default eventBus;
export { EventBus };
