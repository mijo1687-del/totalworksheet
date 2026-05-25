# 현장 작업일보 허브

건설현장 작업일보를 중심으로 공종별 작업현황, 출역인원, 장비, 자재, 첨부문서, 사진대장 PDF 링크를 관리하는 기본 앱입니다.

## 저장 위치

```text
C:\Users\Administrator\Documents\Codex\2026-05-25\pdf-date-code-hub-key-daily\field-daily-hub
```

## 파일 구조

```text
field-daily-hub/
├ index.html
├ css/
│  └ style.css
├ js/
│  ├ app.js
│  ├ master.js
│  ├ daily.js
│  ├ summary.js
│  └ api.js
└ gas/
   └ Code.gs
```

## 현재 포함된 기능

- 작업일보 기본정보 입력
- 공종별 작업현황 입력
- 장비사용 입력
- 자재 반입/사용 입력
- 사진대장 PDF 조회/포함 UI
- 첨부문서 입력
- 작업일보 저장/보관함 조회/불러오기/삭제
- 기준정보 관리
- 누계/검색 화면
- 작업일보 출력폼 미리보기
- 주간공정보고/월간공정보고 출력폼 미리보기
- 앱 내 설정 화면에서 GAS URL 저장
- 브라우저 임시 저장 데이터 백업/복원
- Google Apps Script API 기본 골격

## 지금 바로 사용하는 방법

`index.html`을 브라우저에서 열면 바로 사용할 수 있습니다.

GAS URL을 연결하기 전에는 브라우저 저장공간에 임시 저장됩니다.

- 작업일보 작성 후 `저장`
- `보관함`에서 저장 목록 조회
- `열기`로 다시 불러오기
- `삭제`로 보관함에서 삭제
- `PDF 출력`으로 작업일보 출력폼 미리보기
- `공정보고`에서 주간/월간 공정보고 미리보기
- `설정/백업`에서 GAS URL 저장
- `설정/백업`에서 임시 저장 데이터 백업/복원

## GAS 연결 위치

앱의 `설정/백업` 화면에서 배포된 GAS 웹앱 URL을 입력하면 됩니다.

코드에서 직접 고정하려면 `js/api.js`의 아래 값을 사용할 수도 있습니다.

```js
const CONFIG = {
  dailyApiUrl: "",
  photoApiUrl: ""
};
```

## GAS 초기 세팅

`gas/Code.gs`를 Google Apps Script에 붙여 넣고 배포한 뒤, 최초 1회 아래 액션을 호출하면 시트가 생성됩니다.

```text
?action=setup
```

운영 연결 후 저장 데이터는 브라우저가 아니라 Google Drive의 Google Spreadsheet에 저장됩니다.

## 핵심 키

```text
date_code = YYYYMMDD
hub_key   = DAY-YYYYMMDD
daily_id  = DR-YYYYMMDD-001
```
