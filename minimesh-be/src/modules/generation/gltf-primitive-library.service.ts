import { Injectable } from '@nestjs/common';
import type { LogicalPrimitiveType } from '../../schemas/logical-gltf.schema';

export interface PrimitiveGeometry {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
  positionMin: [number, number, number];
  positionMax: [number, number, number];
}

/**
 * Generates unit primitive geometry entirely in pure TypeScript math.
 * No WebGL or Three.js needed — results are cached at startup.
 */
@Injectable()
export class GltfPrimitiveLibraryService {
  private readonly cache = new Map<LogicalPrimitiveType, PrimitiveGeometry>();

  constructor() {
    for (const type of ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'] as LogicalPrimitiveType[]) {
      this.cache.set(type, this.build(type));
    }
  }

  get(type: LogicalPrimitiveType): PrimitiveGeometry {
    return this.cache.get(type)!;
  }

  private build(type: LogicalPrimitiveType): PrimitiveGeometry {
    switch (type) {
      case 'box':      return this.buildBox();
      case 'sphere':   return this.buildSphere(32, 16);
      case 'cylinder': return this.buildCylinder(32);
      case 'cone':     return this.buildCone(32);
      case 'torus':    return this.buildTorus(64, 24, 0.45, 0.14);
      case 'plane':    return this.buildPlane();
    }
  }

  // ─── Box ──────────────────────────────────────────────────────────────────

  private buildBox(): PrimitiveGeometry {
    type Face = { normal: [number, number, number]; verts: [number, number, number][] };
    // Each face uses CCW winding when viewed from outside (glTF front-face convention).
    // Cross product of the first two edges must point in the same direction as `normal`.
    const faces: Face[] = [
      { normal: [ 1, 0, 0], verts: [[ 0.5,-0.5, 0.5],[ 0.5,-0.5,-0.5],[ 0.5, 0.5,-0.5],[ 0.5, 0.5, 0.5]] },
      { normal: [-1, 0, 0], verts: [[-0.5,-0.5,-0.5],[-0.5,-0.5, 0.5],[-0.5, 0.5, 0.5],[-0.5, 0.5,-0.5]] },
      { normal: [ 0, 1, 0], verts: [[-0.5, 0.5, 0.5],[ 0.5, 0.5, 0.5],[ 0.5, 0.5,-0.5],[-0.5, 0.5,-0.5]] },
      { normal: [ 0,-1, 0], verts: [[-0.5,-0.5,-0.5],[ 0.5,-0.5,-0.5],[ 0.5,-0.5, 0.5],[-0.5,-0.5, 0.5]] },
      { normal: [ 0, 0, 1], verts: [[-0.5,-0.5, 0.5],[ 0.5,-0.5, 0.5],[ 0.5, 0.5, 0.5],[-0.5, 0.5, 0.5]] },
      { normal: [ 0, 0,-1], verts: [[ 0.5,-0.5,-0.5],[-0.5,-0.5,-0.5],[-0.5, 0.5,-0.5],[ 0.5, 0.5,-0.5]] },
    ];
    const faceUvs: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let base = 0;

    for (const face of faces) {
      for (let i = 0; i < 4; i++) {
        positions.push(...face.verts[i]);
        normals.push(...face.normal);
        uvs.push(...faceUvs[i]);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      base += 4;
    }

    return this.pack(positions, normals, uvs, indices);
  }

  // ─── Sphere ───────────────────────────────────────────────────────────────

  private buildSphere(widthSegments: number, heightSegments: number): PrimitiveGeometry {
    const r = 0.5;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let lat = 0; lat <= heightSegments; lat++) {
      const theta = (lat / heightSegments) * Math.PI;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      for (let lon = 0; lon <= widthSegments; lon++) {
        const phi = (lon / widthSegments) * 2 * Math.PI;
        const sinP = Math.sin(phi);
        const cosP = Math.cos(phi);

        const nx = sinT * cosP;
        const ny = cosT;
        const nz = sinT * sinP;

        positions.push(r * nx, r * ny, r * nz);
        normals.push(nx, ny, nz);
        uvs.push(lon / widthSegments, 1 - lat / heightSegments);
      }
    }

    const w = widthSegments + 1;
    for (let lat = 0; lat < heightSegments; lat++) {
      for (let lon = 0; lon < widthSegments; lon++) {
        const a = lat * w + lon;
        const b = a + w;
        // CCW winding for outward-facing normals (glTF convention)
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }

    return this.pack(positions, normals, uvs, indices);
  }

  // ─── Cylinder ─────────────────────────────────────────────────────────────

  private buildCylinder(radialSegments: number): PrimitiveGeometry {
    const r = 0.5;
    const h = 1;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let base = 0;

    // Side
    for (let i = 0; i <= radialSegments; i++) {
      const phi = (i / radialSegments) * 2 * Math.PI;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);
      const u = i / radialSegments;

      positions.push(r * cosP, -h / 2, r * sinP);
      normals.push(cosP, 0, sinP);
      uvs.push(u, 0);

      positions.push(r * cosP, h / 2, r * sinP);
      normals.push(cosP, 0, sinP);
      uvs.push(u, 1);
    }

    for (let i = 0; i < radialSegments; i++) {
      const a = base + i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    base += (radialSegments + 1) * 2;

    // Top cap
    const topCenter = base;
    positions.push(0, h / 2, 0);
    normals.push(0, 1, 0);
    uvs.push(0.5, 0.5);
    base += 1;

    for (let i = 0; i <= radialSegments; i++) {
      const phi = (i / radialSegments) * 2 * Math.PI;
      positions.push(r * Math.cos(phi), h / 2, r * Math.sin(phi));
      normals.push(0, 1, 0);
      uvs.push(0.5 + 0.5 * Math.cos(phi), 0.5 + 0.5 * Math.sin(phi));
    }

    for (let i = 0; i < radialSegments; i++) {
      indices.push(topCenter, base + i + 1, base + i);
    }
    base += radialSegments + 1;

    // Bottom cap
    const bottomCenter = base;
    positions.push(0, -h / 2, 0);
    normals.push(0, -1, 0);
    uvs.push(0.5, 0.5);
    base += 1;

    for (let i = 0; i <= radialSegments; i++) {
      const phi = (i / radialSegments) * 2 * Math.PI;
      positions.push(r * Math.cos(phi), -h / 2, r * Math.sin(phi));
      normals.push(0, -1, 0);
      uvs.push(0.5 + 0.5 * Math.cos(phi), 0.5 - 0.5 * Math.sin(phi));
    }

    for (let i = 0; i < radialSegments; i++) {
      indices.push(bottomCenter, base + i, base + i + 1);
    }

    return this.pack(positions, normals, uvs, indices);
  }

  // ─── Cone ─────────────────────────────────────────────────────────────────

  private buildCone(radialSegments: number): PrimitiveGeometry {
    const r = 0.5;
    const h = 1;
    const slopeLen = Math.sqrt(r * r + h * h);
    const normalY = r / slopeLen;
    const normalXZ = h / slopeLen;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let base = 0;

    // Side — apex + ring
    const apex = base;
    positions.push(0, h / 2, 0);
    normals.push(0, 1, 0);
    uvs.push(0.5, 1);
    base += 1;

    for (let i = 0; i <= radialSegments; i++) {
      const phi = (i / radialSegments) * 2 * Math.PI;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      positions.push(r * cosP, -h / 2, r * sinP);
      normals.push(normalXZ * cosP, normalY, normalXZ * sinP);
      uvs.push(i / radialSegments, 0);
    }

    for (let i = 0; i < radialSegments; i++) {
      indices.push(apex, base + i, base + i + 1);
    }
    base += radialSegments + 1;

    // Bottom cap
    const capCenter = base;
    positions.push(0, -h / 2, 0);
    normals.push(0, -1, 0);
    uvs.push(0.5, 0.5);
    base += 1;

    for (let i = 0; i <= radialSegments; i++) {
      const phi = (i / radialSegments) * 2 * Math.PI;
      positions.push(r * Math.cos(phi), -h / 2, r * Math.sin(phi));
      normals.push(0, -1, 0);
      uvs.push(0.5 + 0.5 * Math.cos(phi), 0.5 - 0.5 * Math.sin(phi));
    }

    for (let i = 0; i < radialSegments; i++) {
      indices.push(capCenter, base + i, base + i + 1);
    }

    return this.pack(positions, normals, uvs, indices);
  }

  // ─── Torus ────────────────────────────────────────────────────────────────

  private buildTorus(
    torusSegments: number,
    tubeSegments: number,
    torusRadius: number,
    tubeRadius: number,
  ): PrimitiveGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let j = 0; j <= tubeSegments; j++) {
      const phi = (j / tubeSegments) * 2 * Math.PI;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      for (let i = 0; i <= torusSegments; i++) {
        const theta = (i / torusSegments) * 2 * Math.PI;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        const cx = torusRadius * cosTheta;
        const cz = torusRadius * sinTheta;

        const x = (torusRadius + tubeRadius * cosPhi) * cosTheta;
        const y = tubeRadius * sinPhi;
        const z = (torusRadius + tubeRadius * cosPhi) * sinTheta;

        positions.push(x, y, z);

        const nx = x - cx;
        const ny = y;
        const nz = z - cz;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        normals.push(nx / len, ny / len, nz / len);
        uvs.push(i / torusSegments, j / tubeSegments);
      }
    }

