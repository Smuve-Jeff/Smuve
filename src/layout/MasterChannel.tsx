import React from 'react';
import { useGlobalAudio } from '../../services/GlobalAudioContext';
import StereoLevelMeter from '../common/StereoLevelMeter';
import Card from '../common/Card';

const MasterChannel: React.FC = () => {
  const { masterVolume, setMasterVolume, masterAnalyserNode } = useGlobalAudio();

  return (
    <div className="fixed bottom-4 left-4 z-40 hidden md:block">
      <Card className="bg-gray-900/80 backdrop-blur-sm border-indigo-500/30 shadow-lg shadow-indigo-500/20 p-4 w-48">
        <h4 className="text-center font-bold text-indigo-300 mb-2">Master</h4>
        <div className="flex items-center gap-3">
          <div className="flex-grow flex flex-col items-center gap-2">
            <input
              type="range"
              min={0}
              max={1.2}
              step={0.01}
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              className="w-4 h-24 appearance-none cursor-pointer bg-gray-700 rounded-full
                  [&::-webkit-slider-runnable-track]:bg-gray-700 [&::-webkit-slider-runnable-track]:w-4 [&::-webkit-slider-runnable-track]:rounded-full
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow-lg"
              orient="vertical"
              aria-label="Master Volume"
            />
             <label className="text-xs text-gray-400">VOL</label>
          </div>
          <StereoLevelMeter analyserNode={masterAnalyserNode} />
        </div>
      </Card>
    </div>
  );
};

export default React.memo(MasterChannel);