# Java 핵심 개념 및 기술 조사 (JAVA_BASIC.md)

이 문서는 Java 개발자가 학습해야 할 Java 고유의 핵심 아키텍처, JVM 작동 원리, 메모리 관리, 그리고 Modern Java(Java 8~21)의 주요 특징을 정리한 자료입니다. 일반적인 프로그래밍 언어 공통 개념(변수, 기본 제어문 등)은 제외하고 Java에 특화된 기술적 특징 위주로 구성되어 있습니다.

---

## 1. Java 플랫폼 아키텍처 및 실행 메커니즘

Java는 **"Write Once, Run Anywhere (한 번 작성하면 어디서나 실행된다)"**라는 철학을 바탕으로 동작합니다. 이를 가능하게 하는 핵심 아키텍처와 실행 방식은 다음과 같습니다.

### JDK, JRE, JVM의 관계
*   **JVM (Java Virtual Machine)**: Java 바이트코드(`.class`)를 해석하고 실행하는 가상 머신입니다. OS에 종속적이며, 해당 OS가 바이트코드를 이해할 수 있는 기계어로 변환합니다.
*   **JRE (Java Runtime Environment)**: JVM + Java 핵심 클래스 라이브러리(Java API)를 포함합니다. Java 프로그램을 **실행**하기만 할 때 필요합니다.
*   **JDK (Java Development Kit)**: JRE + 개발 도구(컴파일러 `javac`, 디버거, javadoc 등)를 포함합니다. Java 프로그램을 **개발**할 때 필요합니다.

### 컴파일 및 실행 과정
1.  **소스 코드 작성**: 개발자가 `.java` 소스 파일을 작성합니다.
2.  **바이트코드 컴파일**: Java 컴파일러(`javac`)가 소스 코드를 JVM이 이해할 수 있는 중간 코드인 **바이트코드(`.class`)**로 컴파일합니다.
3.  **클래스 로딩**: **클래스 로더(Class Loader)**가 실행 시점에 필요한 `.class` 파일들을 메모리(JVM Runtime Data Area)로 로드하고 링크 및 초기화합니다.
4.  **실행 (Execution Engine)**: JVM의 실행 엔진이 바이트코드를 실행합니다. 이때 두 가지 방식을 혼용합니다.
    *   **인터프리터(Interpreter)**: 바이트코드를 한 줄씩 읽어서 실행합니다. 초기 실행은 빠르나 전체적인 실행 속도가 느립니다.
    *   **JIT 컴파일러 (Just-In-Time Compiler)**: 인터프리터의 단점을 보완하기 위해, 자주 실행되는 코드(Hotspot)를 감지하여 런타임에 직접 기계어로 컴파일하고 캐싱합니다. 이후에는 컴파일된 기계어를 바로 실행하여 성능을 극대화합니다.

---

## 2. JVM 메모리 구조 (Runtime Data Area)

JVM이 프로그램을 실행하기 위해 OS로부터 할당받는 메모리 공간은 크게 5가지 영역으로 나뉩니다.

```mermaid
graph TD
    subgraph Threads Shared (모든 스레드 공유)
        MethodArea[Method Area / Metaspace]
        Heap[Heap Area]
    end
    subgraph Per-Thread (스레드 개별 생성)
        Stack[JVM Stack]
        PC[PC Register]
        Native[Native Method Stack]
    end
```

### 1) Method Area (메서드 영역 / Metaspace)
*   **설명**: 클래스 로더가 로드한 클래스 및 인터페이스에 대한 메타데이터(클래스 이름, 부모 클래스 이름, 메서드 정보, static 변수 등)가 저장되는 공간입니다.
*   *참고*: Java 8 이전에는 JVM이 관리하는 PermGen 영역이었으나, Java 8부터는 Native Memory를 사용하는 **Metaspace** 영역으로 변경되어 메모리 고갈 위험(OOM)이 줄어들었습니다.

### 2) Heap Area (힙 영역)
*   **설명**: `new` 연산자로 생성된 모든 객체(인스턴스)와 배열이 저장되는 공간입니다.
*   **특징**: 가비지 컬렉터(Garbage Collector)의 주요 관리 대상이며, 모든 스레드가 공유합니다.

