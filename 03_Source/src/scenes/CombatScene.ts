/**
 * DESTINATION EARTH — CombatScene (Phaser 3)
 * 16v16 턴제 전술 전투 씬 (GDD v6.0 §15)
 */

import Phaser from 'phaser';
import {
  sortByTurnOrder,
  executeTurn,
  calculateWipeoutPenalty,
  type CombatUnit,
  type CombatResult,
  type CombatLogEntry,
} from '../utils/combatEngine';

export class CombatScene extends Phaser.Scene {
  private playerUnits: CombatUnit[] = [];
  private enemyUnits: CombatUnit[] = [];
  private currentTurn = 0;
  private combatLog: CombatLogEntry[] = [];
  private commanderLOY = 100;
  private hasEinsteinAlive = false;

  // UI 요소
  private logText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private turnIndicator!: Phaser.GameObjects.Text;
  private unitSprites: Map<string, Phaser.GameObjects.Container> = new Map();

  // 콜백
  private onCombatEnd?: (result: CombatResult) => void;
  private isCombatRunning = false;
  private autoTurnDelay = 1200; // ms

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data: {
    playerUnits: CombatUnit[];
    enemyUnits: CombatUnit[];
    commanderLOY: number;
    hasEinsteinAlive: boolean;
    onCombatEnd?: (result: CombatResult) => void;
  }) {
    this.playerUnits = data.playerUnits;
    this.enemyUnits = data.enemyUnits;
    this.commanderLOY = data.commanderLOY;
    this.hasEinsteinAlive = data.hasEinsteinAlive;
    this.onCombatEnd = data.onCombatEnd;
    this.currentTurn = 0;
    this.combatLog = [];
    this.isCombatRunning = false;
  }

  preload() {
    this.load.image('ship_player_small', '/assets/images/vehicles/ships/small_fighters/S01_placeholder.png');
    this.load.image('ship_enemy', '/assets/images/vehicles/ships/small_fighters/enemy_placeholder.png');
    this.load.image('combat_bg', '/assets/images/environment/backgrounds/combat_bg.png');
  }

  create() {
    // 배경
    this.cameras.main.setBackgroundColor('#050a1a');
    this.addSpaceBackdrop();

    // 전장 레이아웃
    this.setupBattlefield();

    // UI 초기화
    this.setupUI();

    // 전투 시작
    this.time.delayedCall(500, () => this.startCombat());
  }

  // ─── 우주 배경 ──────────────────────────────────────────────────────────
  private addSpaceBackdrop() {
    const g = this.add.graphics();
    g.fillStyle(0x050a1a, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);

    for (let i = 0; i < 150; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height * 0.7);
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
      g.fillCircle(x, y, Phaser.Math.FloatBetween(0.5, 2));
    }
  }

  // ─── 전장 유닛 배치 ──────────────────────────────────────────────────────
  private setupBattlefield() {
    const width = this.scale.width;
    const height = this.scale.height * 0.65;

    // 플레이어 유닛 (왼쪽)
    const maxPlayerCols = 4;
    this.playerUnits.forEach((unit, index) => {
      const col = index % maxPlayerCols;
      const row = Math.floor(index / maxPlayerCols);
      const x = 80 + col * 100;
      const y = 100 + row * 90;
      this.createUnitSprite(unit, x, y, true);
    });

    // 적 유닛 (오른쪽)
    this.enemyUnits.forEach((unit, index) => {
      const col = index % maxPlayerCols;
      const row = Math.floor(index / maxPlayerCols);
      const x = width - 80 - col * 100;
      const y = 100 + row * 90;
      this.createUnitSprite(unit, x, y, false);
    });
  }

  // ─── 유닛 스프라이트 생성 ─────────────────────────────────────────────
  private createUnitSprite(unit: CombatUnit, x: number, y: number, isPlayer: boolean) {
    const container = this.add.container(x, y);

    // 함선 아이콘 (임시 도형)
    const g = this.add.graphics();
    const color = isPlayer ? 0x00f3ff : 0xff4444;

    g.fillStyle(color, 0.9);
    if (isPlayer) {
      // 플레이어 함선 (오른쪽 방향)
      g.fillTriangle(-20, 15, 20, 0, -20, -15);
    } else {
      // 적 함선 (왼쪽 방향)
      g.fillTriangle(20, 15, -20, 0, 20, -15);
    }

    // HP 바
    const hpBarBg = this.add.graphics();
    hpBarBg.fillStyle(0x333333, 1);
    hpBarBg.fillRect(-20, 20, 40, 5);

    const hpBar = this.add.graphics();
    hpBar.fillStyle(0x00ff44, 1);
    hpBar.fillRect(-20, 20, 40, 5);

    // 실드 바 (INT)
    const shieldBar = this.add.graphics();
    shieldBar.fillStyle(0x0066ff, 1);
    shieldBar.fillRect(-20, 26, 40 * (unit.currentINT / Math.max(unit.stats.INT, 1)), 3);

    // 유닛 이름
    const nameText = this.add.text(0, -22, unit.name.substring(0, 6), {
      fontSize: '8px',
      color: isPlayer ? '#aaddff' : '#ffaaaa',
    }).setOrigin(0.5, 1);

    container.add([g, hpBarBg, hpBar, shieldBar, nameText]);
    this.unitSprites.set(unit.id, container);
  }

  // ─── UI 설정 ────────────────────────────────────────────────────────────
  private setupUI() {
    const width = this.scale.width;
    const height = this.scale.height;

    // 턴 표시기 (상단)
    this.turnIndicator = this.add.text(width / 2, 10, 'TURN 0', {
      fontSize: '14px',
      color: '#deff9a',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    // 상태 텍스트
    this.statusText = this.add.text(width / 2, 30, '전투 준비 중...', {
      fontSize: '12px',
      color: '#00f3ff',
    }).setOrigin(0.5, 0);

    // 전투 로그 (하단)
    const logBg = this.add.graphics();
    logBg.fillStyle(0x0d1117, 0.85);
    logBg.fillRect(0, height * 0.7, width, height * 0.3);

    this.logText = this.add.text(10, height * 0.7 + 8, '', {
      fontSize: '10px',
      color: '#888888',
      fontFamily: 'monospace',
      wordWrap: { width: width - 20 },
    });

    // 속도 조절 버튼
    const speedBtn = this.add.text(width - 80, 10, '⏩ 빠르게', {
      fontSize: '11px',
      color: '#ffcc00',
      backgroundColor: '#1a2a3a',
      padding: { x: 8, y: 4 },
    }).setOrigin(1, 0).setInteractive();

    speedBtn.on('pointerdown', () => {
      this.autoTurnDelay = this.autoTurnDelay === 1200 ? 300 : 1200;
      speedBtn.setText(this.autoTurnDelay === 300 ? '⏸ 일반' : '⏩ 빠르게');
    });
  }

  // ─── 전투 시작 ──────────────────────────────────────────────────────────
  private startCombat() {
    this.isCombatRunning = true;
    this.statusText.setText('⚔️ 전투 중!');
    this.runNextTurn();
  }

  // ─── 턴 실행 ────────────────────────────────────────────────────────────
  private runNextTurn() {
    if (!this.isCombatRunning) return;

    this.currentTurn++;
    this.turnIndicator.setText(`TURN ${this.currentTurn}`);

    // 생존 유닛 확인
    const alivePlayers = this.playerUnits.filter((u) => u.currentHP > 0);
    const aliveEnemies = this.enemyUnits.filter((u) => u.currentHP > 0);

    if (alivePlayers.length === 0) {
      this.endCombat('enemy');
      return;
    }

    if (aliveEnemies.length === 0) {
      this.endCombat('player');
      return;
    }

    // 턴 오더 결정
    const allUnits = [...alivePlayers, ...aliveEnemies];
    const turnOrder = sortByTurnOrder(allUnits);

    // 각 유닛 순서대로 공격
    turnOrder.forEach(({ unit }, index) => {
      this.time.delayedCall(index * (this.autoTurnDelay / turnOrder.length), () => {
        if (unit.currentHP <= 0) return;

        // 공격 대상 선택 (적 유닛 중 랜덤)
        const targets = unit.isPlayer
          ? this.enemyUnits.filter((u) => u.currentHP > 0)
          : this.playerUnits.filter((u) => u.currentHP > 0);

        if (targets.length === 0) return;

        const target = targets[Phaser.Math.Between(0, targets.length - 1)];
        const logEntry = executeTurn(unit, target, this.currentTurn, this.commanderLOY);
        this.combatLog.push(logEntry);

        // UI 업데이트
        this.updateUnitUI(target);
        this.showAttackEffect(unit, target, logEntry.isCritical);
        this.updateLog(logEntry.message);
      });
    });

    // 다음 턴 예약
    this.time.delayedCall(this.autoTurnDelay, () => {
      this.runNextTurn();
    });
  }

  // ─── 유닛 UI 업데이트 ─────────────────────────────────────────────────
  private updateUnitUI(unit: CombatUnit) {
    const container = this.unitSprites.get(unit.id);
    if (!container) return;

    // HP 바 업데이트
    const hpRatio = Math.max(0, unit.currentHP / unit.stats.HP);
    const hpBar = container.getAt(2) as Phaser.GameObjects.Graphics;
    hpBar.clear();
    const hpColor = hpRatio > 0.5 ? 0x00ff44 : hpRatio > 0.2 ? 0xffaa00 : 0xff2222;
    hpBar.fillStyle(hpColor, 1);
    hpBar.fillRect(-20, 20, 40 * hpRatio, 5);

    // 사망 처리
    if (unit.currentHP <= 0) {
      container.setAlpha(0.2);
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 800,
        ease: 'Power2',
      });
    }
  }

  // ─── 공격 이펙트 ─────────────────────────────────────────────────────
  private showAttackEffect(attacker: CombatUnit, target: CombatUnit, isCritical: boolean) {
    const attackerSprite = this.unitSprites.get(attacker.id);
    const targetSprite = this.unitSprites.get(target.id);
    if (!attackerSprite || !targetSprite) return;

    // 발사체 애니메이션
    const bullet = this.add.graphics();
    bullet.fillStyle(isCritical ? 0xffdd00 : 0x00f3ff, 1);
    bullet.fillCircle(0, 0, isCritical ? 5 : 3);
    bullet.setPosition(attackerSprite.x, attackerSprite.y);

    this.tweens.add({
      targets: bullet,
      x: targetSprite.x,
      y: targetSprite.y,
      duration: 200,
      ease: 'Power1',
      onComplete: () => {
        // 충격 이펙트
        this.cameras.main.shake(isCritical ? 150 : 50, isCritical ? 0.02 : 0.005);
        bullet.destroy();
      },
    });
  }

  // ─── 전투 로그 업데이트 ───────────────────────────────────────────────
  private updateLog(message: string) {
    const recent = this.combatLog.slice(-5).map((l) => l.message);
    this.logText.setText(recent.join('\n'));
  }

  // ─── 전투 종료 ──────────────────────────────────────────────────────────
  private endCombat(winner: 'player' | 'enemy' | 'draw') {
    this.isCombatRunning = false;

    const capturedUnits = this.combatLog
      .filter((l) => l.isCapture)
      .map((l) => l.target);

    const assetsLost = winner === 'enemy';
    const result: CombatResult = {
      winner,
      turnsElapsed: this.currentTurn,
      capturedUnits,
      creditsEarned: winner === 'player' ? this.currentTurn * 5000 : 0,
      assetsLost,
      log: this.combatLog,
    };

    // 전패 시 전멸 패널티 처리
    if (assetsLost) {
      const penalty = calculateWipeoutPenalty(0, this.hasEinsteinAlive);
      result.assetsLost = penalty.assetsLost;
    }

    // 결과 표시
    const resultText = winner === 'player' ? '🎉 전투 승리!' : '💀 전투 패배';
    const resultColor = winner === 'player' ? '#deff9a' : '#ff4444';

    this.add.text(this.scale.width / 2, this.scale.height / 2, resultText, {
      fontSize: '32px',
      color: resultColor,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    // 콜백 실행
    this.time.delayedCall(2000, () => {
      if (this.onCombatEnd) this.onCombatEnd(result);
    });
  }
}
