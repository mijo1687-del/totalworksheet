# 건설현장 사진관리앱

모바일 현장에서 사진을 촬영/업로드하고, 날짜+카테고리 기준으로 사진대장 PDF를 생성하는 앱입니다.

## 저장 위치

```text
C:\Users\Administrator\Documents\Codex\2026-05-25\pdf-date-code-hub-key-daily\photo-management
```

## 파일 구조

```text
photo-management/
├ index.html
├ css/
│  └ style.css
├ js/
│  ├ app.js
│  ├ photo.js
│  ├ pdf.js
│  ├ search.js
│  └ api.js
└ gas/
   └ Code.gs
```

## 주요 기능

- 카메라 촬영
- 갤러리/다중 사진 선택
- 카테고리 분류: CONST, SAFE, TBM, QUAL, ENV, ETC
- 공종/부위/작업내용/촬영자 입력
- Google Drive 원본사진 저장
- Photo_DB 기록
- 날짜+카테고리 기준 사진대장 PDF 생성
- PDF_Log 기록
- 작업일보 연동용 `list_pdf` API 제공

## Drive 저장 구조

```text
현장사진관리_DB/
├ 2026/
│  ├ 2026-05/
│  │  ├ 2026-05-25/
│  │  │  ├ 시공/
│  │  │  ├ 안전/
│  │  │  ├ TBM/
│  │  │  ├ 품질/
│  │  │  ├ 환경/
│  │  │  └ 기타/
│  │  └ 사진대장_PDF/
```

## Google Spreadsheet 시트

```text
Photo_DB
PDF_Log
```

## Apps Script 초기 설정

1. Google Spreadsheet 생성
2. `gas/Code.gs` 전체 복사
3. Apps Script `Code.gs`에 붙여넣기
4. 저장
5. 함수 드롭다운에서 `setupSheets` 실행
6. 웹앱 배포

웹앱 배포 설정:

```text
실행 사용자: 나
액세스 권한: 모든 사용자
```

## 작업일보 연동 API

작업일보 앱의 `설정/백업`에서 사진관리앱 API URL에 이 앱의 GAS 웹앱 URL을 넣으면 됩니다.

요청:

```text
GET ?action=list_pdf&date=2026-05-25
```

응답:

```json
{
  "status": "ok",
  "items": [
    {
      "category": "CONST",
      "category_name": "현장시공사진",
      "photo_date": "2026-05-25",
      "photo_count": 12,
      "pdf_url": "https://drive.google.com/..."
    }
  ]
}
```

작업일보는 사진 원본을 저장하지 않고, 이 응답의 사진대장 PDF 링크만 연결합니다.
