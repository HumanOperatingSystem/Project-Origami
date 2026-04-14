import { Vec3 } from './types';

export const VectorOps = {
  add: (v1: Vec3, v2: Vec3): Vec3 => ({ x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z }),
  sub: (v1: Vec3, v2: Vec3): Vec3 => ({ x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z }),
  mul: (v: Vec3, s: number): Vec3 => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
  copy: (v: Vec3): Vec3 => ({ ...v }),
  distance: (v1: Vec3, v2: Vec3): number => {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    const dz = v1.z - v2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },
  length: (v: Vec3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  normalize: (v: Vec3): Vec3 => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }
};