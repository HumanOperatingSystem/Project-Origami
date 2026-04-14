import React, { useState } from 'react';
import { Icon } from './Icons';

interface SettingsDrawerProps {
  globalStiffness: number;
  setGlobalStiffness: (val: number) => void;
  globalContractility: number;
  setGlobalContractility: (val: number) => void;
  // NEW PROPS
  gravity: number;
  setGravity: (val: number) => void;
  friction: number;
  setFriction: (val: number) => void;
  rotationalDrag: number;
  setRotationalDrag: (val: number) => void;
  shapeMemory?: number;
  setShapeMemory?: (val: number) => void;
  density?: number;
  setDensity?: (val: number) => void;

  gripDepletion?: number;
  setGripDepletion?: (val: number) => void;
  gripRecharge?: number;
  setGripRecharge?: (val: number) => void;

  foodSpawnCount: number;
  setFoodSpawnCount: (val: number) => void;
  foodSpawnRadius: number;
  setFoodSpawnRadius: (val: number) => void;
  foodSpawnMinHeight: number;
  setFoodSpawnMinHeight: (val: number) => void;
  foodSpawnMaxHeight: number;
  setFoodSpawnMaxHeight: (val: number) => void;
  visionRadius: number;
  setVisionRadius: (val: number) => void;
  eatRadius: number; 
  setEatRadius: (val: number) => void; 
  
  baseDecay: number;
  setBaseDecay: (val: number) => void;
  movementCost: number;
  setMovementCost: (val: number) => void;
  foodEnergy: number;
  setFoodEnergy: (val: number) => void;

  showBestOnly: boolean;
  onToggleBestOnly: () => void;

  showVision: boolean;
  setShowVision: (val: boolean) => void;
  showMouth: boolean;
  setShowMouth: (val: boolean) => void;

