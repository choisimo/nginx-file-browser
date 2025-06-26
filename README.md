# Nginx File Browser (Next.js)

## 🚀 시작하기

이 프로젝트는 Docker를 사용하여 쉽게 배포하고 실행할 수 있습니다.

### Docker Compose로 실행 (권장)

1.  **이미지 빌드 및 컨테이너 실행:**

    ```bash
    docker-compose up --build -d
    ```

2.  **서비스 접속:**
    -   웹 브라우저에서 `http://localhost:3101` 주소로 접속합니다.

3.  **서비스 종료:**

    ```bash
    docker-compose down
    ```

### Docker Compose 설정 (`docker-compose.yml`)

```yaml
version: '3.8'
services:
  nginx-file-browser:
    image: nginx-file-browser:latest
    build:
      context: .
    ports:
      - "3101:3000"
    volumes:
      - ./public/files:/app/public/files:rw
    environment:
      - NODE_ENV=production
      - STATIC_FILES_ROOT=/app/public/files
    restart: unless-stopped
```

## 📁 파일 저장소 설정

-   **호스트(로컬) 경로:** `[프로젝트 루트]/public/files`
-   **컨테이너 내부 경로:** `/app/public/files`

애플리케이션은 **`STATIC_FILES_ROOT`** 환경 변수에 설정된 경로의 파일들을 보여줍니다. `docker-compose.yml`의 `volumes` 설정을 통해 호스트의 `./public/files` 디렉터리가 컨테이너의 `/app/public/files` 경로에 연결(마운트)됩니다.

**따라서 로컬의 `./public/files` 디렉터리에 파일을 넣으면 웹 브라우저에서 해당 파일들을 볼 수 있습니다.**

> **⚠️ 주의:** 호스트 디렉터리에 대한 읽기/쓰기 권한 문제가 발생하지 않도록 폴더 권한을 확인해 주세요.
