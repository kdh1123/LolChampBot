# 롤챔봇 (LolChampBot)

경쟁전 시작 전 포지션과 난이도에 맞는 챔피언, 그리고 선택 챔피언의 밴 후보를 제안하는 Discord 봇입니다.

## 기능과 흐름

`/챔피언추천` → 포지션(탑/정글/미드/원딜/서포터) → 난이도(쉬움/보통/어려움) → 최대 4명 추천 → 챔피언 선택 → 동일 포지션 밴 후보 최대 3명입니다. 추천과 밴 결과는 Embed와 버튼으로 제공되며, 명령 실행자만 조작할 수 있습니다.

## 설치와 실행

```bash
npm install
cp .env.example .env
# .env에 Discord 애플리케이션의 토큰과 클라이언트 ID 입력
npm run deploy:commands
npm run dev
```

Discord Developer Portal에서 Bot을 생성하고 `applications.commands`, `bot` 스코프로 서버에 초대하세요. 개발 서버에서는 `DISCORD_GUILD_ID`를 설정하면 명령어가 즉시 등록됩니다. `.env`는 커밋하지 않습니다.

## 기술과 구조

Node.js, TypeScript(strict), discord.js, dotenv, Zod, ESLint, Prettier, Vitest, JSON 데이터를 사용합니다.

- `src/bot.ts`: Discord UI와 상호작용
- `src/services/`: 추천/밴 알고리즘 및 교체 가능한 세션 저장소
- `src/data/`: JSON 제공자와 데모 데이터
- `src/domain.ts`: 공유 도메인·제공자 인터페이스

## 난이도와 알고리즘

난이도는 스킬샷, 메커닉, 라인전, 생존, 성장, 판단(각 1~3점)의 가중 평균입니다. 1.6 미만은 쉬움, 2.3 미만은 보통, 그 이상은 어려움입니다. 가중치와 경계는 `src/config.ts`에 분리했습니다.

추천 점수는 정규화된 승률(55%), 픽률(25%), 표본 신뢰도(20%)이며 상위 8개에서 가중치 랜덤으로 중복 없이 최대 4개를 선택합니다. 밴은 매치업 불리함(60%), 상대 픽률(25%), 표본 신뢰도(15%)를 반영하며 동일 포지션만 사용합니다.

## 검증

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`를 실행합니다.

## 데이터 안내 및 제한

현재 미드 포지션 데모 데이터가 완성되어 있으며 화면에 **데모 데이터**임을 표시합니다. 실제 경쟁전 통계나 Riot API 연동은 아직 하지 않습니다. 다음 단계는 각 포지션 데이터 확장 및 약관을 준수하는 통계 공급자 구현입니다.
