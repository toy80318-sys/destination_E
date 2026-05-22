/**
 * DESTINATION EARTH — Galaxy Generator
 * Mulberry32 PRNG 기반 Galaxy Seed 1000 고정 스타맵 생성
 * GDD v6.0 §5 기준
 */

export interface PlanetPosition {
  id: string;
  x: number;
  y: number;
  ring: number;
  angle: number;
  faction: string;
}

export interface HyperTrack {
  from: string;
  to: string;
  distance: number;
}

export interface GalaxyMap {
  planets: PlanetPosition[];
  tracks: HyperTrack[];
  seed: number;
}

// ─── Mulberry32 PRNG (결정론적 난수 생성기) ──────────────────────────────────
function mulberry32(seed: number) {
  return function (): number {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── 행성 위치 생성 (세션 시작 1회 고정) ────────────────────────────────────
export function generateGalacticPositions(
  galaxySeed: number = 1000,
  centerX: number = 600,
  centerY: number = 600
): PlanetPosition[] {
  const rng = mulberry32(galaxySeed);
  const jitter = 12; // GDD §5.1 ±12px 고정

  // 링 반경 (GDD §5.2)
  const ringRadii = [65, 130, 195, 260, 325, 390];

  // 행성 데이터 (GDD §5.3 — angle 고정)
  const planetData = [
    // 링 2 — 수퍼비아
    { id: 'P01', ring: 2, angle: 65, faction: 'F01' },
    { id: 'P02', ring: 2, angle: 85, faction: 'F01' },
    { id: 'P03', ring: 2, angle: 105, faction: 'F01' },
    { id: 'P04', ring: 2, angle: 115, faction: 'F01' },
    // 링 3 — 아우레우스
    { id: 'P05', ring: 3, angle: 130, faction: 'F02' },
    { id: 'P06', ring: 3, angle: 145, faction: 'F02' },
    { id: 'P07', ring: 3, angle: 160, faction: 'F02' },
    { id: 'P08', ring: 3, angle: 170, faction: 'F02' },
    // 링 4 — 메카니카
    { id: 'P09', ring: 4, angle: 10, faction: 'F03' },
    { id: 'P10', ring: 4, angle: 25, faction: 'F03' },
    { id: 'P11', ring: 4, angle: 40, faction: 'F03' },
    { id: 'P12', ring: 4, angle: 50, faction: 'F03' },
    // 링 5 — 크리그
    { id: 'P13', ring: 5, angle: 185, faction: 'F04' },
    { id: 'P14', ring: 5, angle: 205, faction: 'F04' },
    { id: 'P15', ring: 5, angle: 220, faction: 'F04' },
    { id: 'P16', ring: 5, angle: 235, faction: 'F04' },
    // 링 1 — 치크스 제국
    { id: 'P17', ring: 1, angle: 0, faction: 'F05' },
    { id: 'P18', ring: 1, angle: 72, faction: 'F05' },
    { id: 'P19', ring: 1, angle: 144, faction: 'F05' },
    { id: 'P20', ring: 1, angle: 216, faction: 'F05' },
    { id: 'P21', ring: 1, angle: 288, faction: 'F05' },
    // 링 6 — 지구 저항군
    { id: 'P22', ring: 6, angle: 245, faction: 'F06' },
    { id: 'P23', ring: 6, angle: 260, faction: 'F06' },
    { id: 'P24', ring: 6, angle: 275, faction: 'F06' },
    { id: 'P25', ring: 6, angle: 290, faction: 'F06' },
    { id: 'P26', ring: 6, angle: 305, faction: 'F06' },
    // 보이드 균열 (링2~5 꼭짓점)
    { id: 'P27', ring: 2, angle: 315, faction: 'F07' },
    { id: 'P28', ring: 3, angle: 325, faction: 'F07' },
    { id: 'P29', ring: 4, angle: 335, faction: 'F07' },
    { id: 'P30', ring: 5, angle: 345, faction: 'F07' },
  ];

  return planetData.map((p) => {
    const radius = ringRadii[p.ring - 1];
    const rad = (p.angle * Math.PI) / 180;
    // Jitter 적용 (결정론적)
    const jx = (rng() - 0.5) * 2 * jitter;
    const jy = (rng() - 0.5) * 2 * jitter;

    return {
      id: p.id,
      x: centerX + radius * Math.cos(rad) + jx,
      y: centerY + radius * Math.sin(rad) + jy,
      ring: p.ring,
      angle: p.angle,
      faction: p.faction,
    };
  });
}

// ─── 항로 생성 (Kruskal MST — Zero-Isolation 보장) ───────────────────────────
export function generateHyperTracks(
  planets: PlanetPosition[]
): HyperTrack[] {
  // 모든 엣지 후보 생성 (거리 기반)
  const edges: Array<{ from: string; to: string; dist: number }> = [];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const dx = planets[i].x - planets[j].x;
      const dy = planets[i].y - planets[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      edges.push({ from: planets[i].id, to: planets[j].id, dist });
    }
  }

  // 거리 오름차순 정렬
  edges.sort((a, b) => a.dist - b.dist);

  // Kruskal MST — Union-Find
  const parent: Record<string, string> = {};
  planets.forEach((p) => (parent[p.id] = p.id));

  function find(x: string): string {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x: string, y: string): boolean {
    const px = find(x);
    const py = find(y);
    if (px === py) return false;
    parent[px] = py;
    return true;
  }

  const mstTracks: HyperTrack[] = [];

  // Pass 1: MST (모든 노드 연결 보장)
  for (const edge of edges) {
    if (union(edge.from, edge.to)) {
      mstTracks.push({ from: edge.from, to: edge.to, distance: edge.dist });
    }
    if (mstTracks.length === planets.length - 1) break;
  }

  // Pass 2: 인접 링 추가 항로 (플레이 경험 개선)
  const additionalTracks: HyperTrack[] = [];
  for (const edge of edges) {
    if (edge.dist < 160) {
      // 인접 범위 내 추가 연결
      const already = mstTracks.some(
        (t) =>
          (t.from === edge.from && t.to === edge.to) ||
          (t.from === edge.to && t.to === edge.from)
      );
      if (!already) {
        additionalTracks.push({
          from: edge.from,
          to: edge.to,
          distance: edge.dist,
        });
      }
    }
  }

  return [...mstTracks, ...additionalTracks];
}

// ─── ΔR 무역 마진 계산 (GDD §5.5) ─────────────────────────────────────────
export function calculateTradeMargin(
  ringI: number,
  angleI: number,
  ringJ: number,
  angleJ: number
): number {
  const deltaR =
    Math.abs(ringI - ringJ) +
    0.1 * Math.min(Math.abs(angleI - angleJ), 360 - Math.abs(angleI - angleJ));

  // 마진율: ΔR ≤ 2 → 4.0배 / ΔR ≥ 4 → 5.0배 / 선형 보간
  if (deltaR <= 2) return 4.0;
  if (deltaR >= 4) return 5.0;
  return 4.0 + ((deltaR - 2) / 2) * 1.0;
}

// ─── 전체 갤럭시 맵 생성 (세션당 1회 호출) ────────────────────────────────
export function generateGalaxyMap(seed: number = 1000): GalaxyMap {
  const planets = generateGalacticPositions(seed);
  const tracks = generateHyperTracks(planets);

  // Zero-Isolation 검증
  const connectedIds = new Set<string>();
  tracks.forEach((t) => {
    connectedIds.add(t.from);
    connectedIds.add(t.to);
  });

  const isolated = planets.filter((p) => !connectedIds.has(p.id));
  if (isolated.length > 0) {
    console.error(
      '⚠️ Zero-Isolation Protocol Violation:',
      isolated.map((p) => p.id)
    );
    // 비상 연결: 고립 노드를 P01에 강제 연결
    isolated.forEach((p) => {
      const p01 = planets.find((pl) => pl.id === 'P01')!;
      const dx = p.x - p01.x;
      const dy = p.y - p01.y;
      tracks.push({
        from: p.id,
        to: 'P01',
        distance: Math.sqrt(dx * dx + dy * dy),
      });
    });
  }

  return { planets, tracks, seed };
}