### 3) JVM Stack (스레드 스택)
*   **설명**: 각 스레드마다 프레임(Frame)이라는 단위로 메모리가 할당되는 공간입니다.
*   **특징**: 메서드가 호출될 때마다 프레임이 push되고 메서드가 종료되면 pop됩니다. 프레임 내부에는 지역 변수(Local Variables), 매개 변수, 연산 栈(Operand Stack), 메서드 반환 값 등이 임시 저장됩니다. 스레드 개별 영역으로 동기화 문제가 발생하지 않습니다.

### 4) PC Register (Program Counter)
*   **설명**: 현재 스레드가 실행하고 있는 JVM 명령의 주소를 기록하는 영역입니다.

### 5) Native Method Stack
*   **설명**: Java 이외의 언어(C, C++ 등)로 작성된 네이티브 코드를 실행하기 위한 메모리 공간입니다. (JNI 관련)

---

## 3. 가비지 컬렉션 (Garbage Collection, GC)

Java는 개발자가 직접 메모리를 해제하지 않고, JVM의 **Garbage Collector**가 더 이상 참조되지 않는 객체를 메모리에서 자동으로 해제합니다.

### 가비지 컬렉션의 동작 원리
GC는 기본적으로 **Weak Generational Hypothesis(약한 세대 가설)**을 기반으로 설계되었습니다. (대부분의 객체는 금방 접근 불가능한 상태가 되며, 오래된 객체에서 젊은 객체로의 참조는 드물다.)

```
[ Heap Area ]
┌──────────────────────────────────────┬───────────────────────────────┐
│              Young Gen               │            Old Gen            │
├──────────────┬──────────────┬────────┤                               │
│     Eden     │ Survivor 0   │ Surv 1 │                               │
└──────────────┴──────────────┴────────┴───────────────────────────────┘
```

1.  **Young Generation (젊은 세대)**
    *   새롭게 생성된 객체들이 위치하는 영역입니다.
    *   대부분의 객체는 금방 사라지므로 이 영역에서 발생하는 GC를 **Minor GC**라고 부릅니다.
    *   **Eden**: 객체가 최초로 생성되는 공간입니다.
    *   **Survivor 0 / Survivor 1**: Eden이 꽉 차면 Minor GC가 발생하고, 살아남은 객체들이 두 Survivor 영역 중 하나로 이동합니다. (항상 둘 중 하나는 비어 있어야 합니다.)
2.  **Old Generation (구 세대)**
    *   Young 영역에서 살아남아 오랫동안 참조를 유지한 객체들이 이동(Promotion)하는 영역입니다.
    *   Young 영역보다 크기가 크며, 여기서 발생하는 GC를 **Major GC** (또는 Full GC)라고 부릅니다.

### GC 알고리즘 흐름: Mark and Sweep
*   **Mark**: JVM Stack, Method Area 등의 Root Set에서 시작하여 참조 체인을 따라가며 살아있는(Reachable) 객체를 구별해 표시합니다.
*   **Sweep**: Mark 되지 않은(Unreachable) 객체들을 힙 메모리에서 제거합니다.
*   **Compact**: 메모리 파편화(Fragmentation)를 방지하기 위해 흩어진 객체들을 한곳으로 모아 압축합니다. (일부 GC 알고리즘에서 실행)

### Stop-The-World (STW)
*   GC를 실행하기 위해 JVM이 애플리케이션 실행을 멈추는 작업입니다. GC 스레드를 제외한 모든 스레드가 중단됩니다.
*   Java 성능 튜닝의 핵심은 이 **STW 시간을 최소화**하는 것입니다.

### 주요 가비지 컬렉터
*   **G1 GC (Garbage First GC)**: 바둑판 형태의 Region이라는 영역으로 Heap을 분할하여 가비지가 많은 영역을 우선적으로 청소합니다. 대용량 메모리(4GB 이상)에 적합하며 Java 9부터 디폴트 GC입니다.
*   **ZGC (Z Garbage Collector)**: 대용량 메모리(최대 테라바이트급)를 위해 설계된 초저지연 GC로, STW 시간을 10ms 이하(Java 16부터는 1ms 이하)로 유지하며 동작합니다.

---

## 4. Java 고유의 객체 지향 및 언어 특징

### Object 클래스
모든 클래스의 최상위 부모 클래스입니다. 주요 메서드는 다음과 같습니다.
*   `equals(Object obj)`: 객체의 동등성(Equality, 논리적 같음)을 비교합니다. 재정의하지 않으면 기본적으로 `==` 주소 비교(Identity)를 합니다.
*   `hashCode()`: 객체의 해시 코드 값을 반환합니다. **"equals를 재정의하면 hashCode도 반드시 재정의해야 한다"**는 규약이 있습니다. (해시 기반 컬렉션 HashMap, HashSet 등의 오작동을 막기 위함)
*   `toString()`: 객체의 문자열 표현을 반환합니다.

