import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { SimulationLayer } from './SimulationLayer';
import { BlueprintView } from './BlueprintView';
import { Organism, ShapeType, CellType, BlueprintCell } from '../../domain/types';
import { EditorTool } from '../../../App';
import * as THREE from 'three';

interface UnifiedStageProps {
    status: 'EDITING' | 'SIMULATING';
    // Sim Props
    population: Organism[];
    visionRadius: number;
    eatRadius?: number; // NEW
    showVision: boolean;
    showMouth: boolean;
    showBestOnly: boolean;
    trackedLeaderId?: string | null;
    // Edit Props
    blueprintCells: BlueprintCell[];
    blueprintType: ShapeType;
    editorTool: EditorTool;
    brushType?: CellType;
    onCellClick: (x: number, y: number, z: number, isRight: boolean) => void;
}

export const UnifiedStage: React.FC<UnifiedStageProps> = ({
    status,
    population,
    visionRadius,
    eatRadius = 0.8, // Default
    showVision,
    showMouth,
    showBestOnly,
    trackedLeaderId,
    blueprintCells,
    blueprintType,
    editorTool,
    brushType,
    onCellClick
}) => {
    const gridCellColor = useMemo(() => new THREE.Color(status === 'EDITING' ? "#3b82f6" : "#5c4d3c"), [status]);
    const gridSectionColor = useMemo(() => new THREE.Color(status === 'EDITING' ? "#1e40af" : "#7f675b"), [status]);

    return (
        <div className={`w-full h-full bg-slate-900 ${status === 'EDITING' && editorTool !== 'VIEW' ? 'cursor-crosshair' : ''}`}>
            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[10, 8, 10]} fov={45} />
                <ambientLight intensity={0.6} />
                <directionalLight 
                  position={[20, 30, 10]} 
                  intensity={1.5} 
                  castShadow 
                  shadow-mapSize={[2048, 2048]} 
                />

                {status === 'SIMULATING' ? (
                    <SimulationLayer 
                        population={population}
                        showBestOnly={showBestOnly}
                        trackedLeaderId={trackedLeaderId}
                        visionRadius={visionRadius}
                        eatRadius={eatRadius}
                        showVision={showVision}
                        showMouth={showMouth}
                    />
                ) : (
                    <>
                        <OrbitControls makeDefault target={[0, 0, 0]} />
                        <BlueprintView 
                             cells={blueprintCells}
                             onCellClick={onCellClick}
                             currentType={blueprintType}
                             editorTool={editorTool}
                             brushType={brushType || CellType.BODY}
                        />
                    </>
                )}

                {/* SHARED ENVIRONMENT */}
                <Grid 
                    position={[0, -0.01, 0]} 
                    args={[200, 200]} 
                    cellColor={gridCellColor} 
                    sectionColor={gridSectionColor} 
                    fadeDistance={60}
                    infiniteGrid
                />
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                  <planeGeometry args={[1000, 1000]} />
                  <meshStandardMaterial 
                    color={status === 'EDITING' ? "#0f172a" : "#3f2e22"} 
                    roughness={0.9} 
                    metalness={0.1} 
                  />
                </mesh>

            </Canvas>
        </div>
    );
};