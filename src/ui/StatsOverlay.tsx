import React, { useEffect, useRef, MutableRefObject } from 'react';

interface StatsOverlayProps {
    status: 'EDITING' | 'SIMULATING';
    stats?: { fitness: number; foodEaten: number; distance: number }; // Legacy prop support
    statsRef?: MutableRefObject<{ 
        fitness: number; 
        foodEaten: number; 
        distance: number;
        energy: number;
        maxEnergy: number;
        aliveCount: number;
        totalCount: number;
    }>; // New Fast Prop
    aliveCount?: number;
    totalCount?: number;
    cellCount: number;
    isProcessing?: boolean;
    progress?: number;
    fitnessHistory: number[]; 
}

const FitnessGraph: React.FC<{ history: number[] }> = ({ history }) => {
    if (!history || history.length < 2) return null;

    const width = 140;
    const height = 40;
    const padding = 2;

    const maxVal = Math.max(...history, 10);
    const minVal = 0;
    
    const range = maxVal - minVal || 1;
    
    const points = history.map((val, i) => {
        const x = (i / (history.length - 1)) * (width - padding * 2) + padding;
        const normalizedY = (val - minVal) / range;
        const y = height - (normalizedY * (height - padding * 2) + padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="mt-2">
            <div className="flex justify-between text-[9px] text-slate-500 font-mono mb-1">
                <span>GEN 1</span>
                <span>GEN {history.length}</span>
            </div>
            <div className="relative border border-slate-700 bg-slate-900/50 rounded overflow-hidden shadow-inner">
                <svg width={width} height={height} className="block">
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{stopColor:'rgb(74, 222, 128)', stopOpacity:0.5}} />
                        <stop offset="100%" style={{stopColor:'rgb(74, 222, 128)', stopOpacity:0}} />
                        </linearGradient>
                    </defs>
                    <polygon 
                        points={`0,${height} ${points} ${width},${height}`} 
                        fill="url(#grad1)" 
                    />
                    <polyline 
                        fill="none" 
                        stroke="#4ade80" 
                        strokeWidth="1.5" 
                        points={points} 
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
                <div className="absolute top-0 right-1 text-[8px] text-green-400 font-bold opacity-80">
                    {Math.round(maxVal)}
                </div>
            </div>
        </div>
    );
};

export const StatsOverlay: React.FC<StatsOverlayProps> = ({ status, stats, statsRef, aliveCount, totalCount, cellCount, isProcessing, progress, fitnessHistory }) => {
    const fitnessEl = useRef<HTMLDivElement>(null);
    const aliveEl = useRef<HTMLSpanElement>(null);
    const reqId = useRef<number>(0);

    // High Frequency Update Loop
    useEffect(() => {
        if (status !== 'SIMULATING' || !statsRef) return;

        const update = () => {
            if (statsRef.current) {
                if (fitnessEl.current) {
                    const seconds = (statsRef.current.fitness / 1000).toFixed(2);
                    fitnessEl.current.textContent = seconds + 's';
                }
                if (aliveEl.current) {
                    aliveEl.current.textContent = `${statsRef.current.aliveCount}/${statsRef.current.totalCount}`;
                }
            }
            reqId.current = requestAnimationFrame(update);
        };
        
        reqId.current = requestAnimationFrame(update);
        
        return () => cancelAnimationFrame(reqId.current);
    }, [status, statsRef, aliveCount, totalCount]);

    return (
        <div className="absolute top-4 left-4 z-40 pointer-events-none select-none">
            {/* Title */}
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <h1 className="text-sm font-bold text-slate-300 tracking-widest">ORIGAMI</h1>
            </div>

            {/* Dynamic Content */}
            {status === 'EDITING' ? (
                 <div className="bg-slate-900/50 backdrop-blur border-l-2 border-blue-500 pl-3 py-1 pr-4 rounded-r-lg">
                     <div className="text-xs text-slate-500 font-mono uppercase">Blueprint</div>
                     <div className="text-xl font-bold text-white">{cellCount} <span className="text-sm text-slate-600 font-normal">VOXELS</span></div>
                 </div>
            ) : (
                <div className="bg-slate-900/80 backdrop-blur border-l-2 border-green-500 pl-3 py-2 pr-4 rounded-r-lg shadow-xl">
                    <div>
                        <div className="text-[10px] text-slate-500 font-mono uppercase">Current Fitness</div>
                        <div ref={fitnessEl} className="text-2xl font-bold text-green-400 font-mono tracking-tighter">
                            {stats ? (stats.fitness / 1000).toFixed(2) + 's' : '0.00s'}
                        </div>
                    </div>
                    
                    <div className="flex gap-4 mt-1 border-t border-slate-700/50 pt-1">
                        <div>
                             <span className="text-[10px] text-slate-500 font-mono block uppercase">Creatures</span>
                             <span ref={aliveEl} className="text-sm font-bold text-white">{aliveCount || 0}/{totalCount || 0}</span>
                        </div>
                    </div>

                    <FitnessGraph history={fitnessHistory} />
                </div>
            )}

            {isProcessing && (
                <div className="mt-4 w-40 bg-slate-900/80 rounded border border-slate-700 overflow-hidden">
                    <div className="h-1 bg-purple-500 transition-all duration-300" style={{ width: `${(progress || 0) * 100}%` }} />
                    <div className="px-2 py-1 text-[10px] text-purple-300 font-bold text-center">
                        WARPING... {Math.round((progress || 0) * 100)}%
                    </div>
                </div>
            )}
        </div>
    );
};