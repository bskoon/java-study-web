(function() {
    // Root Application Namespace
    window.App = {
        init: init,
        log: log,
        clearLogs: clearLogs,
        showPreDetail: showPreDetail
    };

    // DOM Elements Cache
    let navButtons, consoleLogs;

    // Step 0 Pre-requisites Educational Data
    const PRE_REQUISITE_DETAILS = {
        'source': {
            title: "📄 Java 소스 코드 (HelloWorld.java)",
            content: `
                <p>개발자가 작성하는 사람 중심의 소스 코드 파일(`.java`)입니다.</p>
                <ul>
                    <li>자바는 강타입(Strongly-typed) 객체 지향 언어로 문법 검사가 매우 엄격합니다.</li>
                    <li>모든 클래스는 하나의 파일 구조를 갖는 것이 원칙이며, 기계가 바로 해석할 수 없습니다.</li>
                </ul>
            `
        },
        'bytecode': {
            title: "⚙️ JVM 바이트코드 (HelloWorld.class)",
            content: `
                <p>자바 컴파일러(<code>javac</code>)가 소스 코드를 빌드하여 생성한 중간 단계의 기계어입니다.</p>
                <ul>
                    <li>물리적인 특정 CPU가 아닌 가상의 머신(JVM)이 이해할 수 있도록 컴파일되어 있습니다.</li>
                    <li>이 기계어 독립성 덕분에 <strong>"한 번 작성해 어디서든 실행(WORA)"</strong>이 실현됩니다.</li>
                </ul>
            `
        },
        'jvm': {
            title: "☕ JVM (Java Virtual Machine)",
            content: `
                <p>바이트코드를 해석하고 실제 컴퓨터 시스템(OS)에 맞추어 실시간 기계어로 변환/실행하는 가상환경입니다.</p>
                <ul>
                    <li><strong>JRE/JDK의 핵심</strong>이며 메모리 관리(GC), 스레드 스케줄링, 보안 샌드박스를 책임집니다.</li>
                    <li>각 운영체제(Windows, Linux, macOS)에 맞는 별도의 JVM이 공급되므로, 소스코드의 수정 없이도 플랫폼 이식이 극도로 단순화됩니다.</li>
                </ul>
            `
        },
        'interpreter': {
            title: "⚡ 바이트코드 인터프리터 (Interpreter)",
            content: `
                <p>JVM 실행 엔진의 기본 구성 요소로, 로드된 바이트코드를 위에서부터 순차적으로 기계어로 번역하며 실행합니다.</p>
                <ul>
                    <li><strong>특징:</strong> 초기 실행 속도가 매우 빠르지만, 동일한 루프나 중복 메서드가 발생해도 매번 똑같이 한 줄씩 새로 번역하므로 장기적 실행 효율은 떨어집니다.</li>
                </ul>
            `
        },
        'jit': {
            title: "🚀 JIT (Just-In-Time) 컴파일러",
            content: `
                <p>인터프리터 방식의 단점을 해결하는 고성능 보완 컴파일러입니다.</p>
                <ul>
                    <li><strong>동작:</strong> 실시간 실행 도중 자주 반복 호출되어 성능 병목이 생기는 영역(Hot Spot)을 실시간 추적하여, 해당 영역 전체를 원시 기계어(Native Code)로 통째로 구워 캐시에 올립니다.</li>
                    <li><strong>결과:</strong> 이후 해당 코드가 호출되면 번역 절차를 생략하고 즉시 물리 하드웨어 성능으로 수행되므로 C++에 근접한 속도를 발휘합니다.</li>
                </ul>
            `
        },
        'hardware': {
            title: "💻 운영체제 및 하드웨어",
            content: `
                <p>JVM의 실행 엔진에 의해 실시간 네이티브 기계어로 최종 번역된 코드는 실제 OS 커널과 CPU에 도달해 실행됩니다.</p>
                <ul>
                    <li>하드웨어 자원(CPU 클록, 물리 RAM)을 사용하며, OS가 제공하는 스레드 및 메모리 자원에 최종 매핑됩니다.</li>
                </ul>
            `
        }
    };

    function init() {
        navButtons = document.querySelectorAll('.nav-btn');
        consoleLogs = document.getElementById('console-logs');

        // Nav click router
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetStep = parseInt(e.currentTarget.getAttribute('data-step'));
                switchStep(targetStep);
            });
        });

        // Initialize child modules
        window.OopSim.init();
        window.JvmMem.init();
        window.GcSim.init();

        // Standard Resize Listener to avoid broken references
        window.addEventListener('resize', handleWindowResize);

        // Show Step 0 default detail
        showPreDetail('source');
    }

    function switchStep(stepIndex) {
        // Hide all views
        document.querySelectorAll('.step-view').forEach(view => {
            view.classList.remove('active');
        });

        // Remove active class from buttons
        navButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        // Show targets
        document.getElementById(`view-step-${stepIndex}`).classList.add('active');
        document.querySelector(`.nav-btn[data-step="${stepIndex}"]`).classList.add('active');

        // Clear global arrow overlays
        const svg = document.getElementById('svg-overlay');
        if (svg) {
            const paths = Array.from(svg.querySelectorAll('path')).filter(p => !p.closest('defs'));
            paths.forEach(p => p.remove());
        }

        // Reset or initialize modules on navigation
        if (stepIndex === 0) {
            showPreDetail('source');
        } else if (stepIndex === 1) {
            window.OopSim.reset();
        } else if (stepIndex === 2) {
            window.JvmMem.reset();
        } else if (stepIndex === 3) {
            window.GcSim.reset();
        }

        log(`[System] Step ${stepIndex} 학습 모듈이 로드되었습니다.`, 'system');
    }

    function showPreDetail(key) {
        const detailBox = document.getElementById('pre-detail-box');
        if (!detailBox || !PRE_REQUISITE_DETAILS[key]) return;

        // Toggle active flowchart card class
        document.querySelectorAll('.flow-card, .jvm-box, .engine-card').forEach(el => {
            el.classList.remove('active');
        });

        const targetCard = document.getElementById(`flow-${key}`) || document.getElementById(`engine-${key}`);
        if (targetCard) {
            targetCard.classList.add('active');
        } else if (key === 'interpreter' || key === 'jit') {
            // Also keep outer JVM box active
            document.getElementById('flow-jvm').classList.add('active');
        }

        const data = PRE_REQUISITE_DETAILS[key];
        detailBox.innerHTML = `
            <h3>${data.title}</h3>
            <div>${data.content}</div>
        `;

        log(`[Step 0 Docs] Read detail of: ${key}`, 'info');
    }

    /* Core Log Panel Utility */
    function log(message, type = 'info') {
        if (!consoleLogs) return;

        const time = new Date().toLocaleTimeString();
        const logLine = document.createElement('div');
        logLine.className = `log-line ${type}`;
        
        let typePrefix = '';
        if (type === 'success') typePrefix = '✔️ ';
        else if (type === 'warning') typePrefix = '⚠️ ';
        else if (type === 'danger') typePrefix = '❌ ';
        else if (type === 'system') typePrefix = '⚙️ ';

        logLine.innerText = `[${time}] ${typePrefix}${message}`;
        consoleLogs.appendChild(logLine);

        // Keep scrolled to bottom
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }

    function clearLogs() {
        if (consoleLogs) {
            consoleLogs.innerHTML = `<div class="log-line system">[System] Logs cleared. Console ready.</div>`;
        }
    }

    function handleWindowResize() {
        // Forward resize event to respective active modules
        const activeNav = document.querySelector('.nav-btn.active');
        if (!activeNav) return;

        const step = parseInt(activeNav.getAttribute('data-step'));
        if (step === 1) {
            window.OopSim.handleResize();
        } else if (step === 3) {
            window.GcSim.handleResize();
        }
    }

    // Auto-bootstrap once DOM is ready (or run immediately if already loaded)
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
