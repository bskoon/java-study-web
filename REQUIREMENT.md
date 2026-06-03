# Requirements Document: Interactive Java/JVM Learning Platform

## 1. Project Overview
* **Target:** Java의 OOP 동작 원리, JVM 메모리 구조, Garbage Collection 메커니즘을 시각적(애니메이션 및 시뮬레이션)으로 학습할 수 있는 단일 페이지 웹 애플리케이션(SPA).
* **Deployment Environment:** GitHub Pages (Static Web Hosting)
* **Tech Stack Limitations:** No backend, No framework (React/Vue 등 사용 불가). 오직 Pure HTML5, CSS3, Vanilla JavaScript(ES6+)만 사용할 것. 모든 상태 관리는 브라우저 메모리 내에서 런타임으로 처리됨.

---

## 2. Architecture & File Structure (GitHub Pages Target)
배포 및 유지보수가 용이하도록 다음과 같은 구조를 엄격히 준수해야 함.

repository-root/
│
├── index.html          # 메인 레이아웃 및 UI 컨테이너 (Single Page)
├── css/
│   └── style.css       # 전체 테마, 대시보드 레이아웃, 애니메이션 스타일
└── js/
    ├── app.js          # 메인 컨트롤러 및 라우팅/탭 전환 로직
    ├── oop-sim.js      # Module 1: OOP & Reference 시뮬레이션 로직
    ├── jvm-mem.js      # Module 2: JVM Runtime Data Area 시각화 로직
    └── gc-sim.js       # Module 3: GC (Mark-and-Sweep) 애니메이션 로직

---

## 3. Functional Requirements (기능 요구사항)
웹 페이지는 상단 탭을 통해 전환되는 3개의 핵심 학습 모듈로 구성된다. 모든 모듈에는 사용자가 직접 값을 입력하거나 트리거할 수 있는 '시뮬레이션 컨트롤러'가 포함되어야 한다.

### 💡 Module 1: Java OOP & Reference Simulation
* **목적:** Java의 다형성, 상속, 그리고 변수 생성 시 메모리 바인딩 과정을 시각화.
* **필수 UI 및 기능:**
    * **코드 플레이그라운드 (좌측):** 프리셋 코드 선택 가능 (예: Parent p = new Child();, String s1 = "java"; String s2 = new String("java");).
    * **메모리 맵 (우측):** 코드 실행 버튼([Step Into], [Run]) 클릭 시, Stack 영역에 변수가 생성되고 Heap 영역의 실제 객체 인스턴스를 화살표(포인터)로 가리키는 애니메이션 구현.
    * **String Pool 특화 시각화:** 리터럴 선언과 new 선언 시 Constant Pool을 참조하는지, 별도 Heap 공간을 파는지 명확히 구분하여 도식화.

### 🧠 Module 2: JVM Runtime Data Area Interactive Map
* **목적:** JVM 메모리 레이아웃의 구조와 데이터 흐름 이해.
* **필수 UI 및 기능:**
    * **JVM 구역 시각화:** Method Area, Heap, Java Threads (Stack), PC Register, Native Method Stack 영역을 그리드 레이아웃으로 배치.
    * **스레드 전역 vs 독립 표시:** Method/Heap은 전역 공유 영역으로, Stack/PC는 스레드별(Thread 1, Thread 2 버튼 클릭 시 전환) 독립 영역으로 시각적 마킹.
    * **런타임 흐름 시뮬레이터:** [메서드 호출] 버튼 클릭 -> Method Area에서 바이트코드 로드 -> Stack에 Stack Frame (Local Variables, Operand Stack)이 쌓이는 과정 시각화.

### 🧹 Module 3: Garbage Collection (GC) Simulator
* **목적:** JVM의 Mark-and-Sweep 알고리즘 및 Generational Garbage Collection 메커니즘 시각 이해.
* **필수 UI 및 기능:**
    * **Heap 분할 구조:** Heap 영역을 Young Generation (Eden, Survival 0, Survival 1)과 Old Generation으로 쪼개어 시각화.
    * **객체 동적 생성 버튼 ([Create Object]):** 클릭 시 Eden 영역에 블록(객체)이 생성됨. 일부 블록은 서로 참조 선으로 연결되거나, Stack 변수와 연결(Reachable)되도록 설정.
    * **참조 끊기 버튼 ([Disconnect]):** 특정 객체의 참조를 끊어 Unreachable 상태(색상 변경 등으로 표시)로 만드는 기능.
    * **GC 실행 버튼 ([Run Minor GC] / [Run Major GC]):**
        * **Mark 단계:** Root Set(Stack)으로부터 연결된 Reachable 객체를 탐색하여 마킹하는 애니메이션.
        * **Sweep/Copy 단계:** Unreachable 객체는 페이드아웃으로 제거되고, Eden의 살아남은 객체가 Survival 영역으로 이동하며 Age Bit(숫자)가 1 증가하는 애니메이션 구현. Age가 일정 수준을 넘으면 Old Generation으로 Promotion 이동.

---

## 4. Non-Functional Requirements (비기능 요구사항)

### 🎨 UI/UX & 그래픽스 (Visualization Guide)
* **No Heavy Libraries:** Canvas API 또는 순수 CSS Flexbox/Grid + CSS Transition/Animation을 최우선으로 사용하여 메모리 블록 이동 및 화살표 포인팅을 구현할 것.
* **Responsive & Clean Design:** 다크 모드 기반의 가독성 높은 IDE 스타일 테마 (예: Dracula 테마 톤).
* **State Reset:** 모든 시뮬레이터는 초기 상태로 되돌릴 수 있는 [Reset] 버튼이 필수적으로 존재해야 함.

### 🚀 배포 및 코드 품질
* **Pure Static Web:** index.html을 더블 클릭하여 로컬 브라우저에서 실행해도 CORS 에러 없이 완벽히 동작해야 함 (ES 모듈화 시 type="module"을 사용하므로 로컬 테스트를 위한 가이드나 단일 스크립트 결합 구조 고려).
* **Vanilla JS Module Isolation:** 파일 간 전역 변수 충돌을 방지하기 위해, 각 파일은 즉시 실행 함수(IIFE) 패턴이나 명확한 네임스페이스 객체(예: window.GC_SIMULATOR = ...) 구조를 가질 것.
* **Performance:** GC 시뮬레이션 시 DOM 객체가 과도하게 생성되어 브라우저가 버벅이지 않도록 최대 객체 생성 개수 제한(예: 최대 30개)을 걸 것.

---

## 5. Deliverables (산출물 요구사항)
Coding Agent는 최종적으로 다음 스크립트가 온전히 포함된 완성형 코드를 출력해야 합니다.
1. index.html: 전체 Layout, Tab UI, 시뮬레이션 Viewport HTML 구조.
2. css/style.css: 그리드 배치, 레퍼런스 화살표 효과, GC 이동 애니메이션 Keyframes.
3. js/ 내부의 핵심 비즈니스 로직 스크립트 파일들 (app.js, oop-sim.js, jvm-mem.js, gc-sim.js).

---
**Instructions for Agent:** 위 요구사항에 맞춰 코드를 작성해 주되, 특히 GC 시뮬레이터에서 Eden -> Survival 영역으로 객체가 복사되면서 남은 메모리가 정리되는 시각 효과(CSS Transition)가 매끄럽게 표현되도록 JavaScript DOM 제어 코드를 정밀하게 짜줘.