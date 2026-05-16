import { Injectable } from '@nestjs/common';
import type {
  BuiltGltfDocument,
  LogicalGltfDocument,
  LogicalLight,
  LogicalMaterial,
  LogicalNode,
  LogicalPrimitiveType,
} from '../../schemas/logical-gltf.schema';
import type { PrimitiveGeometry } from './gltf-primitive-library.service';
import { GltfPrimitiveLibraryService } from './gltf-primitive-library.service';

// glTF accessor component types
const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;

// glTF buffer view targets
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;

interface MeshEntry {
  meshIndex: number;
  primType: LogicalPrimitiveType;
  posAccessor: number;
  normAccessor: number;
  uvAccessor: number;
  idxAccessor: number;
}

@Injectable()
export class GltfBuilderService {
  constructor(private readonly primitiveLibrary: GltfPrimitiveLibraryService) {}

  build(doc: LogicalGltfDocument): BuiltGltfDocument {
    // Collect unique primitive types used
    const usedTypes = new Set<LogicalPrimitiveType>(
      doc.nodes
        .filter((n) => n.primitiveType !== undefined)
        .map((n) => n.primitiveType as LogicalPrimitiveType),
    );

    // Build geometry buffers for all used types
    const { meshEntries, bufferBase64, bufferByteLength, accessors, bufferViews } =
      this.buildGeometrySection([...usedTypes]);

    // Build materials
    const gltfMaterials = doc.materials.map((m) => this.buildMaterial(m));

    // Separate ambient from directional/point lights
    const ambientLights = doc.lights.filter((l) => l.type === 'ambient');
    const pbrLights = doc.lights.filter((l) => l.type !== 'ambient');

    // Build KHR_lights_punctual lights
    const khrLights = pbrLights.map((l) => ({
      name: l.name,
      type: l.type === 'directional' ? 'directional' : 'point',
      color: this.hexToRgb(l.colorHex ?? '#ffffff'),
      intensity: l.intensity ?? 1,
    }));

    // Build nodes
    const gltfNodes: BuiltGltfDocument['nodes'] = [];
    const rootNodeIndices: number[] = [];

    for (let i = 0; i < doc.nodes.length; i++) {
      const node = doc.nodes[i];
      const gltfNode = this.buildNode(node, i, meshEntries, pbrLights);
      gltfNodes.push(gltfNode);
      if (!this.hasParent(doc.nodes, i)) {
        rootNodeIndices.push(i);
      }
    }

    // Add light nodes for directional/point lights
    const lightNodeStart = gltfNodes.length;
    for (let i = 0; i < pbrLights.length; i++) {
      const light = pbrLights[i];
      const pos = light.position ?? this.defaultLightPosition(light.type);
      gltfNodes.push({
        name: light.name,
        translation: pos,
        extensions: {
          KHR_lights_punctual: { light: i },
        },
      });
      rootNodeIndices.push(lightNodeStart + i);
    }

    const result: BuiltGltfDocument = {
      asset: { version: '2.0', generator: 'MiniMesh' },
      scene: 0,
      scenes: [{ name: doc.sceneName, nodes: rootNodeIndices }],
      nodes: gltfNodes,
      meshes: [...meshEntries.values()].map((entry) => ({
        name: entry.primType,
        primitives: [
          {
            attributes: {
              POSITION: entry.posAccessor,
              NORMAL: entry.normAccessor,
              TEXCOORD_0: entry.uvAccessor,
            },
            indices: entry.idxAccessor,
            material: 0, // overridden per-node via mesh clone in node extras
          },
        ],
      })),
      materials: gltfMaterials,
      accessors,
      bufferViews,
      buffers: [{ byteLength: bufferByteLength, uri: `data:application/octet-stream;base64,${bufferBase64}` }],
      extras: {
        sceneName: doc.sceneName,
        description: doc.description,
        camera: {
          position: doc.camera.position,
          target: doc.camera.target,
          fovDegrees: doc.camera.fovDegrees,
        },
        environment: doc.environment
          ? {
              backgroundColorHex: doc.environment.backgroundColorHex,
              fogColorHex: doc.environment.fogColorHex,
              fogNear: doc.environment.fogNear,
              fogFar: doc.environment.fogFar,
            }
          : undefined,
        ambientLights: ambientLights.map((l) => ({
          colorHex: l.colorHex ?? '#ffffff',
          intensity: l.intensity ?? 1,
        })),
      },
    };

    if (khrLights.length > 0) {
      result.extensionsUsed = ['KHR_lights_punctual'];
      result.extensions = {
        KHR_lights_punctual: { lights: khrLights },
      };
    }

    // Rewrite mesh primitives: each node with a mesh needs its own material index.
    // We build a deduplicated mesh-per-(primType, materialIndex) map for correct materials.
    this.injectNodeMaterials(result, doc);

    return result;
  }

