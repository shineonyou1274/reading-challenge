# Royal Reading Quest - 프로젝트 코드 상세 설명서

## 1. 프로젝트 개요
**Royal Reading Quest**는 게이미피케이션(Gamification) 요소를 접목한 독서 기록 웹 애플리케이션입니다. 사용자는 독서 시간을 기록하고 경험치(XP)를 획득하여 레벨을 올리며, 3개의 제국(로그라이아, 비전티움, 팩토리아) 중 하나에 소속되어 영토 경쟁을 벌입니다.

---

## 2. 기술 스택
- **Frontend**: React (Vite), TailwindCSS
- **Backend / Database**: Firebase (Authentication, Firestore, Hosting)
- **External API**: Google Books API (도서 검색)
- **Design**: Google Fonts (Pretendard), Material Symbols

---

## 3. 주요 디렉토리 구조
```
src/
├── components/       # UI 컴포넌트 (위젯, 모달, 리스트 등)
├── hooks/            # 커스텀 React Hooks (로직 재사용)
├── utils/            # 유틸리티 함수 (API 호출, RPG 로직 등)
├── App.jsx           # 메인 레이아웃 및 라우팅
├── firebase.js       # Firebase 초기화 설정
└── main.jsx          # 앱 진입점
```

---

## 4. 핵심 코드 분석

### A. 메인 로직 및 상태 관리

#### 1. `src/hooks/useReadingSession.js`
독서 타이머의 핵심 로직을 담당합니다.
- **기능**: 타이머 시작/일시정지/초기화, 경과 시간 계산
- **RPG 보상 계산 (`calculateRewards`)**:
  - 분당 10 XP 지급 (기본)
  - '깊은 몰입' 모드 선택 시 1.5배 보너스
  - **WPM(분당 페이지 수) 검증**: 분당 3페이지 이상 읽었다고 입력하면 '비정상 기록'으로 간주하여 경고.

#### 2. `src/hooks/useUserStats.js`
Firebase Firestore에서 사용자의 실시간 데이터를 가져옵니다.
- **기능**: 레벨, 경험치, 소속 제국, 닉네임 등을 실시간 동기화 (`onSnapshot`)
- **최적화**: 불필요한 호출을 막기 위해 `auth.currentUser`가 있을 때만 구독.

---

### B. 주요 UI 컴포넌트

#### 1. `src/components/QuestBoard.jsx` (메인 대시보드)
사용자가 가장 많이 보는 화면입니다.
- **레벨 카드**: 현재 등급(예: 남작, 백작)과 다음 레벨까지 남은 XP를 시각바(`ProgressBar`)로 표시.
- **독서 타이머**: '독서 시작하기' 버튼을 누르면 시간이 흐르고, '기록 저장' 시 모달을 띄움.
- **최근 읽은 책**: 로컬 스토리지(`localStorage`)를 활용해 최근 읽은 5권을 저장하고 따뜻한 캐러셀 UI로 보여줌.

#### 2. `src/components/EmpireWarMap.jsx` (제국 영토 전쟁)
전체 사용자의 데이터를 합산하여 경쟁 상황을 보여줍니다.
- **실시간 집계**: Firestore의 모든 사용자(`users`) 문서를 읽어 각 제국별 총 XP를 계산.
- **SVG 지도 시각화**: 3개의 영역(Logreia, Visiontium, Factoria)을 SVG 다각형으로 그리고, 점유율에 따라 색상과 텍스트를 업데이트.

#### 3. `src/components/Community.jsx` (실시간 피드)
다른 학자들의 독서 기록을 실시간으로 보여줍니다.
- **Feed**: `public_feed` 컬렉션을 구독하여 최신 20개의 활동(누가, 무슨 책을, 몇 분 읽었나)을 표시.
- **디자인**: '실시간 접속 중' 표시와 애니메이션 효과로 생동감 부여.
- **Theme Support**: 다크/라이트 모드에 대응하는 반응형 디자인 적용.

