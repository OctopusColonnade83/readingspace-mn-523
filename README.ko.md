<p align="center">
  <img src="web/src/assets/about/reading-space-logo.svg" width="112" alt="Reading Space 로고">
</p>

<h1 align="center">Reading Space MN</h1>

<p align="center">
  <strong>설명, 질의응답, 음성 읽기, 자료 조사를 MarginNote 독서 흐름 안에서 이어 가세요.</strong>
</p>

<p align="center">
  Reading Space MN은 MarginNote 4용 독서 워크플로 플러그인입니다. 선택 영역, 발췌문, 마인드맵 카드 옆에서 AI 도구, 내장 브라우저, 음성 읽기, Obsidian 연동을 사용할 수 있습니다.
</p>

<p align="center">
  <a href="README.md">简体中文</a> ·
  <a href="README.en.md">English</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.es.md">Español</a> ·
  <strong>한국어</strong>
</p>

---

## 다음 독서 동작을 읽고 있는 내용 바로 옆에

PDF, 웹페이지, 노트를 읽다 보면 개념을 설명받거나, 후속 질문을 하거나, 발췌문을 듣거나, 웹에서 출처를 확인해야 할 때가 많습니다. Reading Space MN은 이러한 동작을 하나의 독서 흐름으로 묶어 리더, 브라우저, AI 도구, 노트 앱 사이의 전환을 줄입니다.

MarginNote를 대체하지 않습니다. 지금 보고 있는 내용을 조사하고, 이해하고, 듣고, 보관하기 위한 집중된 진입점을 더합니다.

## 활용 장면

- 선택한 텍스트를 설명, 검색, 번역하고 후속 질문을 합니다.
- 발췌문과 마인드맵 카드를 읽어 주고, 댓글을 달거나 관련 카드를 만듭니다.
- 독서 흐름을 벗어나지 않고 내장 브라우저에서 정보를 조사하고 확인합니다.
- 가치 있는 발췌문이나 카드를 로컬 Obsidian ReadingSpace 저장소로 보냅니다.
- 명시한 데이터 범위에서 선택한 설정을 내보내고, 가져오고, 수동 동기화합니다.

## 핵심 기능

| 기능 | 용도 |
| --- | --- |
| **선택 영역 및 카드 도구 모음** | 선택 영역, 발췌문, 마인드맵 카드 옆에 음성 읽기, 설명, AI 질문, 댓글, 하위·형제 카드 만들기 동작을 제공합니다. |
| **AI 빠른 설명 및 검색** | 선택 영역이나 카드를 간단히 설명하고 사전, 번역, 후속 질문으로 이어 줍니다. |
| **AI 질의응답** | 사용자가 설정한 제공업체, 모델, Endpoint, 프롬프트로 별도 패널을 엽니다. |
| **내장 브라우저** | 독서 흐름 안에서 웹을 조사하고 홈, 북마크, 방문 기록, 현재 탭을 관리합니다. |
| **음성 읽기** | 설정한 TTS 서비스 또는 로컬 Obsidian 브리지로 음성을 만들고 별도 플레이어로 전달합니다. |
| **Obsidian 보내기** | 현재 발췌문이나 카드를 로컬 Obsidian ReadingSpace의 선택한 폴더로 보냅니다. |
| **설정 및 수동 동기화** | 외관, AI, 브라우저, 오디오, 내보내기 설정을 관리하고 선택한 iCloud 데이터를 수동 업로드·가져오기 합니다. |

## 일반적인 사용 흐름

1. MarginNote에서 텍스트, 발췌문 또는 마인드맵 카드를 선택합니다.
2. Reading Space 도구 모음에서 음성 읽기, 설명, 검색, AI 질문 또는 카드 동작을 선택합니다.
3. 별도 기능 패널이나 플레이어에서 결과를 확인하고 필요하면 대화를 계속합니다.
4. 유용한 자료를 로컬 Obsidian으로 보내거나 설정에서 선택한 데이터를 수동으로 처리합니다.

## 현재 상태

현재 공개 소스 스냅샷은 버전 **0.1.5**이며 실행에는 **MarginNote 4.2.3 이상**이 필요합니다.

