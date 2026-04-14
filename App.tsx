import React, { useState, useMemo } from 'react';
import { useEvolutionLoop } from './src/application/useEvolutionLoop';
import { BlueprintService } from './src/domain/BlueprintService';
import { ShapeType, Organism, CellType } from './src/domain/types';

// UI Components
import { UnifiedStage } from './src/infrastructure/visuals/UnifiedStage';
import { CommandBar } from './src/ui/CommandBar';
import { ToolDock } from './src/ui/ToolDock';
import { SettingsDrawer } from './src/ui/SettingsDrawer';
import { StatsOverlay } from './src/ui/StatsOverlay';
import { EnergyBar } from './src/ui/EnergyBar';

export type EditorTool = 'VIEW' | 'BUILD' | 'ERASE';

function App() {
  const {
    population,
    generation,
    trackedLeaderId,
    statsRef, // Using Ref
    fitnessHistory, 
    isRunning,
    isAutoEvolving,
    // Physics & Env
    globalStiffness, setGlobalStiffness,
    globalContractility, setGlobalContractility,
    gravity, setGravity, 
    friction, setFriction, 
    rotationalDrag, setRotationalDrag,
    shapeMemory, setShapeMemory, 
    density, setDensity, // NEW
    gripDepletion, setGripDepletion, 
    gripRecharge, setGripRecharge, 
    foodSpawnCount, setFoodSpawnCount,
    foodSpawnRadius, setFoodSpawnRadius,
    foodSpawnMinHeight, setFoodSpawnMinHeight,
    foodSpawnMaxHeight, setFoodSpawnMaxHeight,
    visionRadius, setVisionRadius,
    eatRadius, setEatRadius,
    // Metabolism
    baseDecay, setBaseDecay,
    movementCost, setMovementCost,
    foodEnergy, setFoodEnergy,
    // Visuals
    showVision, setShowVision,
    showMouth, setShowMouth,
    // Actions
    setIsRunning,
    toggleAutoEvolve, 
    spawnCustom,
    saveCreature,
    loadCreature
  } = useEvolutionLoop();

  // STATE MACHINE
  const [status, setStatus] = useState<'EDITING' | 'SIMULATING'>('EDITING');
  const [showBestOnly, setShowBestOnly] = useState(true);
  
  // EDITOR STATE
  const blueprintService = useMemo(() => new BlueprintService(), []);
  const [blueprintCells, setBlueprintCells] = useState(blueprintService.getCells());
  const [blueprintType, setBlueprintType] = useState(ShapeType.CUBE);
  const [editorTool, setEditorTool] = useState<EditorTool>('VIEW');
  const [brushType, setBrushType] = useState<CellType>(CellType.BODY); 
  const [editingOrganism, setEditingOrganism] = useState<Organism | undefined>(undefined);

  // --- HANDLERS ---

  const handlePlay = () => {
      // 1. Generate Organism from Blueprint
      // Pass 'editingOrganism' to graft the brain if it exists
      const organism = blueprintService.generateOrganism('prototype', editingOrganism);
      
      // 2. Inject into Engine and Start
      spawnCustom(organism, true); // true = autoStart
      
      // 3. Switch State
      setStatus('SIMULATING');
  };

  const handleStop = () => {
      setIsRunning(false);
      // If Auto Evolving (Fast Forward), stop it
      if (isAutoEvolving) toggleAutoEvolve();
      
      setStatus('EDITING');
  };

  // --- BLUEPRINT ACTIONS ---

  const handleLoad = (file: File) => {
      loadCreature(file, (org) => {
          blueprintService.importOrganism(org);
          setBlueprintCells(blueprintService.getCells());
          setBlueprintType(org.shape || ShapeType.CUBE);
          setEditingOrganism(org);
          setStatus('EDITING');
      });
  };

  const handleCellClick = (x: number, y: number, z: number, isRight: boolean) => {
      if (isRight) {
          blueprintService.setCell(x, y, z, null); // Erase
      } else {
          blueprintService.setCell(x, y, z, brushType); // Build with active brush
      }
      setBlueprintCells(blueprintService.getCells());
  };

  const handleGenerate = (type: string) => {
      setEditingOrganism(undefined); // Fresh brain
      if (type === 'small') blueprintService.generateSmallCritter();
      if (type === 'large') blueprintService.generateLargeBeast();
      if (type === 'monster') blueprintService.generateMonster();
      if (type === 'spider') blueprintService.applySpider();
      if (type === 'octo') blueprintService.applyOcto();
      if (type === 'mirror') blueprintService.applyMirrorX();
      
      setBlueprintCells(blueprintService.getCells());
  };

  const handleClear = () => {
      blueprintService.clear();
      setBlueprintCells([]);
      setEditingOrganism(undefined);
  };

  const handleExportMatrix = () => {
      const json = blueprintService.exportToJSON();
      navigator.clipboard.writeText(json).then(() => {
          alert("Creature Matrix copied to clipboard!");
      }).catch(err => {
          console.error("Clipboard error", err);
          // Fallback: log to console
          console.log("Creature Matrix:", json);
          alert("Check console for Matrix Data (Clipboard blocked)");
      });
  };

  const handleImportMatrix = () => {
      const input = prompt("Paste Creature Matrix JSON here:");
      if (input) {
          try {
              blueprintService.importFromJSON(input);
              setBlueprintCells(blueprintService.getCells());
              setEditingOrganism(undefined); // Reset brain for new structure
              alert("Creature Matrix imported successfully!");
          } catch (e) {
              alert("Invalid Matrix Data. Please check the format.");
          }
      }
  };
  
  const handleSetShape = (t: ShapeType) => {
      setBlueprintType(t);
      blueprintService.setType(t);
      setBlueprintCells([...blueprintService.getCells()]);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900 select-none">
      
      {/* 3D STAGE */}
      <UnifiedStage 
          status={status}
          population={population}
          visionRadius={visionRadius}
          eatRadius={eatRadius} // PASSED PROP
          showVision={showVision}
          showMouth={showMouth}
          showBestOnly={showBestOnly}
          trackedLeaderId={trackedLeaderId}
          // Edit Props
          blueprintCells={blueprintCells}
          blueprintType={blueprintType}
          editorTool={editorTool}
          brushType={brushType}
          onCellClick={handleCellClick}
      />

      {/* --- HUD OVERLAYS --- */}

      <StatsOverlay 
          status={status}
          statsRef={statsRef}
          cellCount={blueprintCells.length}
          isProcessing={false} 
          progress={0}
          fitnessHistory={fitnessHistory}
      />

      <EnergyBar 
          status={status}
          statsRef={statsRef}
      />

      <ToolDock 
          status={status}
          editorTool={editorTool}
          setEditorTool={setEditorTool}
          brushType={brushType}
          setBrushType={setBrushType}
          currentShape={blueprintType}
          setShape={handleSetShape}
          onClear={handleClear}
          onGenerate={handleGenerate}
          onExportMatrix={handleExportMatrix}
          onImportMatrix={handleImportMatrix}
      />

      <CommandBar 
          status={status}
          isRunning={isRunning}
          isAutoEvolving={isAutoEvolving}
          generation={generation}
          onPlay={handlePlay}
          onStop={handleStop}
          onTogglePause={() => setIsRunning(!isRunning)}
          onToggleAuto={toggleAutoEvolve}
      />

      <SettingsDrawer 
          globalStiffness={globalStiffness} setGlobalStiffness={setGlobalStiffness}
          globalContractility={globalContractility} setGlobalContractility={setGlobalContractility}
          gravity={gravity} setGravity={setGravity}
          friction={friction} setFriction={setFriction}
          rotationalDrag={rotationalDrag} setRotationalDrag={setRotationalDrag}
          shapeMemory={shapeMemory} setShapeMemory={setShapeMemory}
          density={density} setDensity={setDensity} // NEW
          gripDepletion={gripDepletion} setGripDepletion={setGripDepletion} 
          gripRecharge={gripRecharge} setGripRecharge={setGripRecharge} 
          foodSpawnCount={foodSpawnCount} setFoodSpawnCount={setFoodSpawnCount}
          foodSpawnRadius={foodSpawnRadius} setFoodSpawnRadius={setFoodSpawnRadius}
          foodSpawnMinHeight={foodSpawnMinHeight} setFoodSpawnMinHeight={setFoodSpawnMinHeight}
          foodSpawnMaxHeight={foodSpawnMaxHeight} setFoodSpawnMaxHeight={setFoodSpawnMaxHeight}
          visionRadius={visionRadius} setVisionRadius={setVisionRadius}
          eatRadius={eatRadius} setEatRadius={setEatRadius} 
          baseDecay={baseDecay} setBaseDecay={setBaseDecay}
          movementCost={movementCost} setMovementCost={setMovementCost}
          foodEnergy={foodEnergy} setFoodEnergy={setFoodEnergy}
          showVision={showVision} setShowVision={setShowVision}
          showMouth={showMouth} setShowMouth={setShowMouth}
          showBestOnly={showBestOnly}
          onToggleBestOnly={() => setShowBestOnly(!showBestOnly)}
          onSave={saveCreature}
          onLoad={handleLoad}
      />

    </div>
  );
}

export default App;