// services/audioContextService.ts

// Create a single, global AudioContext and Master Gain Node
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
  latencyHint: 'interactive'
});
const masterGainNode = audioContext.createGain();
const masterAnalyserNode = audioContext.createAnalyser();
masterGainNode.gain.setValueAtTime(0.8, audioContext.currentTime); // Default master volume
masterGainNode.connect(masterAnalyserNode);
masterAnalyserNode.connect(audioContext.destination);


/**
 * Ensures the AudioContext is running. Browsers often suspend AudioContexts
 * when a tab goes into the background or when there's no user interaction.
 */
export const resumeAudioContext = () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      console.log('AudioContext resumed successfully.');
    }).catch(e => console.error('Error resuming AudioContext:', e));
  } else if (audioContext.state === 'interrupted') {
    // Some browsers might put it in 'interrupted' state after a while
    audioContext.resume().then(() => {
      console.log('AudioContext resumed from interrupted state.');
    }).catch(e => console.error('Error resuming AudioContext from interrupted state:', e));
  }
};

/**
 * Sets up event listeners to resume the AudioContext when the document
 * becomes visible or on the first user interaction.
 * This function should be called once, e.g., when the application mounts.
 */
export const setupAudioContextResumeOnVisibilityChange = () => {
  // Resume when the tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      resumeAudioContext();
    }
  });

  // Also try to resume on first user interaction to unlock it (for autoplay policies)
  // Use `once: true` to ensure these listeners are removed after the first interaction
  const resume = () => {
    resumeAudioContext();
    document.removeEventListener('click', resume);
    document.removeEventListener('keydown', resume);
    document.removeEventListener('touchstart', resume);
  };
  
  document.addEventListener('click', resume);
  document.addEventListener('keydown', resume);
  document.addEventListener('touchstart', resume);
};

export { audioContext, masterGainNode, masterAnalyserNode };