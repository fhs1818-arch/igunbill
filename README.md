# 이건빌 임대관리

임대인이 직접 사용하는 단순한 임대관리 웹앱입니다.

## 기술 스택

- Next.js App Router
- TypeScript
- Prisma
- PostgreSQL
- Supabase Auth
- Tailwind CSS

## 메뉴

- 대시보드
- 호실관리
- 월세입금관리
- 수리관리
- 퇴실관리

## 데이터베이스

Vercel 배포에서는 Vercel Marketplace의 Prisma Postgres 또는 Neon Postgres를 연결해 사용합니다. 앱은 `DATABASE_URL` 환경변수만 읽습니다.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public&sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_PUBLISHABLE_KEY"
```

`prisma/schema.prisma`는 `provider = "postgresql"`와 `url = env("DATABASE_URL")`를 사용합니다. SQLite `prisma/dev.db`에는 더 이상 의존하지 않습니다.

## 관리자 로그인

관리자 로그인은 Supabase Auth의 이메일/비밀번호 로그인을 사용합니다.

- 회원가입 화면은 제공하지 않습니다.
- Supabase Dashboard에서 관리자 계정을 미리 생성하세요.
- 로그인하지 않은 사용자는 `/login`을 제외한 모든 페이지에 접근할 수 없습니다.

## 운영 모드

- 샘플 데이터 생성 기능은 제거되었습니다.
- 최초 실행 시 빈 데이터베이스로 시작합니다.
- 앞으로는 사용자가 직접 입력한 데이터만 사용합니다.
- `db:seed`를 실행해도 샘플 데이터는 생성되지 않습니다.
- 기존 운영 데이터는 seed 실행으로 삭제되거나 덮어써지지 않습니다.

## Vercel 배포 준비

1. Vercel 프로젝트를 생성하거나 연결합니다.

```bash
vercel
```

2. Vercel Dashboard에서 Marketplace DB를 연결합니다.

- Prisma Postgres
- Neon Postgres

3. Vercel 프로젝트의 Environment Variables를 설정합니다.

```text
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

4. 배포 빌드 명령은 아래 스크립트를 사용합니다.

```bash
npm run vercel-build
```

이 스크립트는 `prisma generate`, `next build`만 실행합니다. `prisma migrate deploy`는 Vercel 빌드 중 실행하지 않습니다.

5. DB migration이 필요할 때만 수동으로 실행합니다.

```bash
npm run prisma:deploy
```

6. 프로덕션 배포는 아래 명령으로 진행합니다.

```bash
vercel --prod
```

## 로컬 실행

로컬에서 실행하려면 PostgreSQL 연결 문자열과 Supabase Auth 환경변수를 `.env`에 설정합니다.

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## 백업

SQLite 파일 복사 방식의 백업은 Vercel 서버리스 환경에서 사용하지 않습니다. 운영 백업은 Vercel Marketplace DB 또는 해당 DB 콘솔의 백업 기능을 사용하세요.

## 금액 단위

보증금, 월세, 수리비, 중개비는 모두 만원 단위 숫자로 저장하고 `40만원`처럼 표시합니다.
