import { Injectable } from '@nestjs/common';
import {
  SceneDocument,
  SceneDocumentSchema,
  SceneLight,
  SceneObject,
} from '../../schemas/scene.schema';
import type { ScenePlan } from './generation-plan.schema';
import { LightingPass, LightingPassSchema } from './lighting-agent.schema';

@Injectable()
export class LightingAgentService {
  enhanceScene(
    prompt: string,
    plan: ScenePlan | undefined,
    scene: SceneDocument,
  ): SceneDocument {
    const pass = LightingPassSchema.parse(
      this.createLightingPass(prompt, plan, scene),
    );

    return SceneDocumentSchema.parse({
      ...scene,
      lights: pass.lights,
      camera: pass.camera,
      environment: pass.environment,
      objects: scene.objects.map((object) =>
        this.applyMaterialUpdate(object, pass),
      ),
    });
  }

  enhanceIfNeeded(prompt: string, scene: SceneDocument): SceneDocument {
    if (!this.needsLightingPass(prompt, scene)) {
      return scene;
    }

    return this.enhanceScene(prompt, undefined, scene);
  }

  private createLightingPass(
    prompt: string,
    plan: ScenePlan | undefined,
    scene: SceneDocument,
  ): LightingPass {
    const context = `${prompt} ${plan?.lightingIntent ?? ''} ${plan?.styleKeywords.join(' ') ?? ''} ${scene.sceneName} ${scene.description ?? ''}`;
    const isNightScene = this.hasAny(context, [
      'night',
      'cyberpunk',
      'neon',
      'holographic',
      'glowing',
      'dark',
      'cinematic',
    ]);
    const neonAnchors = this.findNeonAnchors(scene.objects);
    const lights = this.capLights([
      this.createAmbientLight(isNightScene),
      this.createKeyLight(isNightScene),
      this.createRimLight(isNightScene),
      ...scene.lights
        .filter((light) => light.type === 'point')
        .map((light) => this.boostPointLight(light, isNightScene)),
      ...neonAnchors
        .slice(0, 3)
        .map((object, index) => this.createNeonPointLight(object, index)),
    ]);

    return {
      lights,
      camera: this.createCamera(plan, scene, isNightScene),
      environment: {
        backgroundColor: isNightScene ? '#07111f' : '#eef5ff',
        fogColor: isNightScene ? '#0f172a' : '#dbeafe',
        fogNear: isNightScene ? 14 : 24,
        fogFar: isNightScene ? 54 : 72,
        exposure: isNightScene ? 1.65 : 1.12,
      },
      materialUpdates: neonAnchors.map((object) => ({
        objectId: object.id,
        emissive: object.material.color,
        emissiveIntensity: isNightScene ? 1.9 : 1.1,
      })),
    };
  }

  private needsLightingPass(prompt: string, scene: SceneDocument): boolean {
    const context = `${prompt} ${scene.sceneName} ${scene.description ?? ''}`;

    return (
      this.hasAny(context, ['night', 'cyberpunk', 'neon', 'dark', 'glowing']) ||
      this.averageBrightness(scene.objects) < 0.28
    );
  }

  private createAmbientLight(isNightScene: boolean): SceneLight {
    return {
      id: 'lighting-agent-ambient',
      type: 'ambient',
      color: isNightScene ? '#dbeafe' : '#ffffff',
      intensity: isNightScene ? 1.05 : 0.65,
    };
  }

  private createKeyLight(isNightScene: boolean): SceneLight {
    return {
      id: 'lighting-agent-key',
      type: 'directional',
      color: isNightScene ? '#c7d2fe' : '#ffffff',
      intensity: isNightScene ? 2.9 : 2,
      position: [4.5, 8, 5.5],
    };
  }

  private createRimLight(isNightScene: boolean): SceneLight {
    return {
      id: 'lighting-agent-rim',
      type: 'point',
      color: isNightScene ? '#ff2bd6' : '#38bdf8',
      intensity: isNightScene ? 2.3 : 1.2,
      position: [-3.6, 2.8, 3.2],
    };
  }

  private createNeonPointLight(object: SceneObject, index: number): SceneLight {
    return {
      id: `lighting-agent-neon-${index + 1}`,
      type: 'point',
      color: object.material.color,
      intensity: 1.6,
      position: [
        object.position[0],
        Math.max(0.8, object.position[1] + 0.35),
        object.position[2] + 0.45,
      ],
    };
  }

  private boostPointLight(
    light: SceneLight,
    isNightScene: boolean,
  ): SceneLight {
    return {
      ...light,
      intensity: Math.min(
        10,
        Math.max(light.intensity, isNightScene ? 1.4 : 1),
      ),
    };
  }

  private createCamera(
    plan: ScenePlan | undefined,
    scene: SceneDocument,
    isNightScene: boolean,
  ): SceneDocument['camera'] {
    const cinematic =
      plan?.cameraIntent.toLowerCase().includes('cinematic') || isNightScene;

    if (cinematic) {
      return {
        position: [6.5, 3.2, 6.8],
        target: [0, 0.85, 0],
        fov: 44,
      };
    }

    return scene.camera;
  }

  private applyMaterialUpdate(
    object: SceneObject,
    pass: LightingPass,
  ): SceneObject {
    const update = pass.materialUpdates.find(
      (item) => item.objectId === object.id,
    );

    if (!update) {
      return object;
    }

    return {
      ...object,
      material: {
        ...object.material,
        emissive: update.emissive,
        emissiveIntensity: update.emissiveIntensity,
      },
    };
  }

  private findNeonAnchors(objects: SceneObject[]): SceneObject[] {
    return objects.filter((object) => {
      const text = `${object.id} ${object.name}`.toLowerCase();

      return (
        this.hasAny(text, [
          'neon',
          'glow',
          'light',
          'lamp',
          'sign',
          'billboard',
          'holo',
          'window',
          'panel',
        ]) || this.isBrightColor(object.material.color)
      );
    });
  }

  private capLights(lights: SceneLight[]): SceneLight[] {
    const seen = new Set<string>();

    return lights
      .filter((light) => {
        if (seen.has(light.id)) {
          return false;
        }

        seen.add(light.id);

        return true;
      })
      .slice(0, 8);
  }

  private averageBrightness(objects: SceneObject[]): number {
    if (objects.length === 0) {
      return 1;
    }

    return (
      objects.reduce(
        (sum, object) => sum + this.colorBrightness(object.material.color),
        0,
      ) / objects.length
    );
  }

  private isBrightColor(color: string): boolean {
    return this.colorBrightness(color) > 0.58;
  }

  private colorBrightness(color: string): number {
    const normalized =
      color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color;
    const red = Number.parseInt(normalized.slice(1, 3), 16) / 255;
    const green = Number.parseInt(normalized.slice(3, 5), 16) / 255;
    const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255;

    return red * 0.299 + green * 0.587 + blue * 0.114;
  }

  private hasAny(value: string, needles: string[]): boolean {
    const text = value.toLowerCase();

    return needles.some((needle) => text.includes(needle));
  }
}
