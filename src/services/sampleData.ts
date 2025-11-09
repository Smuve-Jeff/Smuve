export interface Sample {
  id: number;
  name: string;
  url: string;
  category: 'Drums' | 'Loops' | 'Vocals' | 'FX' | 'Instruments';
  tags: string[];
}

export const samples: Sample[] = [
  // Drums
  {
    id: 1,
    name: 'Classic Kick',
    url: 'https://storage.googleapis.com/smuve-samples/drums/kick_classic.wav',
    category: 'Drums',
    tags: ['kick', 'drum', 'classic', 'house']
  },
  {
    id: 2,
    name: '808 Snare',
    url: 'https://storage.googleapis.com/smuve-samples/drums/snare_808.wav',
    category: 'Drums',
    tags: ['snare', 'drum', '808', 'trap']
  },
  {
    id: 3,
    name: 'Lo-Fi Hat',
    url: 'https://storage.googleapis.com/smuve-samples/drums/hat_lofi.wav',
    category: 'Drums',
    tags: ['hat', 'hi-hat', 'drum', 'lofi', 'chillhop']
  },
  {
    id: 4,
    name: 'Acoustic Clap',
    url: 'https://storage.googleapis.com/smuve-samples/drums/clap_acoustic.wav',
    category: 'Drums',
    tags: ['clap', 'drum', 'acoustic', 'pop']
  },
  {
    id: 5,
    name: 'Deep Tom',
    url: 'https://storage.googleapis.com/smuve-samples/drums/tom_deep.wav',
    category: 'Drums',
    tags: ['tom', 'drum', 'deep', 'electronic']
  },

  // Loops
  {
    id: 10,
    name: 'Funky Bassline',
    url: 'https://storage.googleapis.com/smuve-samples/loops/loop_funky_bass.wav',
    category: 'Loops',
    tags: ['loop', 'bass', 'funky', 'disco']
  },
  {
    id: 11,
    name: 'Synthwave Melody',
    url: 'https://storage.googleapis.com/smuve-samples/loops/loop_synthwave.wav',
    category: 'Loops',
    tags: ['loop', 'synth', 'melody', 'synthwave', '80s']
  },
  {
    id: 12,
    name: 'Jazzy Chords',
    url: 'https://storage.googleapis.com/smuve-samples/loops/loop_jazz_chords.wav',
    category: 'Loops',
    tags: ['loop', 'chords', 'piano', 'jazz', 'lofi']
  },
  {
    id: 13,
    name: 'Trap Beat Full',
    url: 'https://storage.googleapis.com/smuve-samples/loops/loop_trap_beat.wav',
    category: 'Loops',
    tags: ['loop', 'beat', 'drums', 'trap', 'hip-hop']
  },
  {
    id: 14,
    name: 'Ambient Pad',
    url: 'https://storage.googleapis.com/smuve-samples/loops/loop_ambient_pad.wav',
    category: 'Loops',
    tags: ['loop', 'pad', 'ambient', 'texture', 'cinematic']
  },

  // Vocals
  {
    id: 20,
    name: "Vocal Chop - 'Hey!'",
    url: 'https://storage.googleapis.com/smuve-samples/vocals/vocal_hey.wav',
    category: 'Vocals',
    tags: ['vocal', 'chop', 'hey', 'house', 'pop']
  },
  {
    id: 21,
    name: 'Soulful Ad-lib',
    url: 'https://storage.googleapis.com/smuve-samples/vocals/vocal_soul_adlib.wav',
    category: 'Vocals',
    tags: ['vocal', 'ad-lib', 'soul', 'rnb']
  },
  {
    id: 22,
    name: "Robotic Chant - 'SMUVE'",
    url: 'https://storage.googleapis.com/smuve-samples/vocals/vocal_robot_smuve.wav',
    category: 'Vocals',
    tags: ['vocal', 'robot', 'chant', 'smuve', 'electronic']
  },

  // FX
  {
    id: 30,
    name: 'Vinyl Crackle',
    url: 'https://storage.googleapis.com/smuve-samples/fx/fx_vinyl_crackle.wav',
    category: 'FX',
    tags: ['fx', 'vinyl', 'crackle', 'lofi', 'texture']
  },
  {
    id: 31,
    name: 'Synth Riser',
    url: 'https://storage.googleapis.com/smuve-samples/fx/fx_synth_riser.wav',
    category: 'FX',
    tags: ['fx', 'riser', 'synth', 'buildup', 'edm']
  },
  {
    id: 32,
    name: 'Deep Impact',
    url: 'https://storage.googleapis.com/smuve-samples/fx/fx_deep_impact.wav',
    category: 'FX',
    tags: ['fx', 'impact', 'cinematic', 'trailer']
  },

  // Instruments
  {
    id: 40,
    name: 'Acoustic Guitar C-maj',
    url: 'https://storage.googleapis.com/smuve-samples/instruments/inst_acoustic_guitar_cmaj.wav',
    category: 'Instruments',
    tags: ['instrument', 'guitar', 'acoustic', 'chord']
  },
  {
    id: 41,
    name: 'Wurlitzer Key Lick',
    url: 'https://storage.googleapis.com/smuve-samples/instruments/inst_wurli_lick.wav',
    category: 'Instruments',
    tags: ['instrument', 'wurlitzer', 'keys', 'lick', 'epiano']
  },
  {
    id: 42,
    name: 'Plucked String Staccato',
    url: 'https://storage.googleapis.com/smuve-samples/instruments/inst_string_pizz.wav',
    category: 'Instruments',
    tags: ['instrument', 'string', 'pizzicato', 'orchestral', 'staccato']
  }
];
