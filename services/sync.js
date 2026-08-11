(() => {
  "use strict";
  const cloud = window.KoiCloud;
  if (!cloud) return;

  const QUEUE_KEY = "koi_cloud_queue_v1";

  function loadQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  cloud.sync = {
    pendingCount() {
      return loadQueue().length;
    },

    enqueue(type, payload) {
      const queue = loadQueue();
      queue.push({
        id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        payload,
        attempts: 0,
        createdAt: Date.now()
      });
      saveQueue(queue);
    },

    async flush() {
      if (!cloud.configured || !cloud.runtime.session || !navigator.onLine) return;
      const pairId = cloud.runtime.pair?.id;
      if (!pairId || cloud.runtime.syncing) return;

      cloud.runtime.syncing = true;
      let queue = loadQueue();
      const remaining = [];

      for (const job of queue) {
        try {
          if (job.type === "littleThing:create") {
            await cloud.littleThings.create(pairId, job.payload);
          } else if (job.type === "littleThing:delete") {
            await cloud.littleThings.remove(job.payload.id);
          }
        } catch (error) {
          job.attempts = (job.attempts || 0) + 1;
          job.lastError = String(error?.message || error);
          remaining.push(job);
        }
      }

      saveQueue(remaining);
      cloud.runtime.syncing = false;
    },

    clear() {
      saveQueue([]);
    }
  };
})();
