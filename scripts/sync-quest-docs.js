#!/usr/bin/env node
// Doc/PHASE*_QUEST_CARDS.md 문서의 컷씬 대사를 js/data/phase*_quests.js 코드에 반영
// 사용자 요청 2026-06-09: 문서 업데이트 → 코드 동기화 (오타·대사·퀘 데이터)

const fs = require('fs');
const path = require('path');

// 화자 → 캐릭터 키 매핑 (코드에서 사용하는 char ID)
const SPEAKER_TO_CHAR = {
  '백구': 'baekgu1',
  '{사령관}': 'commander',
  '사령관': 'commander',
  '마르코 폴로': 'hero08',
  '가가린': 'hero04',
  '이순신': 'hero01',
  '장영실': 'hero02',
  '광개토대왕': 'hero03',
  '호레이쇼 넬슨': 'hero05',
  '넬슨': 'hero05',
  '아인슈타인': 'hero06',
  '테슬라': 'hero07',
  '니콜라 테슬라': 'hero07',
  '아오리': 'delivery_F01',
  '볼프 노인': 'gather_F01',
  '볼프 자경단': 'combat_F01',
  '아우레우스 세관': 'delivery_F02',
  '광부 대표 린다': 'explore_F02',
  '시스템': 'system',
  '이휘소': 'hero09',
  '이휘소 박사': 'hero09',
  '레인저 맥시모프': 'gather_F06',
  '닥터 에바': 'gather_F03',
  '코르비누스': 'combat_F03',
  '오스카르': 'gather_F04',
  '코르넬리우스': 'combat_F02',
  '치크스': 'combat_F05',
  '우르사 메이저': 'ursa',
  '블랙팔콘': 'void_hiden',
};

// 화자 → 색상 매핑
const SPEAKER_COLOR = {
  '백구': '#66ddff',
  '{사령관}': '#00f3ff',
  '사령관': '#00f3ff',
  '마르코 폴로': '#ffd700',
  '가가린': '#88ccff',
  '이순신': '#c0a060',
  '장영실': '#a0d8ef',
  '광개토대왕': '#ff8844',
  '호레이쇼 넬슨': '#aaffaa',
  '넬슨': '#aaffaa',
  '아인슈타인': '#cc99ff',
  '테슬라': '#66ffff',
  '니콜라 테슬라': '#66ffff',
  '아오리': '#d4a574',
  '볼프 노인': '#a8b3c0',
  '시스템': '#9ee7ff',
};

function speakerToChar(speaker) {
  const cleaned = speaker.replace(/^\*+|\*+$/g, '').trim();
  return SPEAKER_TO_CHAR[cleaned] || 'system';
}
function speakerToColor(speaker) {
  const cleaned = speaker.replace(/^\*+|\*+$/g, '').trim();
  return SPEAKER_COLOR[cleaned] || '#9ee7ff';
}

// 마크다운에서 컷씬 블록 추출
// 형식:
//   ### 🎬 컷씬 CH01-A — "제목"
//   > 본문 (* 지문 * 또는 **화자**: "대사")
function extractCutscenes(md) {
  const cutscenes = {};
  // 헤더 매칭: ### 🎬 컷씬 CH##-?
  const blockRe = /^### 🎬 컷씬 (CH\d+-[A-Z]).*?$([\s\S]*?)(?=^###|^##|\Z)/gm;
  let m;
  while ((m = blockRe.exec(md))) {
    const id = m[1]; // e.g., CH01-A
    const body = m[2];
    const lines = [];
    // 대사 매칭: > **화자**: "대사"
    const dialogRe = /^>\s+\*\*([^*]+)\*\*\s*:\s*[""](.*?)[""]\s*$/gm;
    let d;
    while ((d = dialogRe.exec(body))) {
      const speaker = d[1].trim();
      const text = d[2].trim();
      lines.push({ speaker, text });
    }
    if (lines.length > 0) {
      cutscenes[id] = lines;
    }
  }
  return cutscenes;
}

// CH01-A → p1_ch01a 변환
function docIdToCodeId(docId, phaseNum) {
  const m = docId.match(/^CH(\d+)-([A-Z])$/);
  if (!m) return null;
  const chNum = m[1];
  const letter = m[2].toLowerCase();
  return `p${phaseNum}_ch${chNum}${letter}`;
}

// js 파일에서 컷씬 객체 위치 찾기 + 대사 치환
function updateCutscenesInJs(jsPath, docCutscenes, phaseNum) {
  let src = fs.readFileSync(jsPath, 'utf8');
  let updated = 0;

  for (const docId of Object.keys(docCutscenes)) {
    const codeId = docIdToCodeId(docId, phaseNum);
    if (!codeId) continue;
    const lines = docCutscenes[docId];

    // 새 배열 생성 — 따옴표/백슬래시 모두 안전하게 이스케이프
    function esc(s){ return s.replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
    const newArr = lines.map(l => {
      const char = speakerToChar(l.speaker);
      const color = speakerToColor(l.speaker);
      const rawName = l.speaker.replace(/^\*+|\*+$/g, '').trim();
      const name = esc(rawName);
      const text = esc(l.text);
      return `    {char:'${char}', name:'${name}', color:'${color}', text:'${text}'}`;
    });
    const newBlock = `${codeId}:[\n${newArr.join(',\n')}\n  ]`;

    // 기존 컷씬 객체 찾기
    const findRe = new RegExp(
      `${codeId}\\s*:\\s*\\[([\\s\\S]*?)\\]\\s*,?\\s*\\n`,
      'g'
    );
    if (findRe.test(src)) {
      src = src.replace(findRe, newBlock + ',\n\n  ');
      updated++;
    }
  }

  if (updated > 0) {
    fs.writeFileSync(jsPath, src);
  }
  return updated;
}

const phases = [1, 2, 3, 4, 5, 6];
let total = 0;
console.log('═══ 문서 → 코드 컷씬 동기화 ═══\n');

phases.forEach(p => {
  const docPath = `Doc/PHASE${p}_QUEST_CARDS.md`;
  const jsPath = `js/data/phase${p}_quests.js`;
  if (!fs.existsSync(docPath)) {
    console.log(`  ✗ Phase ${p}: doc 없음`);
    return;
  }
  if (!fs.existsSync(jsPath)) {
    console.log(`  ✗ Phase ${p}: code 없음`);
    return;
  }
  const md = fs.readFileSync(docPath, 'utf8');
  const cuts = extractCutscenes(md);
  const count = Object.keys(cuts).length;
  const updated = updateCutscenesInJs(jsPath, cuts, p);
  console.log(`  Phase ${p}: 문서 컷씬 ${count}개 추출 · 코드 갱신 ${updated}개`);
  total += updated;
});

console.log(`\n═══ 완료 — 총 ${total}개 컷씬 갱신 ═══`);
