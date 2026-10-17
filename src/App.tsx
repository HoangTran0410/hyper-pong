import React, { useState, useEffect } from 'react';
import PongGame from './components/PongGame';
import { GameConfig, PowerUpType, PowerUpCategory } from './types';
import { COLORS, POWERUP_COLORS, POWERUP_ICONS, POWERUP_CATEGORIES, POWERUP_DESCRIPTIONS } from './utils/constants';

// --- Menu Components ---

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
  <button 
    className={`px-8 py-3 bg-gray-800 border-2 border-gray-600 text-white font-mono text-xl uppercase tracking-widest hover:bg-gray-700 hover:border-white transition-all transform hover:scale-105 active:scale-95 ${className}`} 
    {...props} 
  />
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-gray-400 font-mono text-sm mb-2 uppercase tracking-wide">
      {children}
  </label>
);

interface SettingsViewProps {
    config: GameConfig;
    setConfig: React.Dispatch<React.SetStateAction<GameConfig>>;
    onBack: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ config, setConfig, onBack }) => {
    const [hoveredPowerUp, setHoveredPowerUp] = useState<PowerUpType | null>(null);

    const togglePowerUp = (type: PowerUpType) => {
        setConfig(prev => {
            const exists = prev.enabledPowerUpTypes.includes(type);
            const newTypes = exists 
                ? prev.enabledPowerUpTypes.filter(t => t !== type)
                : [...prev.enabledPowerUpTypes, type];
            return { ...prev, enabledPowerUpTypes: newTypes };
        });
    };

    // Group powerups
    const groupedPowerups: Record<PowerUpCategory, PowerUpType[]> = {
        Paddle: [], Ball: [], Environment: [], Hostile: []
    };
    Object.values(PowerUpType).forEach(type => {
        groupedPowerups[POWERUP_CATEGORIES[type]].push(type);
    });

    return (
    <div className="z-10 bg-black/95 p-8 rounded-2xl border border-gray-700 shadow-2xl backdrop-blur-sm max-w-5xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <h2 className="text-4xl font-bold text-white mb-6 text-center">SETTINGS</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
          {/* General Settings */}
          <div className="space-y-6">
              <h3 className="text-xl text-cyan-400 font-mono border-b border-gray-700 pb-2">GAMEPLAY</h3>
              <div>
                  <Label>Spawn Interval: {(config.powerUpSpawnRate / 1000).toFixed(1)}s</Label>
                  <input 
                      type="range" min="1000" max="15000" step="500"
                      value={config.powerUpSpawnRate}
                      onChange={(e) => setConfig({ ...config, powerUpSpawnRate: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
              </div>
              <div>
                  <Label>Max Powerups on Screen: {config.maxPowerUps}</Label>
                  <input 
                      type="range" min="5" max="50" step="1"
                      value={config.maxPowerUps}
                      onChange={(e) => setConfig({ ...config, maxPowerUps: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
              </div>
              
              {/* Description Panel - Sticky on Desktop, Static on Mobile */}
              <div className="hidden md:block mt-8 sticky top-4">
                   <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-6 min-h-[150px] flex flex-col items-center justify-center text-center shadow-lg transition-all duration-300">
                       {hoveredPowerUp ? (
                           <>
                               <div className="text-4xl mb-4">{POWERUP_ICONS[hoveredPowerUp]}</div>
                               <h4 className="text-xl font-bold text-white mb-2" style={{color: POWERUP_COLORS[hoveredPowerUp]}}>
                                   {hoveredPowerUp.replace(/_/g, ' ')}
                               </h4>
                               <p className="text-gray-300 font-mono leading-relaxed">
                                   {POWERUP_DESCRIPTIONS[hoveredPowerUp]}
                               </p>
                           </>
                       ) : (
                           <p className="text-gray-500 font-mono italic animate-pulse">
                               HOVER OVER A POWER-UP TO SEE DETAILS
                           </p>
                       )}
                   </div>
              </div>
          </div>

          {/* Powerup Toggles */}
          <div className="space-y-4">
              <h3 className="text-xl text-pink-500 font-mono border-b border-gray-700 pb-2">ENABLED POWER-UPS</h3>
              
              <div className="grid grid-cols-1 gap-6">
                  {(Object.keys(groupedPowerups) as PowerUpCategory[]).map(cat => (
                      <div key={cat} className="space-y-2">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{cat}</h4>
                          <div className="grid grid-cols-2 gap-2">
                              {groupedPowerups[cat].map(type => (
                                  <button
                                      key={type}
                                      onClick={() => togglePowerUp(type)}
                                      onMouseEnter={() => setHoveredPowerUp(type)}
                                      onMouseLeave={() => setHoveredPowerUp(null)}
                                      className={`flex items-center gap-2 p-2 rounded border transition-colors text-xs font-bold relative group ${
                                          config.enabledPowerUpTypes.includes(type) 
                                          ? 'bg-gray-800 border-gray-500 text-white' 
                                          : 'bg-black border-gray-800 text-gray-600'
                                      }`}
                                  >
                                      <div className="w-6 h-6 flex items-center justify-center rounded text-base flex-shrink-0" style={{ backgroundColor: POWERUP_COLORS[type] }}>
                                          {POWERUP_ICONS[type]}
                                      </div>
                                      <span className="truncate">{type.replace(/_/g, ' ')}</span>
                                      
                                      {/* Mobile-only simple tooltip since the big panel is hidden on small screens */}
                                      <div className="md:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-xs text-white rounded border border-gray-600 hidden group-hover:block z-50 pointer-events-none shadow-xl">
                                          {POWERUP_DESCRIPTIONS[type]}
                                      </div>
                                  </button>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
            <Button onClick={onBack} className="bg-gray-700 hover:bg-gray-600">
                BACK TO MENU
            </Button>
        </div>
    </div>
    );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'menu' | 'settings' | 'playing' | 'gameover'>('menu');
  const [lastWinner, setLastWinner] = useState<{ winner: string, score: { left: number, right: number } } | null>(null);
  
  const [config, setConfig] = useState<GameConfig>(() => {
    // Auto-load config from localStorage
    const savedConfig = localStorage.getItem('hyperPongConfig');
    if (savedConfig) {
        try {
            return JSON.parse(savedConfig);
        } catch (e) {
            console.error('Failed to parse config from local storage', e);
        }
    }
    // Default config
    return {
      leftControl: 'wasd',
      rightControl: 'ai',
      aiDifficulty: 'medium',
      targetScore: 10,
      enablePowerups: true,
      enabledPowerUpTypes: Object.values(PowerUpType),
      powerUpSpawnRate: 4000,
      maxPowerUps: 20,
    };
  });

  // Auto-save config
  useEffect(() => {
      localStorage.setItem('hyperPongConfig', JSON.stringify(config));
  }, [config]);

  const startGame = () => {
      setGameState('playing');
  };

  const handleGameOver = (winner: 'left' | 'right', score: { left: number; right: number }) => {
      setLastWinner({ winner, score });
      setGameState('gameover');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
      </div>

      {gameState === 'menu' && (
        <div className="z-10 bg-black/80 p-12 rounded-2xl border border-gray-700 shadow-2xl backdrop-blur-sm max-w-lg w-full">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500 text-center mb-8 drop-shadow-lg" style={{ fontFamily: '"Arial Black", sans-serif' }}>
            HYPER PONG
          </h1>
          
          <div className="space-y-6">
            
            {/* Player 1 Config */}
            <div>
                 <Label>Player 1 (Left)</Label>
                 <div className="flex gap-2">
                    {['wasd', 'mouse', 'ai'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setConfig({...config, leftControl: mode as any})}
                            className={`flex-1 py-1 text-xs font-bold border rounded ${config.leftControl === mode ? 'bg-pink-600 border-pink-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                        >
                            {mode.toUpperCase()}
                        </button>
                    ))}
                 </div>
            </div>

            {/* Player 2 Config */}
            <div>
                 <Label>Player 2 (Right)</Label>
                 <div className="flex gap-2">
                    {['arrows', 'mouse', 'ai'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setConfig({...config, rightControl: mode as any})}
                            className={`flex-1 py-1 text-xs font-bold border rounded ${config.rightControl === mode ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                        >
                            {mode.toUpperCase()}
                        </button>
                    ))}
                 </div>
            </div>

            {/* AI Difficulty - Show if ANY player is AI */}
            {(config.leftControl === 'ai' || config.rightControl === 'ai') && (
                <div>
                    <Label>AI Difficulty</Label>
                    <input 
                        type="range" min="0" max="3" step="1"
                        value={['easy', 'medium', 'hard', 'impossible'].indexOf(config.aiDifficulty)}
                        onChange={(e) => setConfig({ ...config, aiDifficulty: ['easy', 'medium', 'hard', 'impossible'][parseInt(e.target.value)] as any })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="text-right text-purple-400 font-mono mt-1 text-xs">{config.aiDifficulty.toUpperCase()}</div>
                </div>
            )}

            <div>
                <Label>Target Score: <span className="text-white">{config.targetScore === 0 ? 'INFINITE' : config.targetScore}</span></Label>
                <input 
                    type="range" min="0" max="21" step="1"
                    value={config.targetScore}
                    onChange={(e) => setConfig({ ...config, targetScore: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-500"
                />
            </div>

            <div className="flex items-center justify-between">
                <Label>Enable Power-Ups</Label>
                <div className="flex gap-2">
                    <button 
                         onClick={() => setGameState('settings')}
                         disabled={!config.enablePowerups}
                         className={`px-3 py-1 text-xs border rounded transition-colors ${config.enablePowerups ? 'border-gray-500 text-gray-300 hover:text-white' : 'border-gray-800 text-gray-700'}`}
                    >
                        CONFIG
                    </button>
                    <button 
                        onClick={() => setConfig({ ...config, enablePowerups: !config.enablePowerups })}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${config.enablePowerups ? 'bg-green-500' : 'bg-gray-600'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${config.enablePowerups ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>

            <Button onClick={startGame} className="w-full mt-8 bg-gradient-to-r from-pink-600 to-cyan-600 border-none hover:from-pink-500 hover:to-cyan-500">
                START GAME
            </Button>

            {window.self === window.top && (
              <a
                href="https://fbaio.org/#/desktop"
                target="_blank"
                rel="noopener"
                className="block text-center text-xs text-gray-500 hover:text-white font-mono uppercase tracking-wide"
              >
                More tools &amp; games: AIO Desktop
              </a>
            )}
          </div>
        </div>
      )}

      {gameState === 'settings' && <SettingsView config={config} setConfig={setConfig} onBack={() => setGameState('menu')} />}

      {gameState === 'playing' && (
        <PongGame 
            config={config} 
            onGameOver={handleGameOver} 
            onExit={() => setGameState('menu')}
        />
      )}

      {gameState === 'gameover' && lastWinner && (
         <div className="z-10 bg-black/90 p-12 rounded-2xl border-2 border-white/20 text-center animate-bounce-in">
             <h2 className="text-5xl font-bold text-white mb-4">GAME OVER</h2>
             <p className="text-2xl font-mono text-gray-300 mb-8">
                 {lastWinner.winner === 'left' ? <span style={{color: COLORS.paddleLeft}}>PLAYER 1</span> : <span style={{color: COLORS.paddleRight}}>PLAYER 2</span>} WINS!
             </p>
             <div className="text-6xl font-mono font-bold text-white mb-8">
                 {lastWinner.score.left} - {lastWinner.score.right}
             </div>
             <Button onClick={() => setGameState('menu')}>MAIN MENU</Button>
         </div>
      )}
    </div>
  );
};

export default App;
