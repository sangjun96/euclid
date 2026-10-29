# Euclid

Bun + TypeScript 기반 LLM 파이프라인의 기본 구조입니다. 도메인 테이블, LLM 호출과 평가 기능은 아직 추가하지 않았습니다.

## 구성

- `apps/server/src/api`: Hono HTTP API (`GET /api/health`)
- `apps/server/src/worker`: pg-boss 워커와 Hono 상태 확인 서버 (`GET /health`). 아직 큐와 작업 핸들러는 없습니다.
- `apps/server/src/db`: Drizzle 연결, 스키마 및 마이그레이션 실행기
- `packages/log`: Pino 구조화 로그와 OpenTelemetry trace / log 전송 설정
- `apps/web`: Vite + React 클라이언트와 Hono 정적 파일 서버 / API 프록시
- `packages/contracts`: 서버와 클라이언트의 HTTP 계약
- `infra/otel`: OTLP 로그 수신용 OpenTelemetry Collector 설정
- `compose.yaml`, `compose.dev.yaml`, `compose.prod.yaml`: 공통, 개발, 운영 구성

PostgreSQL 인스턴스에 앱용 `euclid`와 Phoenix용 `phoenix` 데이터베이스를 별도로 만듭니다. 현재 두 DB는 동일 계정을 사용하므로 운영 환경에서 최소 권한 계정 분리를 추가해야 합니다. pg-boss는 앱 DB에 자체 스키마를 생성합니다. Phoenix는 별도 컨테이너이고 애플리케이션 서버 및 워커의 런타임은 Bun입니다.

## 개발 환경

Docker와 Docker Compose가 필요합니다. 최초 이미지 빌드 및 다운로드에는 네트워크가 필요합니다.

```sh
cp .env.example .env
bun run dev
```

- 웹: http://localhost:8080
- API 상태: http://localhost:8080/api/health
- Phoenix: http://localhost:6006
- PostgreSQL: localhost:5432

앱 소스는 컨테이너에 마운트됩니다. API와 워커는 파일 변경 시 재시작하고, 웹은 Vite로 변경 사항을 반영합니다. 의존성이나 마이그레이션이 변경되면 이미지를 다시 빌드하세요.

```sh
bun run dev:down
```

## 운영 구성

이 Compose 구성은 단일 호스트를 위한 출발점입니다. HA, 백업, 복구 및 인증된 TLS 역방향 프록시는 별도로 준비해야 합니다. 기본적으로 웹과 Phoenix 포트는 호스트의 `127.0.0.1`에만 바인딩합니다. 앱 웹 UI에는 아직 로그인 기능이 없으므로 외부에 직접 공개하지 마세요.

```sh
cp .env.production.example .env
# .env의 비밀번호와 Phoenix secret을 길고 임의의 영숫자 값으로 변경
docker compose -f compose.yaml -f compose.prod.yaml up --build -d
```

Phoenix 인증은 운영 구성에서 활성화됩니다. 초기 관리자 계정에 로그인하여 비밀번호를 변경하고 API 키를 생성한 다음, `.env`에 `PHOENIX_API_KEY`를 설정하고 `docker compose -f compose.yaml -f compose.prod.yaml up -d`로 API, 워커와 웹을 재생성해야 trace가 인증된 Phoenix로 전송됩니다. 인증 설정과 초기 계정은 [Phoenix 문서](https://arize.com/docs/phoenix/deployment/authentication)를 확인하세요. API 키 설정 전 수집하지 못한 trace는 자동으로 복구되지 않습니다.

환경 파일의 DB 비밀번호는 연결 URL에 직접 들어가므로 영숫자만 사용하세요. DB 초기화 스크립트는 **빈 볼륨에서만** 실행됩니다. 기존 볼륨에서 `.env`의 비밀번호만 바꾸면 DB 계정 비밀번호는 바뀌지 않습니다. `docker compose down`은 볼륨을 유지하며 `down -v`는 DB 데이터를 삭제합니다.

## 로그와 OpenTelemetry

API, 워커, 웹 서버는 `@euclid/log`의 `createLogger('서비스명')`으로 JSON 로그를 stdout에 기록하고 동일한 로그를 OTLP로 전송합니다. 활성 span이 있으면 로그에 trace ID와 span ID가 포함됩니다. 오류는 `logger.error({ err: error }, '설명')`처럼 기록하세요. 로그 레벨은 `LOG_LEVEL`로 설정하며 기본값은 `info`입니다.

Compose의 Collector는 OTLP/HTTP 로그를 수신하여 자체 컨테이너 로그에 출력합니다 (`docker compose logs otel-collector`). 이는 저장소가 아니므로 영구 검색이나 보존을 위해서는 Collector에 로그 백엔드 exporter를 설정하거나 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`를 다른 OTLP/HTTP 로그 수신 주소로 지정하세요. 주소는 컨테이너에서 접근 가능해야 하며 `/v1/logs`를 포함해야 합니다. Phoenix는 기존처럼 trace 수신에 사용합니다. 로그 전송은 배치 방식이므로 종료 시 flush하며, 갑작스러운 종료 또는 수신기 장애 시 로그가 유실될 수 있습니다. stdout 로그는 별도로 남습니다.

```sh
bun packages/log/src/integration.test.ts
```

## Drizzle 마이그레이션

아직 스키마가 비어 있습니다. `apps/server/src/db/schema.ts`에 테이블을 추가한 뒤 아래 명령으로 SQL 마이그레이션을 생성하고 저장소에 함께 기록합니다.

```sh
bun install
bun run db:generate
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

시작 시 `migrate` 작업이 완료된 후 API와 워커가 실행됩니다. 운영 배포에서도 마이그레이션을 먼저 적용합니다. 배포 전 백업 및 마이그레이션의 호환성을 확인하세요.

## 검증과 한계

```sh
bun run typecheck
bun run check
bun run --bun build:web
```

현재 API health 요청에 수동 span만 생성합니다. LLM trace, 큐를 가로지르는 trace context 전파, 평가 및 점수 연동은 실제 파이프라인을 만들 때 구현해야 합니다. OpenTelemetry와 Phoenix 수집은 사용 버전으로 통합 검증이 필요합니다. Phoenix UI에서 직접 만든 데이터셋·실험은 앱 DB의 기준 데이터와 자동 동기화되지 않습니다.

Phoenix의 자체 사용 통계, 외부 리소스 로딩, 내장 에이전트의 웹 접근과 서버 측 bash는 Compose에서 비활성화합니다. 이 설정만으로 모든 네트워크 출구가 차단되는 것은 아니므로 LLM 외 외부 통신을 엄격히 제한하려면 배포 네트워크에서 별도 egress 정책을 적용해야 합니다.