### Primitive Type vs Reference Type
*   **Primitive Type (원시 타입)**: `int`, `double`, `boolean`, `char` 등. 실제 값을 Stack 영역에 직접 저장하며 성능이 빠르고 가볍습니다.
*   **Reference Type (참조 타입)**: `Integer`, `Double`, `String`, 사용자 정의 클래스 등. 힙 영역의 객체 주소(참조값)를 가집니다.
*   **Auto-boxing / Unboxing**: 원시 타입과 래퍼 클래스(Wrapper class) 간에 변환이 자동으로 이루어지는 기능입니다. (예: `int` <-> `Integer`). 과도한 박싱/언박싱은 성능 저하 및 불필요한 객체 생성을 유발할 수 있습니다.

### final 키워드
*   **final class**: 상속이 불가능한 클래스가 됩니다. (예: `String`)
*   **final method**: 오버라이딩(Overriding)이 불가능한 메서드가 됩니다.
*   **final variable**: 재할당이 불가능한 상수가 됩니다.

### Interface의 진화
*   Java 7 이전: 추상 메서드와 상수만 정의 가능했습니다.
*   **Java 8**: 구현 코드를 가질 수 있는 **default 메서드**와 **static 메서드**가 도입되었습니다. 이를 통해 기존 인터페이스 규칙을 깨지 않고 라이브러리에 새 기능을 추가할 수 있게 되었습니다.
*   **Java 9**: 인터페이스 내부 헬퍼 코드를 캡슐화하기 위해 **private 메서드** 정의가 가능해졌습니다.

---

## 5. Modern Java 주요 신규 기능 (Java 8 ~ 21)

Java는 8 버전을 기점으로 함수형 프로그래밍 요소를 적극 수용하였고, 11, 17, 21 LTS(Long Term Support) 버전을 거치며 생산성과 가독성이 극적으로 개선되었습니다.

### Java 8: 패러다임의 대변환
*   **Lambda Expressions (람다식)**: 함수(메서드)를 하나의 식(expression)으로 표현하여 코드의 간결성을 높입니다.
    ```java
    // 기존 익명 객체
    Runnable r1 = new Runnable() {
        @Override
        public void run() { System.out.println("Hello"); }
    };
    // 람다 표현식
    Runnable r2 = () -> System.out.println("Hello");
    ```
*   **Functional Interface (함수형 인터페이스)**: 단 하나의 추상 메서드만 가지는 인터페이스로, `@FunctionalInterface` 어노테이션으로 명시합니다. (`Predicate`, `Consumer`, `Function`, `Supplier` 등이 내장 제공됨)
*   **Stream API**: 선언형으로 컬렉션 데이터를 다룰 수 있는 API입니다. 필터링, 매핑, 정렬 등 체이닝 방식으로 가독성 높은 코드를 작성하며, 내부 반복자를 사용해 손쉽게 병렬 처리가 가능합니다.
*   **Optional<T>**: `null`을 직접 다루지 않고 래핑하여 `NullPointerException`을 깔끔하게 방지하기 위한 그릇 클래스입니다.

### Java 11: 지역 변수 타입 추론
*   **Local Variable Type Inference (`var`)**: 로컬 변수에 한해 컴파일러가 대입하는 값의 타입을 컴파일 시점에 자동으로 추론합니다.
    ```java
    var list = new ArrayList<String>(); // ArrayList<String>으로 타입 추론
    ```

### Java 17: 생산성 및 캡슐화 강화
*   **Record**: 불변 데이터 객체(DTO, VO)를 아주 간단하게 선언할 수 있도록 돕는 클래스 형식입니다. 필드 정의만 하면 컴파일러가 생성자, `getter`, `equals`, `hashCode`, `toString`을 자동으로 생성해 줍니다.
    ```java
    public record User(String name, int age) {}
    ```
*   **Sealed Classes**: 상속할 수 있는 하위 클래스를 제한(봉인)하여 다형성을 안전하게 제어합니다.
    ```java
    public sealed class Shape permits Circle, Rectangle {}
    ```
*   **Switch Expression**: 기존 switch 문을 값 반환이 가능한 식으로 사용할 수 있게 되었으며, 화살표(`->`) 구문을 지원합니다.

