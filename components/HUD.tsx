
import React from 'react';

interface HUDProps {
  score: number;
  health: number;
  bossMessage: string | null;
  skillCharge?: number; // 0-100
  combo?: number;
  heat?: number; // New: 0-100
  onSkillTrigger?: () => void;
  onDashTrigger?: () => void;
}

const HUD: React.FC<HUDProps> = ({ score, health, bossMessage, skillCharge = 0, combo = 0, heat = 0, onSkillTrigger, onDashTrigger }) => {
  const isSkillReady = skillCharge >= 100;
  const isOverclocked = heat >= 100;
  const isRegenerating = heat > 50 && health < 100;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 overflow-hidden">
      {/* Top Bar */}
      <div className="flex justify-between items-start w-full z-10">
        {/* Health & Skill */}
        <div className="flex flex-col w-1/3 max-w-[200px]">
          <div className="text-cyber-neonGreen text-xs font-mono mb-1 flex justify-between">
             <span>INTEGRITY</span>
             {isRegenerating && <span className="animate-pulse text-white">REPAIRING...</span>}
          </div>
          <div className="w-full h-3 bg-gray-900 border border-gray-700 skew-x-[-15deg]">
            <div 
              className="h-full bg-gradient-to-r from-green-600 to-cyber-neonGreen transition-all duration-300 ease-out"
              style={{ width: `${Math.max(0, health)}%` }}
            />
          </div>
          
          <div className="mt-3">
            <div className="text-cyber-neonYellow text-xs font-mono mb-1 flex justify-between">
              <span>EMP CHARGE</span>
              {isSkillReady && <span className="animate-pulse font-bold">READY</span>}
            </div>
            <div className="w-full h-2 bg-gray-900 border border-gray-700 skew-x-[-15deg]">
               <div 
                  className={`h-full transition-all duration-200 ${isSkillReady ? 'bg-white shadow-[0_0_10px_#fff]' : 'bg-cyber-neonYellow'}`}
                  style={{ width: `${Math.min(100, skillCharge)}%` }}
               />
            </div>
          </div>
        </div>

        {/* Center Heat Bar */}
        <div className="absolute left-1/2 transform -translate-x-1/2 top-2 flex flex-col items-center w-1/3">
           <div className={`text-xs font-bold tracking-widest ${isOverclocked ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
             {isOverclocked ? 'FEVER MODE' : 'HEAT SYNC'}
           </div>
           <div className="w-full h-2 bg-gray-900 border border-gray-800 mt-1">
              <div 
                className="h-full transition-all duration-100 ease-linear"
                style={{ 
                  width: `${heat}%`, 
                  backgroundColor: isOverclocked ? '#ff0000' : `rgb(${255 * (heat/100)}, ${100 * (heat/100)}, 0)`,
                  boxShadow: isOverclocked ? '0 0 10px #ff0000' : 'none'
                }}
              />
           </div>
        </div>

        {/* Score & Combo */}
        <div className="text-right">
           <div className="text-xs text-cyber-neonPink font-mono">SCORE</div>
           <div className="text-2xl md:text-3xl font-bold text-white font-mono tracking-widest drop-shadow-[0_0_5px_rgba(255,0,255,0.8)]">
             {score.toString().padStart(7, '0')}
           </div>
           
           <div className={`transition-opacity duration-200 ${combo > 1 ? 'opacity-100' : 'opacity-0'}`}>
              <div className="text-2xl font-black italic text-yellow-400 tracking-tighter drop-shadow-md animate-pulse">
                 {combo}x COMBO
              </div>
           </div>
        </div>
      </div>

      {/* Boss Message */}
      {bossMessage && (
        <div className="absolute top-1/4 left-0 right-0 flex justify-center items-center pointer-events-none">
          <div className="bg-black/80 border-y-2 border-red-600 text-red-500 p-4 text-center w-full animate-pulse">
            <div className="text-xs font-bold tracking-[0.5em] mb-2 text-white">WARNING</div>
            <div className="text-xl md:text-3xl font-mono font-bold glitch text-red-500 uppercase">
              "{bossMessage}"
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Controls */}
      <div className="absolute bottom-8 right-8 pointer-events-auto flex gap-4">
         <button
            onClick={onDashTrigger}
            className="w-16 h-16 rounded-full border-2 border-cyber-neonCyan bg-cyber-neonCyan/20 text-cyber-neonCyan flex items-center justify-center font-bold text-xs font-mono active:scale-95 transition-transform"
         >
           DASH
         </button>
         
         <button
            onClick={onSkillTrigger}
            disabled={!isSkillReady}
            className={`
              w-20 h-20 rounded-full border-2 flex items-center justify-center font-bold text-sm font-mono transition-all duration-200
              ${isSkillReady 
                ? 'bg-cyber-neonYellow/20 border-cyber-neonYellow text-cyber-neonYellow shadow-[0_0_20px_rgba(255,255,0,0.5)] scale-110 animate-pulse active:scale-95' 
                : 'bg-gray-900/50 border-gray-700 text-gray-500 scale-100'}
            `}
         >
           EMP
         </button>
      </div>
    </div>
  );
};

export default HUD;
