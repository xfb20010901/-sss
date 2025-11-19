
import React, { useEffect, useState } from 'react';
import { generateMissionBriefing } from '../services/geminiService';
import { MissionData, PlayerShipType } from '../types';
import { SHIP_STATS } from '../constants';

interface MainMenuProps {
  onStart: () => void;
  selectedShip: PlayerShipType;
  onSelectShip: (ship: PlayerShipType) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, selectedShip, onSelectShip }) => {
  const [mission, setMission] = useState<MissionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMission = async () => {
      setLoading(true);
      try {
        const data = await generateMissionBriefing();
        setMission(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    loadMission();
  }, []);

  const ships = Object.values(PlayerShipType);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyber-black/95 z-50 p-4 text-center overflow-y-auto">
      <h1 className="text-4xl md:text-5xl font-bold text-cyber-neonCyan mb-4 font-mono animate-pulse-fast tracking-tighter glitch" style={{textShadow: '0 0 10px #00ffff'}}>
        CYBER<span className="text-cyber-neonPink">WING</span>
      </h1>
      <div className="text-xs text-gray-500 tracking-[0.5em] mb-6">SQUADRON UPDATE v3.0</div>
      
      {/* Ship Selector */}
      <div className="w-full max-w-md mb-6">
         <div className="flex justify-center items-center gap-2 mb-2">
            {ships.map(ship => (
               <button 
                 key={ship}
                 onClick={() => onSelectShip(ship)}
                 className={`w-3 h-3 rounded-full transition-all ${selectedShip === ship ? 'bg-cyber-neonCyan scale-150 shadow-[0_0_5px_#00ffff]' : 'bg-gray-700'}`}
               />
            ))}
         </div>
         <div className="bg-gray-900/80 border border-gray-600 p-4 rounded-lg relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyber-neonCyan"></div>
            <h3 className="text-2xl font-bold font-mono mb-1" style={{color: SHIP_STATS[selectedShip].color}}>
               {SHIP_STATS[selectedShip].name}
            </h3>
            <p className="text-gray-300 text-sm mb-3">{SHIP_STATS[selectedShip].description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400">
               <div className="flex justify-between"><span>HULL:</span> <span className="text-white">{SHIP_STATS[selectedShip].maxHealth}</span></div>
               <div className="flex justify-between"><span>SHIELD:</span> <span className="text-white">{SHIP_STATS[selectedShip].maxShield}</span></div>
               <div className="flex justify-between"><span>SPEED:</span> <span className="text-white">{(SHIP_STATS[selectedShip].speedMult * 100).toFixed(0)}%</span></div>
               <div className="flex justify-between"><span>WEAPON:</span> <span className="text-white">{SHIP_STATS[selectedShip].startWeapon}</span></div>
            </div>
         </div>
      </div>

      <div className="bg-cyber-dark border-2 border-cyber-neonPink p-4 max-w-md w-full rounded shadow-[0_0_20px_rgba(255,0,255,0.3)] mb-8 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-neonPink to-transparent animate-[scanline_2s_linear_infinite]"></div>
         
         {loading ? (
           <div className="text-cyber-neonGreen font-mono animate-pulse text-sm">
             [DECRYPTING MISSION DATA...]
           </div>
         ) : mission ? (
           <div className="text-left font-mono">
             <h2 className="text-lg text-cyber-neonYellow mb-1 border-b border-gray-700 pb-1">
               MISSION: {mission.title.toUpperCase()}
             </h2>
             <div className="text-cyber-neonCyan text-xs">
               <span className="font-bold">OBJECTIVE:</span> {mission.objective}
             </div>
           </div>
         ) : (
            <div className="text-red-500 font-mono text-sm">CONNECTION FAILED.</div>
         )}
      </div>

      <button 
        onClick={onStart}
        disabled={loading}
        className="group relative px-8 py-4 bg-transparent overflow-hidden border-2 border-cyber-neonCyan text-cyber-neonCyan font-bold text-xl tracking-widest hover:bg-cyber-neonCyan hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="relative z-10">{loading ? 'INITIALIZING...' : 'LAUNCH MISSION'}</span>
        <div className="absolute inset-0 h-full w-full bg-cyber-neonCyan/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
      </button>
    </div>
  );
};

export default MainMenu;
