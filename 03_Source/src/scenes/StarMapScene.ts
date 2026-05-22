/**
 * DESTINATION EARTH — StarMapScene (Phaser 3)
 * Galaxy Seed 1000 기반 오각형 격자 스타맵 씬 (GDD v6.0 §5)
 */

import Phaser from 'phaser';
import {
  generateGalaxyMap,
  type GalaxyMap,
  type PlanetPosition,
  type HyperTrack,
} from '../utils/galaxyGenerator';

// 문명권 색상 팔레트
const FACTION_COLORS: Record<string, number> = {
  F01: 0x4a90d9, // 수퍼비아 — 블루
  F02: 0xd4af37, // 아우레우스 — 골드
  F03: 0x7ecbce, // 메카니카 — 시안
  F04: 0xc0392b, // 크리그 — 레드
  F05: 0x8b00ff, // 치크스 — 퍼플
  F06: 0x2ecc71, // 지구 저항군 — 그린
  F07: 0x00f3ff, // 보이드 균열 — 시안 글로우
};

const FOG_ALPHA = {
  Locked: 0.1,
  Scouted: 0.5,
  Active: 1.0,
};

export class StarMapScene extends Phaser.Scene {
  private galaxyMap!: GalaxyMap;
  private planetSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private trackLines!: Phaser.GameObjects.Graphics;
  private selectedPlanetId: string | null = null;
  private onPlanetSelect?: (planetId: string) => void;
  private fogOfWar: Record<string, 'Locked' | 'Scouted' | 'Active'> = {};

  constructor() {
    super({ key: 'StarMapScene' });
  }

  init(data: {
    onPlanetSelect?: (planetId: string) => void;
    fogOfWar?: Record<string, 'Locked' | 'Scouted' | 'Active'>;
  }) {
    this.onPlanetSelect = data.onPlanetSelect;
    this.fogOfWar = data.fogOfWar || {};
  }

  preload() {
    // 플레이스홀더 이미지 사용 (실제 에셋은 추후 교체)
    this.load.image('planet_default', '/assets/images/environment/planets/placeholder.png');
    this.load.image('planet_void', '/assets/images/environment/planets/void_rifts/void_placeholder.png');
  }

  create() {
    // 우주 배경
    this.cameras.main.setBackgroundColor('#050a1a');
    this.addStarField();

    // 갤럭시 맵 생성 (Galaxy Seed 1000 고정)
    this.galaxyMap = generateGalaxyMap(1000);

    // 항로 그리기
    this.trackLines = this.add.graphics();
    this.drawHyperTracks();

    // 행성 스프라이트 생성
    this.galaxyMap.planets.forEach((planet) => {
      this.createPlanetSprite(planet);
    });

    // 카메라 설정 (핀치 줌, 드래그)
    this.setupCamera();

    // 애니메이션 추가
    this.addPulseAnimation();
  }

  // ─── 별 배경 생성 ───────────────────────────────────────────────────────
  private addStarField() {
    const width = this.scale.width;
    const height = this.scale.height;
    const graphics = this.add.graphics();

    for (let i = 0; i < 200; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const radius = Phaser.Math.FloatBetween(0.3, 1.5);
      const alpha = Phaser.Math.FloatBetween(0.3, 1.0);

      graphics.fillStyle(0xffffff, alpha);
      graphics.fillCircle(x, y, radius);
    }
  }

  // ─── 항로 (HyperTrack) 그리기 ────────────────────────────────────────
  private drawHyperTracks() {
    this.trackLines.clear();
    this.trackLines.lineStyle(1, 0x334455, 0.4);

    this.galaxyMap.tracks.forEach((track) => {
      const fromPlanet = this.galaxyMap.planets.find((p) => p.id === track.from);
      const toPlanet = this.galaxyMap.planets.find((p) => p.id === track.to);

      if (!fromPlanet || !toPlanet) return;

      const fromFog = this.fogOfWar[track.from] || 'Locked';
      const toFog = this.fogOfWar[track.to] || 'Locked';

      // 양쪽 모두 Scouted 이상일 때만 항로 표시
      if (fromFog !== 'Locked' && toFog !== 'Locked') {
        this.trackLines.lineStyle(
          1,
          track.from.startsWith('P2') ? 0x00f3ff : 0x334455,
          0.4
        );
        this.trackLines.beginPath();
        this.trackLines.moveTo(fromPlanet.x, fromPlanet.y);
        this.trackLines.lineTo(toPlanet.x, toPlanet.y);
        this.trackLines.strokePath();
      }
    });
  }

