export interface Sample {
  id: number;
  name: string;
  url: string;
  category: 'Drums' | 'Loops' | 'Vocals' | 'FX' | 'Instruments' | 'User Uploads';
  tags: string[];
}

export const samples: Sample[] = [
  // Drums
  { id: 1, name: 'Deep Kick', url: 'https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/drum-samples/kick.wav', category: 'Drums', tags: ['kick', 'bass drum', 'thump'] },
  { id: 2, name: 'Crisp Snare', url: 'https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/drum-samples/snare.wav', category: 'Drums', tags: ['snare', 'hit', 'pop'] },
  { id: 3, name: 'Sharp Hi-Hat', url: 'https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/drum-samples/hihat.wav', category: 'Drums', tags: ['hihat', 'hat', 'cymbal', 'tick'] },
  { id: 4, name: '808 Clap', url: 'https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/808/clap.mp3', category: 'Drums', tags: ['clap', '808', 'percussion'] },
  { id: 5, name: 'Acoustic Crash', url: 'https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/acoustic/crash.mp3', category: 'Drums', tags: ['crash', 'cymbal', 'acoustic'] },
  { id: 19, name: '909 Kick', url: 'https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/909/kick.mp3', category: 'Drums', tags: ['kick', '909', 'electronic', 'techno'] },
  { id: 20, name: 'Linn Snare', url: 'https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/linn/snare.mp3', category: 'Drums', tags: ['snare', 'linn', 'vintage', '80s'] },
  { id: 21, name: 'Acoustic Ride', url: 'https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/acoustic/ride.mp3', category: 'Drums', tags: ['ride', 'cymbal', 'acoustic', 'jazz'] },
  { id: 22, name: '808 Tom', url: 'https://webaudiomodules.org/sites/default/files/sounds/808/tom-low.mp3', category: 'Drums', tags: ['tom', '808', 'trap', 'low'] },

  // Loops
  { id: 6, name: 'Techno Beat', url: 'https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/loops/techno.wav', category: 'Loops', tags: ['techno', 'drum loop', 'beat', 'electronic'] },
  { id: 7, name: 'Funky Drum Loop', url: 'https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/loops/funky-drum-loop.wav', category: 'Loops', tags: ['funk', 'drum loop', 'beat', 'acoustic'] },
  { id: 8, name: 'Lofi Beat 90bpm', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/loops/lofi-beat-90.wav', category: 'Loops', tags: ['lofi', 'hiphop', 'beat', 'chill'] },
  { id: 9, name: 'House Groove 120bpm', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/loops/house-beat-120.wav', category: 'Loops', tags: ['house', 'dance', 'beat', 'groovy'] },
  { id: 23, name: 'Ambient Pad Loop', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/loops/ambient-pad.wav', category: 'Loops', tags: ['ambient', 'pad', 'texture', 'drone'] },
  { id: 24, name: 'Synth Arp 110bpm', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/loops/synth-arp-110.wav', category: 'Loops', tags: ['synth', 'arp', 'melodic', 'electronic'] },
  { id: 25, name: 'Jungle Break 160bpm', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/loops/jungle-break-160.wav', category: 'Loops', tags: ['jungle', 'dnb', 'breakbeat', 'fast'] },
  { id: 26, name: 'Piano Melody Loop', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/loops/piano-loop-sad.wav', category: 'Loops', tags: ['piano', 'melodic', 'sad', 'emotional'] },

  // Vocals
  { id: 10, name: 'Vocal Ahh', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/vocals/ahh.wav', category: 'Vocals', tags: ['vocal', 'ahh', 'choir', 'pad'] },
  { id: 11, name: 'Vocal Hey', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/vocals/hey.wav', category: 'Vocals', tags: ['vocal', 'hey', 'shout', 'chant'] },
  { id: 12, name: 'Vocal Ooh', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/vocals/ooh.wav', category: 'Vocals', tags: ['vocal', 'ooh', 'choir', 'texture'] },
  { id: 13, name: 'Glitch Vocal Snippet', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/vocals/glitch-cut.wav', category: 'Vocals', tags: ['vocal', 'glitch', 'cut', 'electronic'] },
  { id: 27, name: 'Vocal Yeah', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/vocals/yeah.wav', category: 'Vocals', tags: ['vocal', 'yeah', 'one shot', 'hype'] },
  { id: 28, name: 'Vocal Adlib', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/vocals/adlib-1.wav', category: 'Vocals', tags: ['vocal', 'adlib', 'phrase', 'rap'] },

  // FX
  { id: 14, name: 'Synth Laser', url: 'https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/sfx/laser.wav', category: 'FX', tags: ['sfx', 'laser', 'synth', 'zap'] },
  { id: 15, name: 'Glitch Hit', url: 'https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/sfx/glitch.wav', category: 'FX', tags: ['sfx', 'glitch', 'hit', 'stutter'] },
  { id: 16, name: 'Vinyl Crackle', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/fx/vinyl-crackle.wav', category: 'FX', tags: ['sfx', 'vinyl', 'noise', 'texture', 'lofi'] },
  { id: 17, name: 'White Noise Riser', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/fx/noise-riser.wav', category: 'FX', tags: ['sfx', 'riser', 'sweep', 'noise', 'transition'] },
  { id: 18, name: 'Deep Impact', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/fx/deep-impact.wav', category: 'FX', tags: ['sfx', 'impact', 'hit', 'boom', 'sub'] },
  { id: 29, name: 'Explosion', url: 'https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/sfx/explosion.wav', category: 'FX', tags: ['sfx', 'explosion', 'boom', 'cinematic'] },
  { id: 30, name: 'Reverse Cymbal', url: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/fx/reverse-cymbal.wav', category: 'FX', tags: ['sfx', 'reverse', 'cymbal', 'transition', 'swell'] },

  // Instruments
  { id: 31, name: 'Acoustic Guitar C', url: 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts/FatBoy/acoustic_guitar_nylon-mp3/C4.mp3', category: 'Instruments', tags: ['guitar', 'acoustic', 'nylon', 'C4'] },
  { id: 32, name: 'Synth Pad A', url: 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts/FatBoy/pad_2_warm-mp3/A4.mp3', category: 'Instruments', tags: ['synth', 'pad', 'warm', 'A4'] },
  { id: 33, name: 'Marimba G', url: 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts/FatBoy/marimba-mp3/G4.mp3', category: 'Instruments', tags: ['marimba', 'percussion', 'melodic', 'G4'] },
  { id: 34, name: 'Muted Trumpet F', url: 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts/FatBoy/muted_trumpet-mp3/F4.mp3', category: 'Instruments', tags: ['trumpet', 'brass', 'muted', 'jazz', 'F4'] },
  { id: 35, name: '8-Bit Sawtooth C', url: 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts/FatBoy/lead_2_sawtooth-mp3/C5.mp3', category: 'Instruments', tags: ['synth', '8-bit', 'chiptune', 'saw', 'C5'] },
];