  // ─── Geometry section builder ─────────────────────────────────────────────

  private buildGeometrySection(types: LogicalPrimitiveType[]): {
    meshEntries: Map<LogicalPrimitiveType, MeshEntry>;
    bufferBase64: string;
    bufferByteLength: number;
    accessors: BuiltGltfDocument['accessors'];
    bufferViews: BuiltGltfDocument['bufferViews'];
  } {
    const chunks: Uint8Array[] = [];
    let byteOffset = 0;
    const bufferViews: BuiltGltfDocument['bufferViews'] = [];
    const accessors: BuiltGltfDocument['accessors'] = [];
    const meshEntries = new Map<LogicalPrimitiveType, MeshEntry>();

    for (const type of types) {
      const geo = this.primitiveLibrary.get(type);
      const meshIndex = meshEntries.size;

      // Positions (VEC3, FLOAT)
      const posBytes = new Uint8Array(geo.positions.buffer);
      const posViewIndex = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset, byteLength: posBytes.byteLength, target: ARRAY_BUFFER });
      const posAccessorIndex = accessors.length;
      accessors.push({
        bufferView: posViewIndex,
        componentType: FLOAT,
        count: geo.positions.length / 3,
        type: 'VEC3',
        min: [...geo.positionMin],
        max: [...geo.positionMax],
      });
      chunks.push(posBytes);
      byteOffset += posBytes.byteLength;

