
import React, { useState, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import HUD from './components/HUD';
import { GameState, PlayerShipType } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedShip, setSelectedShip] = useState<PlayerShipType>(PlayerShipType.WRAITH);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [bossMessage, setBossMessage] = useState<string | null>(null);
  const [skillCharge, setSkillCharge] = useState(0);
  const [combo, setCombo] = useState(0);
  const [heat, setHeat] = useState(0);
  
  const triggerSkillRef = useRef<() => void>(() => {});
  const triggerDashRef = useRef<() => void>(() => {});

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
    // Health is initialized in GameCanvas based on ship type
    setSkillCharge(0);
    setCombo(0);
    setHeat(0);
    setBossMessage(null);
  };

  const restartGame = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex justify-center items-center font-sans">
      <div className="relative w-full h-full max-w-[600px] aspect-[2/3] bg-gray-900 shadow-2xl overflow-hidden">
        <GameCanvas 
          gameState={gameState}
          setGameState={setGameState}
          setScore={setScore}
          setHealth={setHealth}
          setBossMessage={setBossMessage}
          setSkillCharge={setSkillCharge}
          setCombo={setCombo}
          setHeat={setHeat}
          triggerSkillRef={triggerSkillRef}
          triggerDashRef={triggerDashRef}
          missionActive={gameState === GameState.PLAYING}
          selectedShip={selectedShip}
        />

        {gameState === GameState.PLAYING && (
          <HUD 
            score={score} 
            health={health} 
            bossMessage={bossMessage} 
            skillCharge={skillCharge}
            combo={combo}
            heat={heat}
            onSkillTrigger={() => triggerSkillRef.current()}
            onDashTrigger={() => triggerDashRef.current()}
          />
        )}

        {gameState === GameState.MENU && (
          <MainMenu 
            onStart={startGame} 
            selectedShip={selectedShip}
            onSelectShip={setSelectedShip}
          />
        )}

        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 text-center p-6">
             <h2 className="text-5xl text-red-600 font-bold mb-4 font-mono glitch">MISSION FAILED</h2>
             <p className="text-white text-xl mb-8">FINAL SCORE: <span className="text-cyber-neonYellow">{score}</span></p>
             <button 
               onClick={restartGame}
               className="px-8 py-3 bg-cyber-neonCyan text-black font-bold hover:bg-white transition-colors uppercase tracking-wider"
             >
               Reboot System
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
