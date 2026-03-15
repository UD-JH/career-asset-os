# Career Asset OS

업무를 자산과 커리어 언어로 바꾸는 개인용 웹앱.

## 이번 버전(v5)
- 기존 UI 유지
- 브라우저 `localStorage` 저장 유지
- **Supabase 동기화 모드 추가**
- 이메일 매직 링크 로그인 추가
- 한 기기에서 입력한 데이터를 다른 기기에서도 같은 계정으로 사용 가능

## 파일
- `index.html`
- `styles.css`
- `app.js`
- `supabase_schema.sql`

## 빠른 실행
로컬 테스트:
1. 파일을 열거나 간단한 정적 서버로 실행
2. `app.js`의 `SITE_PASSWORD` 변경
3. 그냥 쓰면 로컬 모드
4. Supabase를 붙이려면 아래 설정 진행

## Supabase 연결 순서
1. Supabase에서 새 프로젝트 생성
2. SQL Editor에서 `supabase_schema.sql` 실행
3. Authentication > URL Configuration 에서 Site URL을 GitHub Pages 주소로 설정
4. `app.js` 상단의 값 채우기

```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_PUBLISHABLE_OR_ANON_KEY';
```

5. 배포 후 앱 좌측의 이메일 칸에 로그인 이메일 입력
6. "매직 링크 보내기" 클릭
7. 메일의 링크를 눌러 다시 앱으로 돌아오면 클라우드 모드 전환

## 중요한 점
- `SITE_PASSWORD`는 가벼운 잠금 장치일 뿐이야.
- 실제 데이터 보호는 Supabase 로그인 + RLS 정책이 담당해.
- `SUPABASE_ANON_KEY` 또는 publishable key는 브라우저에 넣어도 되지만, `service_role` 키는 절대 넣으면 안 돼.

## 현재 저장 구조
- 로그인 안 함 → localStorage
- Supabase 로그인 완료 → `public.works` 테이블

## 마이그레이션
기존 localStorage 데이터를 JSON 내보내기 한 다음,
Supabase 로그인 상태에서 JSON 불러오기를 하면 클라우드로 옮길 수 있어.
