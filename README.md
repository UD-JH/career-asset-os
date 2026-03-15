# career-asset-os v5 fixed

비밀번호 게이트와 Supabase 동기화가 함께 들어간 통합판입니다.

## 이번 버전에서 되는 것
- 비밀번호 입력 후 진입
- 업무 등록 / 수정 / 삭제
- 문제 / 행동 / 결과 / 배운 점 구조화
- 역량 태그, 자산, Skill Map, 월간 요약
- JSON / Markdown export
- localStorage 저장
- Supabase 이메일 매직 링크 로그인
- 클라우드에서 불러오기 / 클라우드에 올리기

## 꼭 먼저 바꿔야 하는 값
`app.js` 상단의 아래 3개를 수정하세요.

```js
const SITE_PASSWORD = 'change-this-password';
const SUPABASE_URL = '';
const SUPABASE_PUBLISHABLE_KEY = '';
```

- `SITE_PASSWORD`: 접속용 비밀번호
- `SUPABASE_URL`: Supabase Project URL
- `SUPABASE_PUBLISHABLE_KEY`: Supabase Publishable key

## Supabase 준비 순서
1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase_schema.sql` 실행
3. Authentication > URL Configuration에서 GitHub Pages 주소 등록
4. `app.js`에 URL / key 입력
5. GitHub에 push
6. 배포 페이지에서 이메일 입력 후 매직 링크 로그인

## 동기화 방식
- 로그인 안 하면 localStorage에만 저장
- 로그인하면
  - `클라우드에서 불러오기`: DB → 현재 브라우저
  - `현재 데이터 클라우드에 올리기`: 현재 브라우저 → DB
- 업무 저장/삭제/불러오기를 한 뒤 로그인 상태면 자동으로 클라우드에도 반영 시도

## 중요한 점
- 비밀번호 게이트는 정적 사이트용 간단한 접근 제한일 뿐입니다.
- 실제 데이터 보안은 Supabase Auth + RLS 정책이 담당합니다.
- `service_role` / secret key는 절대 브라우저 코드에 넣지 마세요.