      // Normals (VEC3, FLOAT)
      const normBytes = new Uint8Array(geo.normals.buffer);
      const normViewIndex = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset, byteLength: normBytes.byteLength, target: ARRAY_BUFFER });
      const normAccessorIndex = accessors.length;
      accessors.push({ bufferView: normViewIndex, componentType: FLOAT, count: geo.normals.length / 3, type: 'VEC3' });
      chunks.push(normBytes);
      byteOffset += normBytes.byteLength;

      // UVs (VEC2, FLOAT)
      const uvBytes = new Uint8Array(geo.uvs.buffer);
      const uvViewIndex = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset, byteLength: uvBytes.byteLength, target: ARRAY_BUFFER });
      const uvAccessorIndex = accessors.length;
      accessors.push({ bufferView: uvViewIndex, componentType: FLOAT, count: geo.uvs.length / 2, type: 'VEC2' });
      chunks.push(uvBytes);
      byteOffset += uvBytes.byteLength;

      // Indices (SCALAR, UNSIGNED_SHORT)
      const idxBytes = new Uint8Array(geo.indices.buffer);
      const idxViewIndex = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset, byteLength: idxBytes.byteLength, target: ELEMENT_ARRAY_BUFFER });
      const idxAccessorIndex = accessors.length;
      accessors.push({ bufferView: idxViewIndex, componentType: UNSIGNED_SHORT, count: geo.indices.length, type: 'SCALAR' });
      chunks.push(idxBytes);
      byteOffset += idxBytes.byteLength;

      meshEntries.set(type, {
        meshIndex,
        primType: type,
        posAccessor: posAccessorIndex,
        normAccessor: normAccessorIndex,
        uvAccessor: uvAccessorIndex,
        idxAccessor: idxAccessorIndex,
      });
    }

    // Merge all chunks into one buffer
    const combined = new Uint8Array(byteOffset);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return {
      meshEntries,
      bufferBase64: Buffer.from(combined).toString('base64'),
      bufferByteLength: byteOffset,
      accessors,
      bufferViews,
    };
  }

  // ─── Node builder ─────────────────────────────────────────────────────────

  private buildNode(
    node: LogicalNode,
    _nodeIndex: number,
    meshEntries: Map<LogicalPrimitiveType, MeshEntry>,
    _pbrLights: LogicalLight[],
  ): BuiltGltfDocument['nodes'][number] {
    const entry = node.primitiveType ? meshEntries.get(node.primitiveType) : undefined;
    const rotation = this.eulerToQuaternion(node.eulerRotation ?? [0, 0, 0]);
    const hasIdentityRotation = rotation[0] === 0 && rotation[1] === 0 && rotation[2] === 0 && rotation[3] === 1;

    const gltfNode: BuiltGltfDocument['nodes'][number] = {
      name: node.name,
      ...(node.translation && !this.isZero3(node.translation) ? { translation: node.translation } : {}),
      ...(!hasIdentityRotation ? { rotation } : {}),
      ...(node.scale && !this.isOne3(node.scale) ? { scale: node.scale } : {}),
      ...(entry !== undefined ? { mesh: entry.meshIndex } : {}),
      extras: {
        materialIndex: node.materialIndex ?? 0,
        ...(node.entityId ? { entityId: node.entityId } : {}),
      },
    };

    if (node.children?.length) {
      (gltfNode as Record<string, unknown>).children = node.children;
    }

    return gltfNode;
  }

  // ─── Material builder ─────────────────────────────────────────────────────

  private buildMaterial(m: LogicalMaterial): BuiltGltfDocument['materials'][number] {
    const [r, g, b] = this.hexToRgb(m.baseColorHex);
    const material: BuiltGltfDocument['materials'][number] = {
      name: m.name,
      pbrMetallicRoughness: {
        baseColorFactor: [r, g, b, 1.0],
        metallicFactor: m.metallicFactor ?? 0,
        roughnessFactor: m.roughnessFactor ?? 0.55,
      },
    };

    if (m.emissiveHex && m.emissiveHex !== '#000000') {
      const [er, eg, eb] = this.hexToRgb(m.emissiveHex);
      const intensity = m.emissiveIntensity ?? 1;
      material.emissiveFactor = [er * intensity, eg * intensity, eb * intensity];
    }

    if (m.alphaMode && m.alphaMode !== 'OPAQUE') {
      material.alphaMode = m.alphaMode;
    }

    // Always render both sides — prevents hollow appearance if the LLM
    // places a camera inside or if any geometry is viewed from an unusual angle.
    material.doubleSided = true;

    return material;
  }

  /**
   * Post-processing pass: because one mesh in glTF is shared across all nodes
   * using that primitive type, we need per-(primType, materialIndex) meshes to
   * correctly assign different materials to different nodes. This function
   * rebuilds the mesh list and updates node mesh references accordingly.
   */
  private injectNodeMaterials(result: BuiltGltfDocument, doc: LogicalGltfDocument): void {
    type MeshKey = string; // `${primType}-${materialIndex}`
    const meshMap = new Map<MeshKey, number>();
    const newMeshes: BuiltGltfDocument['meshes'] = [];

    // Copy the base accessor references from the original meshes
    const baseMeshByPrimType = new Map<string, BuiltGltfDocument['meshes'][number]>();
    for (const mesh of result.meshes) {
      baseMeshByPrimType.set(mesh.name, mesh);
    }

    for (let i = 0; i < doc.nodes.length; i++) {
      const node = doc.nodes[i];
      if (!node.primitiveType) continue;

      const matIndex = node.materialIndex ?? 0;
      const key: MeshKey = `${node.primitiveType}-${matIndex}`;

      if (!meshMap.has(key)) {
        const baseMesh = baseMeshByPrimType.get(node.primitiveType);
        if (!baseMesh) continue;
        const newIndex = newMeshes.length;
        newMeshes.push({
          name: `${node.primitiveType}-mat${matIndex}`,
          primitives: [
            {
              ...baseMesh.primitives[0],
              material: matIndex,
            },
          ],
        });
        meshMap.set(key, newIndex);
      }

      const meshIndex = meshMap.get(key)!;
      result.nodes[i] = { ...result.nodes[i], mesh: meshIndex };
    }

    result.meshes = newMeshes;
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  /** Convert ZYX Euler angles (radians) to XYZW quaternion. */
  private eulerToQuaternion(euler: [number, number, number]): [number, number, number, number] {
    const [ex, ey, ez] = euler;
    const cx = Math.cos(ex / 2), sx = Math.sin(ex / 2);
    const cy = Math.cos(ey / 2), sy = Math.sin(ey / 2);
    const cz = Math.cos(ez / 2), sz = Math.sin(ez / 2);

    return [
      sx * cy * cz - cx * sy * sz, // x
      cx * sy * cz + sx * cy * sz, // y
      cx * cy * sz - sx * sy * cz, // z
      cx * cy * cz + sx * sy * sz, // w
    ];
  }

  private hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const full = clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean;
    const n = parseInt(full, 16);
    return [
      ((n >> 16) & 0xff) / 255,
      ((n >> 8) & 0xff) / 255,
      (n & 0xff) / 255,
    ];
  }

  private hasParent(nodes: LogicalNode[], index: number): boolean {
    return nodes.some((n) => n.children?.includes(index));
  }

  private defaultLightPosition(type: string): [number, number, number] {
    return type === 'directional' ? [4, 6, 5] : [0, 5, 0];
  }

  private isZero3(v: [number, number, number]): boolean {
    return v[0] === 0 && v[1] === 0 && v[2] === 0;
  }

  private isOne3(v: [number, number, number]): boolean {
    return v[0] === 1 && v[1] === 1 && v[2] === 1;
  }
}
