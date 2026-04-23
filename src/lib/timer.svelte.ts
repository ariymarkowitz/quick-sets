export type Timer = ReturnType<typeof createTimer>;

export function createTimer(getPaused: () => boolean) {
  const start = Date.now();
  let pauseAccumulated = 0;

  let sample = $state(0);
  
  function time() {
    return Date.now() - start - pauseAccumulated;
  }

  $effect.root(() => {
    $effect(() => {
      if (!getPaused()) return;
      const start = Date.now();
      return () => {
        pauseAccumulated += Date.now() - start;
      };
    });

    $effect(() => {
      if (getPaused()) return;
      const id = setInterval(() => {
        sample = Math.floor(time() / 1000);
      }, 1000);
      return () => clearInterval(id);
    });
  });

  return {
    get paused() { return getPaused(); },
    get sample() { return sample; }
  }
}