  // ─── 행성 스프라이트 생성 ───────────────────────────────────────────────
  private createPlanetSprite(planet: PlanetPosition) {
    const fogState = this.fogOfWar[planet.id] || 'Locked';
    const alpha = FOG_ALPHA[fogState];
    const factionColor = FACTION_COLORS[planet.faction] || 0x888888;
    const isVoid = planet.faction === 'F07';

    // 컨테이너 생성
    const container = this.add.container(planet.x, planet.y);
    container.setAlpha(alpha);

    // 행성 원형
    const planetCircle = this.add.graphics();
    const radius = isVoid ? 12 : 14;

    // 글로우 효과 (포그 해금된 경우)
    if (fogState !== 'Locked') {
      planetCircle.fillStyle(factionColor, 0.15);
      planetCircle.fillCircle(0, 0, radius + 6);
    }

    // 행성 본체
    planetCircle.fillStyle(factionColor, 0.8);
    planetCircle.fillCircle(0, 0, radius);

    // 보이드 균열 특별 처리 (점선 원)
    if (isVoid) {
      planetCircle.lineStyle(2, 0x00f3ff, 0.8);
      planetCircle.strokeCircle(0, 0, radius + 3);
    }

    // 행성 ID 텍스트
    const idText = this.add.text(0, 0, planet.id, {
      fontSize: '9px',
      color: '#ffffff',
      alpha: 0.8,
    }).setOrigin(0.5, 0.5);

    // 행성명 텍스트 (Scouted 이상)
    let nameText: Phaser.GameObjects.Text | null = null;
    if (fogState !== 'Locked') {
      const planetNames: Record<string, string> = {
        P01: '프록시마 b', P22: '방공호 본부', P27: '차원문', P30: '방주(Ark)',
        // 나머지는 데이터에서 로드
      };
      const displayName = planetNames[planet.id] || planet.id;
      nameText = this.add
        .text(0, radius + 10, displayName, {
          fontSize: '9px',
          color: '#aaccff',
        })
        .setOrigin(0.5, 0);
    }

    container.add([planetCircle, idText]);
    if (nameText) container.add(nameText);

    // 인터랙션 (Scouted 이상 클릭 가능)
    if (fogState !== 'Locked') {
      container.setInteractive(
        new Phaser.Geom.Circle(0, 0, radius + 10),
        Phaser.Geom.Circle.Contains
      );

      container.on('pointerover', () => {
        container.setScale(1.2);
        planetCircle.clear();
        planetCircle.fillStyle(factionColor, 1.0);
        planetCircle.fillCircle(0, 0, radius);
      });

      container.on('pointerout', () => {
        container.setScale(1.0);
        planetCircle.clear();
        planetCircle.fillStyle(factionColor, 0.8);
        planetCircle.fillCircle(0, 0, radius);
      });

      container.on('pointerdown', () => {
        this.selectPlanet(planet.id);
      });
    }

    this.planetSprites.set(planet.id, container);
  }

  // ─── 행성 선택 ──────────────────────────────────────────────────────────
  private selectPlanet(planetId: string) {
    // 이전 선택 해제
    if (this.selectedPlanetId) {
      const prev = this.planetSprites.get(this.selectedPlanetId);
      prev?.setScale(1.0);
    }

    this.selectedPlanetId = planetId;
    const selected = this.planetSprites.get(planetId);
    selected?.setScale(1.4);

    // 콜백 실행
    if (this.onPlanetSelect) {
      this.onPlanetSelect(planetId);
    }
  }

  // ─── 포그 업데이트 ────────────────────────────────────────────────────
  updateFogOfWar(newFog: Record<string, 'Locked' | 'Scouted' | 'Active'>) {
    this.fogOfWar = newFog;
    this.drawHyperTracks();

    this.galaxyMap.planets.forEach((planet) => {
      const container = this.planetSprites.get(planet.id);
      if (!container) return;

      const fogState = newFog[planet.id] || 'Locked';
      container.setAlpha(FOG_ALPHA[fogState]);
    });
  }

  // ─── 카메라 설정 (핀치 줌) ─────────────────────────────────────────────
  private setupCamera() {
    const cam = this.cameras.main;
    cam.setZoom(0.85);
    cam.centerOn(600, 600);

    // 마우스 휠 줌
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: any, deltaY: number) => {
      const zoom = cam.zoom - deltaY * 0.001;
      cam.setZoom(Phaser.Math.Clamp(zoom, 0.3, 2.0));
    });

    // 드래그 스크롤
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      isDragging = true;
      dragStartX = pointer.x + cam.scrollX;
      dragStartY = pointer.y + cam.scrollY;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isDragging) {
        cam.scrollX = dragStartX - pointer.x;
        cam.scrollY = dragStartY - pointer.y;
      }
    });

    this.input.on('pointerup', () => {
      isDragging = false;
    });
  }

  // ─── 행성 펄스 애니메이션 ─────────────────────────────────────────────
  private addPulseAnimation() {
    // 보이드 균열 행성에 특수 펄스 애니메이션
    ['P27', 'P28', 'P29', 'P30'].forEach((planetId) => {
      const container = this.planetSprites.get(planetId);
      if (!container) return;

      this.tweens.add({
        targets: container,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // 사령관 현재 위치 행성 깜빡임
    this.tweens.add({
      targets: this.planetSprites.get('P01'),
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  update() {
    // 매 프레임 업데이트 (필요 시 확장)
  }
}