> [!IMPORTANT]
> 검수된 `0.1.5` `.mnaddon` 패키지는 [GitHub Releases의 Reading Space MN v0.1.5](https://github.com/Awaker-OTE/readingspace-mn/releases/tag/v0.1.5)에서 다운로드할 수 있습니다. 소스 빌드 결과물은 계속 로컬 개발과 검증용이며 Release에 첨부된 검수 완료 패키지를 대체하지 않습니다.

중요한 사용 범위:

- AI와 TTS에는 사용자의 제공업체, Endpoint, API Key 또는 기타 연결 정보가 필요합니다. 제3자 자격 증명은 포함되어 있지 않습니다.
- 자동 동기화는 실험 기능이며 현재 중지되어 있습니다. 설정 저장 시 자동 업로드하지 않고 iCloud 수동 업로드와 가져오기만 제공합니다.
- 브라우저 Cookie와 로그인 상태는 기기에만 보관되며 설정 내보내기와 iCloud 동기화에서 제외됩니다.
- 로컬 Obsidian 브리지는 주로 데스크톱용이며 iPad에서는 사용할 수 없습니다.
- MarginNote 버전, 기기, 네트워크 환경에 따라 동작이 달라질 수 있습니다.

## 소스 검증 및 빌드

플러그인 실행에는 MarginNote 4.2.3 이상이 필요합니다. 공개 소스 빌드에는 Node.js 22.12 이상, pnpm 10 이상, 시스템 `zip` 명령도 필요합니다.

```bash
git clone https://github.com/Awaker-OTE/readingspace-mn.git
cd readingspace-mn
pnpm install --frozen-lockfile
pnpm verify
pnpm build
```

`pnpm verify`는 공개 경계, 소스 스냅샷 영수증, 기능 계약을 확인합니다. `pnpm build`는 고정 이름과 타임스탬프가 붙은 `.mnaddon` 파일을 `artifacts/`에 만들지만 플러그인을 설치하거나 MarginNote를 재시작하거나 바탕 화면에 쓰거나 내부 게시 서비스를 호출하지 않습니다.

공개 빌드는 재현성과 회귀 검증을 위한 것으로, 검수된 정식 배포 결과물을 대체하지 않습니다.

## 검증 가능한 소스 출처

이 저장소는 관리되는 공개 미러입니다. 제품 소스는 하나의 완전한 내부 Git 커밋에서 내보내며, `PUBLIC_SOURCE.json`에 소스 커밋, 버전, 관리 파일과 파일별 SHA-256을 기록합니다.

```bash
pnpm verify:source-snapshot
```

`src/`, `web/`, 관리되는 기능 계약 스크립트는 이 공개 미러에서 독립적으로 개발하지 않습니다. 공개 전용 README, CI, 보안 정책, 로컬 부작용이 없는 빌드 외피는 별도로 관리할 수 있지만 런타임 제품 동작은 바꾸지 않습니다.

## 개인정보 및 데이터 경계

- 저장소에는 사용자 API Key, Bridge token, 브라우저 Cookie, 채팅 기록 또는 기타 사용자 데이터가 없습니다.
- 브라우저 로그인 상태는 로컬에만 남고 설정 내보내기와 iCloud에서 제외됩니다.
- 민감한 동기화 항목은 명시적으로 선택한 뒤 수동으로 업로드하거나 가져와야 합니다.
- 공개 Issue, 로그, 스크린샷에 비밀 정보, 토큰, Cookie, 비공개 문서 또는 실제 사용자 데이터를 올리지 마세요.
- 보안 문제는 [SECURITY.md](SECURITY.md)에 따라 신고하고 세부 내용이나 가리지 않은 증거를 공개하지 마세요.

## 라이선스 및 독립성

소스는 열람과 보안 검토를 위해서만 공개되며 **오픈 소스 소프트웨어가 아닙니다**. 관련 법률 또는 GitHub 서비스 약관이 명시적으로 허용하는 경우를 제외하고 복사, 수정, 배포, 재라이선스, 판매 또는 파생 저작물 제작 권한을 부여하지 않습니다. 자세한 조건은 [LICENSE](LICENSE)를 확인하세요.

Reading Space MN은 독립적으로 설계하고 구현한 프로젝트입니다. MarginNote, OpenAI, ChatGPT, Obsidian 또는 기타 제3자 서비스의 공식 제품이 아니며 승인, 파트너십 또는 호환성 보장을 의미하지 않습니다. 제3자 명칭과 상표는 각 권리자에게 있습니다.
