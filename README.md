# 한양에너지 웹사이트

한양에너지의 공식 웹사이트입니다. 태양광 발전 투자 플랫폼을 제공하는 기업으로, 안전하고 신뢰할 수 있는 재생에너지 투자 서비스를 제공합니다.

## 프로젝트 구조

```
한양/
├── css/                    # CSS 스타일 파일
│   ├── global.css         # 전역 스타일
│   ├── header.css         # 헤더 스타일
│   └── main-sections.css  # 메인 페이지 섹션 스타일
├── js/                    # JavaScript 파일
│   └── main.js           # 메인 스크립트
├── img/                   # 이미지 파일
├── images/               # 추가 이미지 파일
├── videos/               # 비디오 파일
└── index.html            # 메인 페이지
```

## 주요 기능

### 1. 반응형 헤더
- 데스크탑과 모바일 환경에 최적화된 네비게이션
- 드롭다운 메뉴 지원
- 모바일 햄버거 메뉴

### 2. 메인 비디오 섹션
- 배경 비디오와 함께하는 히어로 섹션
- WebM과 MP4 포맷 지원
- 반응형 디자인

### 3. 신뢰도 슬라이더
- 자동 슬라이드 기능
- 인디케이터 네비게이션
- 터치 친화적 인터페이스

### 4. 투자 현황 표시
- 숫자 카운팅 애니메이션
- Intersection Observer를 이용한 스크롤 트리거
- 실시간 통계 표시

### 5. 언론보도 섹션
- 카드 형태의 뉴스 디스플레이
- 더보기/접기 기능
- 외부 링크 연결

### 6. 발전소 현황 슬라이더
- 무한 스크롤 이미지 슬라이더
- CSS 애니메이션 활용
- 호버 효과

### 7. 팝업 시스템
- 순차적 팝업 표시
- 로컬 스토리지를 이용한 "하루 동안 보지 않기" 기능
- 부드러운 애니메이션 효과

## 기술 스택

- **HTML5**: 시맨틱 마크업
- **CSS3**: Flexbox, Grid, 애니메이션
- **JavaScript ES6+**: 모듈화된 스크립트
- **Font**: Pretendard (한국어 최적화 폰트)
- **Icons**: Font Awesome

## 브라우저 지원

- Chrome (최신 버전)
- Firefox (최신 버전)
- Safari (최신 버전)
- Edge (최신 버전)
- Mobile Chrome/Safari

## 최적화 요소

### 성능
- 이미지 최적화 (WebP 포맷 지원)
- CSS/JS 파일 분리로 캐싱 효율성 증대
- Lazy Loading 구현

### 접근성
- 시맨틱 HTML 사용
- ARIA 라벨 적용
- 키보드 네비게이션 지원
- 색상 대비 고려

### SEO
- 메타 태그 최적화
- Open Graph 태그
- 구조화된 데이터

## 파일 설명

### CSS 파일
- `global.css`: 전역 리셋, 유틸리티 클래스, 기본 스타일
- `header.css`: 헤더 네비게이션, 모바일 메뉴 스타일
- `main-sections.css`: 메인 페이지의 모든 섹션 스타일

### JavaScript 파일
- `main.js`: 전체 웹사이트의 인터랙티브 기능

### 이미지 요구사항
다음 이미지들이 필요합니다:

#### 로고 및 브랜딩
- `img/newlogo1234.png`: 메인 로고
- `img/favi.ico`: 파비콘

#### 신뢰도 섹션
- `img/t1.jpg`: 신뢰 이미지 1
- `img/t2.jpg`: 신뢰 이미지 2
- `img/t3.jpg`: 신뢰 이미지 3

#### 투자 현황 아이콘
- `images/1.png`: 투자자 수 아이콘
- `images/2.png`: 누적 출자 금액 아이콘
- `images/3.png`: 발전소 아이콘
- `images/4.png`: 수익 지급률 아이콘

#### 발전소 이미지
- `img/powerstation1.jpg`부터 `img/powerstation5.jpg`: 발전소 사진들

#### 팝업 이미지
- `adm/uploads/popup_images/`: 팝업에 사용될 이미지들

#### 비디오 파일
- `videos/eco-background.webm`: WebM 포맷 배경 비디오
- `videos/eco-background.mp4`: MP4 포맷 배경 비디오
- `img/eco-fallback.jpg`: 비디오 대체 이미지

## 설치 및 실행

1. 파일을 웹 서버에 업로드
2. 이미지 및 비디오 파일을 해당 폴더에 배치
3. 브라우저에서 `index.html` 접근

## 커스터마이징

### 색상 변경
주요 브랜드 색상은 CSS 변수로 관리됩니다:
- 주색상: `#E67E22` (오렌지)
- 보조색상: `#D35400` (다크 오렌지)
- 텍스트색: `#333` (다크 그레이)

### 콘텐츠 수정
- 텍스트 내용: `index.html`에서 직접 수정
- 투자 현황 수치: `data-target` 속성 값 변경
- 언론보도 링크: `onclick` 속성의 URL 변경

## 문의

한양에너지 웹 개발팀
- 이메일: hanenergy@example.com
- 주소: 전라남도 보성군 보성읍 구교길2-1

## 라이선스

© 2023 주식회사 한양에너지. All Rights Reserved.