### Java 21: 동시성과 패턴 매칭 완성
*   **Virtual Threads (가상 스레드 - Project Loom)**: OS 스레드에 1:1로 매핑되는 전통적인 스레드 모델의 한계를 극복하기 위해, 하나의 OS 스레드 위에 수백만 개의 가상 스레드를 띄울 수 있는 가벼운(lightweight) 스레드 모델입니다. I/O 블로킹 시 오버헤드를 극적으로 최소화합니다.
*   **Record Patterns & Pattern Matching for switch**: switch 식이나 `instanceof`에서 객체 구조 분해와 패턴 매칭을 결합하여 복잡한 타입 검사 코드를 줄여줍니다.

---

## 6. Java 예외 처리 (Exception Handling)

Java는 예외 처리를 언어 스펙 수준에서 강제하며, 복구 가능한 예외와 복구 불가능한 예외를 명확히 구분합니다.

```
       [Throwable]
        ┌───┴───┐
     [Error] [Exception]
                │
         ┌──────┴──────┐
     [Checked]    [Unchecked]
    (IOException) (RuntimeException)
```

*   **Error**: JVM 수준에서 발생하는 심각한 에러로, 애플리케이션 코드 내에서 복구할 수 없습니다. (예: `OutOfMemoryError`, `StackOverflowError`)
*   **Checked Exception**:
    *   `RuntimeException`을 상속받지 않는 예외 클래스들입니다.
    *   컴파일 시점에 예외 처리(`try-catch` 또는 `throws`)를 반드시 해야 컴파일이 가능합니다. (예: `IOException`, `SQLException`)
*   **Unchecked Exception (Runtime Exception)**:
    *   `RuntimeException`을 상속받는 예외 클래스들입니다.
    *   컴파일러가 예외 처리를 확인하지 않으며, 주로 개발자의 논리적 오류에 의해 발생합니다. (예: `NullPointerException`, `IllegalArgumentException`)

### Try-with-resources (Java 7+)
*   외부 리소스(파일 입출력, DB 커넥션 등)를 사용하고 자동으로 닫아주는 문법입니다.
*   해당 리소스 클래스가 `AutoCloseable` 인터페이스를 구현하고 있어야 하며, 별도의 `finally` 블록에서 `close()`를 호출할 필요가 없어 메모리 누수를 안전하게 방지합니다.
    ```java
    try (BufferedReader br = new BufferedReader(new FileReader("file.txt"))) {
        return br.readLine();
    } // br이 스코프를 벗어날 때 자동으로 close()가 호출됨
    ```

---

## 7. Java 동시성 프로그래밍 (Concurrency)

### 전통적인 동시성
*   **Thread 클래스 및 Runnable 인터페이스**: 직접 스레드를 상속하거나 인터페이스를 구현해 `start()`를 호출하는 전통적인 방식입니다. 스레드 생성 비용이 크고 직접 관리가 까다롭습니다.
*   **synchronized 키워드**: 멀티스레드 환경에서 임계 영역(Critical Section)에 대한 상호 배제(Mutual Exclusion)를 보장하기 위해 사용되는 전통적인 락 방식입니다.
*   **volatile 키워드**: CPU 캐시가 아닌 메인 메모리에서 값을 직접 읽고 쓰도록 보장해 주는 키워드로, 변수 값의 가시성(Visibility) 문제를 해결합니다.

### java.util.concurrent 패키지 (Java 5+)
*   **ExecutorService**: 스레드 풀(Thread Pool)을 제공하고 작업을 비동기적으로 실행 및 관리하는 고수준 API입니다. 개발자가 스레드를 직접 생성/관리하지 않고 작업을 위임합니다.
*   **CompletableFuture (Java 8+)**: 자바 비동기 프로그래밍을 돕는 기능으로, 비동기 작업 결과들의 체이닝, 결합, 예외 처리를 람다 스타일로 깔끔하게 선언할 수 있습니다.

### Virtual Threads (가상 스레드, Java 21+)
*   기존 플랫폼 스레드(Platform Thread)는 OS 스레드를 직접 래핑하므로 개수 생성에 한계가 있었고, 입출력(I/O) 대기 시간 동안 스레드가 블로킹되어 자원이 낭비되었습니다.
*   가상 스레드는 JVM 수준에서 수백만 개를 가볍게 생성 및 관리하므로, 스레드 풀을 거의 사용하지 않고 **"요청당 하나의 스레드(Thread-per-request)"** 패러다임을 효율적으로 복구할 수 있게 되었습니다.