#### 4. Theme System (Dark/Light Mode)
- **Toggle**: `App.jsx` Header에 위치한 버튼으로 전환 가능.
- **Persistence**: `localStorage`에 'rrq_theme' 키로 사용자 선호 저장.
- **Implementation**: Tailwind CSS `darkMode: 'class'` 설정 사용. `dark:` 프리픽스로 다크 모드 스타일 지정.

---

### C. 유틸리티 및 설정

#### 1. `src/utils/bookApi.js` (Google Books 검색)
- **이중 검색 전략 (Fallback Strategy)**:
  1. **API Key 사용**: 1차적으로 설정된 API Key를 사용해 검색.
  2. **익명 모드 (Anonymously)**: 키 제한이나 할당량 문제로 403 에러 발생 시, 자동으로 키를 제거하고 재요청 시도 (복구 로직).
- **에러 핸들링**: 검색 실패 시 사용자에게 친절한 에러 메시지보다는 'Mock Data(빈 결과)' 대신 최대한 재시도를 하도록 설계.

#### 2. `src/utils/rpg.js` (게임 기획 데이터)
- **레벨 테이블**: 레벨별 필요 경험치 수식 (`BASE_XP * 1.2^Level`)
- **등급 정의**: 평민 -> 기사 -> ... -> 공작 (75레벨 이상)
- **제국 정의**: 3개 제국의 ID, 이름, 상징 색상 코드(`#fbbf24` 등) 관리.

---

## 5. Firebase 보안 규칙 (Firestore Rules)
데이터 무결성을 위해 다음과 같은 규칙이 적용되어야 합니다:
- **`users` 컬렉션**: 본인 문서만 수정 가능 (`request.auth.uid == userId`)
- **`public_feed`**: 누구나 읽기 가능, 쓰기는 인증된 사용자만 가능.

## 6. 배포 및 실행 가이드
1. **설치**: `npm install`
2. **로컬 실행**: `npm run dev`
3. **빌드**: `npm run build`
4. **배포**: `firebase deploy`

---

**작성일**: 2026. 02. 04.
**작성자**: Antigravity AI & 선생님

---

## 7. 업데이트 히스토리 (2026. 02. 04)
### v1.1.0 - 디자인 개편 및 안정화
- **Light Mode (테마 시스템) 도입**:
  - 다크 모드 전용이었던 앱에 **라이트 모드(White & Green Theme)**를 추가했습니다.
  - `Tailwind CSS`의 `darkMode: 'class'`를 활용하여, 헤더의 토글 버튼으로 즉시 전환되며 설정은 브라우저에 저장됩니다.
  - 특히 **커뮤니티(Community)** 탭은 최신 SNS 트렌드를 반영한 카드형 UI로 전면 개편되었습니다.

- **보안 및 서버 설정 강화**:
  - **API Key Restrictions**: Google Cloud Console에서 API 키가 특정 도메인(`gne-reading-2025.web.app`)에서만 작동하도록 제한을 걸어 보안을 강화했습니다.
  - **Firestore Rules 배포**: 데이터베이스 읽기/쓰기 권한을 명시한 `firestore.rules`를 적용하여, 인증된 사용자만 데이터를 쓰고 읽을 수 있도록 조치했습니다.

- **핵심 버그 수정 (Critical Fixes)**:
  - **"No document to update" 에러 해결**: 회원가입 직후나 데이터가 비어있을 때 `updateDoc` 호출 시 발생하던 치명적 오류를 `setDoc(..., { merge: true })`로 변경하여, 문서가 없으면 **자동으로 생성하고 복구**하도록 로직을 수정했습니다.
  - **데이터 로딩 최적화**: `Community` 등에서 데이터를 불러올 때의 권한 오류를 수정하고 예외 처리를 강화했습니다.

- **기능 추가**:
  - **제국 변경(Reset Empire)**: 프로필 화면에서 '제국 변경하기' 버튼을 통해, 언제든지 온보딩(제국 선택) 과정을 다시 진행할 수 있는 기능을 숨겨두었습니다.