  onSave: () => void;
  onLoad: (file: File) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) props.onLoad(file);
      if (e.target) e.target.value = '';
  };

  return (
    <>
        {/* TOP RIGHT CONTROLS */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            
            {/* Show Best Only Toggle */}
            <button
                onClick={props.onToggleBestOnly}
                className={`p-2 rounded-full transition-all duration-300 shadow-lg ${
                    props.showBestOnly 
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                    : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Focus Champion"
            >
                {/* Reusing Eye icon, but maybe colored differently when active */}
                <Icon name="eye" className="w-6 h-6" />
            </button>

            {/* Settings Toggle */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-full transition-all duration-300 shadow-lg ${
                    isOpen ? 'bg-slate-700 text-white rotate-90' : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Settings"
            >
                <Icon name="settings" className="w-6 h-6" />
            </button>
        </div>

        {/* Drawer Panel */}
        <div className={`absolute top-0 right-0 h-full w-80 bg-slate-900/95 backdrop-blur shadow-2xl border-l border-slate-800 transform transition-transform duration-300 ease-in-out z-40 p-6 overflow-y-auto ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
            <h2 className="text-xl font-bold text-white mb-6 mt-12">Settings</h2>

            {/* Physics Section */}
            <Section title="Physics Engine">
                <Slider label="Bone Stiffness" value={props.globalStiffness} min={0.1} max={2.0} step={0.1} onChange={props.setGlobalStiffness} color="accent-blue-500" />
                <Slider label="Muscle Power" value={props.globalContractility} min={0.0} max={6.0} step={0.1} onChange={props.setGlobalContractility} color="accent-purple-500" />
                {props.shapeMemory !== undefined && props.setShapeMemory && (
                     <Slider label="Structure Memory" value={props.shapeMemory} min={0.0} max={2.0} step={0.1} onChange={props.setShapeMemory} color="accent-indigo-500" />
                )}
                {props.density !== undefined && props.setDensity && (
                     <Slider label="Creature Density" value={props.density} min={0.5} max={3.0} step={0.1} onChange={props.setDensity} color="accent-blue-400" />
                )}
            </Section>

            {/* NEW: World Forces */}
            <Section title="World Forces">
                <Slider label="Gravity Strength" value={props.gravity} min={0.0} max={2000.0} step={10.0} onChange={props.setGravity} color="accent-red-500" />
                <Slider label="Air Resistance" value={props.friction} min={0.80} max={0.99} step={0.01} onChange={props.setFriction} color="accent-teal-500" />
                <Slider label="Stability (Gyro)" value={props.rotationalDrag} min={0.0} max={2.0} step={0.01} onChange={props.setRotationalDrag} color="accent-yellow-500" />
                
                {props.gripDepletion !== undefined && props.setGripDepletion && (
                    <Slider label="Grip Stamina (Drain)" value={props.gripDepletion} min={0.1} max={5.0} step={0.1} onChange={props.setGripDepletion} color="accent-orange-500" />
                )}
                {props.gripRecharge !== undefined && props.setGripRecharge && (
                    <Slider label="Grip Recovery" value={props.gripRecharge} min={0.001} max={0.1} step={0.001} onChange={props.setGripRecharge} color="accent-lime-500" />
                )}
            </Section>

            {/* Environment Section */}
            <Section title="Environment">
                <Slider label="Food Count" value={props.foodSpawnCount} min={10} max={100} step={1} onChange={props.setFoodSpawnCount} color="accent-yellow-500" />
                <Slider label="Spawn Radius" value={props.foodSpawnRadius} min={2.0} max={10.0} step={0.5} onChange={props.setFoodSpawnRadius} color="accent-orange-500" />
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/50 mt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Food Height Range</span>
                    <Slider label="Min Height" value={props.foodSpawnMinHeight} min={0.1} max={5.0} step={0.1} onChange={props.setFoodSpawnMinHeight} color="accent-lime-500" />
                    <Slider label="Max Height" value={props.foodSpawnMaxHeight} min={0.1} max={10.0} step={0.1} onChange={props.setFoodSpawnMaxHeight} color="accent-lime-500" />
                </div>
                <Slider label="Vision Range" value={props.visionRadius} min={1.0} max={10.0} step={0.5} onChange={props.setVisionRadius} color="accent-teal-500" />
                <Slider label="Mouth Size" value={props.eatRadius} min={0.2} max={2.0} step={0.1} onChange={props.setEatRadius} color="accent-pink-500" />
                
                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-800/50">
                    <Toggle label="Show Vision Radius" active={props.showVision} onClick={() => props.setShowVision(!props.showVision)} />
                    <Toggle label="Show Mouth Sphere" active={props.showMouth} onClick={() => props.setShowMouth(!props.showMouth)} />
                </div>
            </Section>

            {/* Metabolism Section */}
            <Section title="Metabolism & Survival">
                <Slider label="Base Decay (Time)" value={props.baseDecay} min={0.0} max={20.0} step={0.5} onChange={props.setBaseDecay} color="accent-orange-400" />
                <Slider label="Movement Cost" value={props.movementCost} min={0.0} max={5.0} step={0.1} onChange={props.setMovementCost} color="accent-red-400" />
                <Slider label="Food Energy" value={props.foodEnergy} min={5} max={100} step={5} onChange={props.setFoodEnergy} color="accent-green-400" />
            </Section>

            {/* IO Section */}
            <Section title="Data">
                 <div className="flex gap-2">
                    <button onClick={props.onSave} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-xs font-bold text-cyan-400">
                        SAVE CREATURE
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-xs font-bold text-yellow-400">
                        LOAD CREATURE
                    </button>
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="application/json" onChange={handleFileChange} />
            </Section>

             <div className="mt-8 text-xs text-slate-600 text-center">
                 Project Origami v0.6
             </div>
        </div>
    </>
  );
};

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const Toggle: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
    <button 
        onClick={onClick}
        className="flex items-center justify-between w-full group"
    >
        <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
        <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${active ? 'bg-blue-600' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 left-1 w-2 h-2 rounded-full bg-white transition-transform duration-200 ${active ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
    </button>
);

const Slider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, color: string }> = ({
    label, value, min, max, step, onChange, color
}) => (
    <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{label}</span>
            <span className="font-mono text-slate-200">{value}</span>
        </div>
        <input 
            type="range" min={min} max={max} step={step} 
            value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
            className={`w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer ${color}`}
        />
    </div>
);