    const w = torusSegments + 1;
    for (let j = 0; j < tubeSegments; j++) {
      for (let i = 0; i < torusSegments; i++) {
        const a = j * w + i;
        const b = a + w;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }

    return this.pack(positions, normals, uvs, indices);
  }

  // ─── Plane ────────────────────────────────────────────────────────────────

  private buildPlane(): PrimitiveGeometry {
    // Unit plane in XZ plane (facing +Y, horizontal after default rotation)
    // Matches Three.js PlaneGeometry(1,1) rotated by -PI/2 on X
    const positions = [-0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, -0.5];
    const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    const uvs = [0, 1, 1, 1, 1, 0, 0, 0];
    const indices = [0, 1, 2, 0, 2, 3];

    return this.pack(positions, normals, uvs, indices);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private pack(
    positions: number[],
    normals: number[],
    uvs: number[],
    indices: number[],
  ): PrimitiveGeometry {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      if (positions[i]     < minX) minX = positions[i];
      if (positions[i]     > maxX) maxX = positions[i];
      if (positions[i + 1] < minY) minY = positions[i + 1];
      if (positions[i + 1] > maxY) maxY = positions[i + 1];
      if (positions[i + 2] < minZ) minZ = positions[i + 2];
      if (positions[i + 2] > maxZ) maxZ = positions[i + 2];
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices),
      positionMin: [minX, minY, minZ],
      positionMax: [maxX, maxY, maxZ],
    };
  }
}
