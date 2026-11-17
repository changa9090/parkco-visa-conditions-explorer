/* Park & Co Lawyers · Australian Visa Conditions Explorer Engine (ES2022) */
(() => {
  "use strict";

  const state = {
    lang: "ko",
    mode: "code", // "code" | "visa" | "combo"
    search: "",
    intent: "all",
    riskFilter: "all",
    selectedCode: "8503",
    selectedVisa: "500",
    visaAudience: "all", // "all" | "primary" | "secondary"
    comboCodes: ["8105", "8202", "8501", "8533", "8534"],
    activeCompId: "no_further_stay",
    showDhaCompare: false,
    catalog: null,
    visasMatrix: null,
    polling: null,
    condMap: new Map(),
    visaMap: new Map(),
  };

  const CATEGORIES = [
    { id: "all", ko: "전체", en: "All" },
    { id: "work", ko: "근로·이직·고용주", en: "Work & Sponsor" },
    { id: "study", ko: "학업·전공 변경", en: "Study & Enrolment" },
    { id: "further_stay", ko: "국내 비자 추가신청 제한", en: "No Further Stay" },
    { id: "regional", ko: "지방 거주·근무", en: "Regional Area" },
    { id: "notify", ko: "주소·연락처·여권 신고", en: "Notifications" },
    { id: "health_welfare", ko: "의료보험·검진·복지", en: "Health & Welfare" },
    { id: "travel_entry", ko: "입국·출국·체류 상한", en: "Travel & Stay Caps" },
    { id: "compliance_character", ko: "자격유지·품행·전과", en: "Compliance & Character" },
    { id: "bvr_monitoring", ko: "BVR(070)·안보·모니터링", en: "BVR & Monitoring" },
  ];

  const POPULAR_CODES = ["8503", "8534", "8105", "8104", "8101", "8202", "8208", "8501", "8547", "8579", "8607", "8608", "8528", "8558", "8532", "8533"];

  const SHORT_CHIP_LABELS = {
    "8503": { ko: "국내 신청 전면금지", en: "No Further Stay" },
    "8534": { ko: "학생 485·590 예외", en: "No Stay (485/590)" },
    "8105": { ko: "학생 48시간", en: "Student 48h" },
    "8104": { ko: "동반가족 48시간", en: "Dependant 48h" },
    "8101": { ko: "근로 금지", en: "No Work" },
    "8202": { ko: "학업·AQF 유지", en: "Course & AQF" },
    "8208": { ko: "핵심기술 연구승인", en: "Critical Tech" },
    "8501": { ko: "건강보험 유지", en: "Health Insurance" },
    "8547": { ko: "고용주 6개월 제한", en: "6-Month Employer" },
    "8579": { ko: "지방 거주·근무", en: "Regional 491/494" },
    "8607": { ko: "482 직종·180일", en: "482 Mobility" },
    "8608": { ko: "494 지방스폰서", en: "494 Mobility" },
    "8528": { ko: "12개월+ 형사전과", en: "12m+ Convictions" },
    "8558": { ko: "18개월 중 12개월", en: "12 in 18 Months" },
    "8532": { ko: "만 18세 미만 복지", en: "Under-18 Welfare" },
    "8533": { ko: "7일 주소·CoE 신고", en: "7-Day Provider" },
  };

  const COMBO_PRESETS = [
    { id: "500_std", ko: "학생비자 (500 주신청자)", en: "Student 500 (Primary)", codes: ["8105", "8202", "8208", "8501", "8516", "8517", "8532", "8533"] },
    { id: "500_dep", ko: "학생비자 동반가족 (500)", en: "Student 500 (Dependant)", codes: ["8104", "8201", "8208", "8501", "8516"] },
    { id: "482_sid", ko: "스폰서 482 (SID)", en: "Sponsor 482 (SID)", codes: ["8607", "8501", "8303"] },
    { id: "417_whm", ko: "워킹홀리데이 (417)", en: "Working Holiday (417)", codes: ["8547", "8548"] },
    { id: "491_reg", ko: "지방기술 491", en: "Regional 491", codes: ["8578", "8579", "8580", "8581"] },
    { id: "600_nov28", ko: "관광 600 (11.28 이후)", en: "Visitor 600 (Post-28 Nov)", codes: ["8101", "8201", "8503", "8558"] },
  ];

  const GLOSSARY_TERMS = [
    {
      pattern: /\bwork\b/i,
      term: "work (reg 1.03)",
      ko: "reg 1.03 정의: 호주에서 통상 보수(remuneration)가 지급되는 성격의 활동을 뜻합니다. 당사자가 돈을 받지 않았더라도 일반 직원이 급여를 받고 할 일을 대신하면 'work'로 간주될 수 있습니다.",
      en: "reg 1.03 definition: 'work means an activity that, in Australia, normally attracts remuneration.' Even unpaid tasks that would normally be paid can count as work."
    },
    {
      pattern: /\bfortnight\b/i,
      term: "fortnight",
      ko: "8104·8105 법정 정의: 고용주 급여 주기가 아니라 매주 월요일(Monday)에 시작하는 연속 14일 기간입니다. 겹치는 연속 2주 조합 모두 48시간을 넘겨서는 안 됩니다.",
      en: "Statutory definition in 8104/8105: any period of 14 days commencing on a Monday. Overlapping rolling pairs must each stay within 48 hours."
    },
    {
      pattern: /\bsubstantive visa\b/i,
      term: "substantive visa",
      ko: "실질 비자(s 5): 브리징 비자(BVA~BVR), 형사사법 비자, 집행 비자를 제외한 모든 일반 비자(학생·취업·관광·영주권 등)를 말합니다.",
      en: "Migration Act s 5: any visa other than a bridging visa, criminal justice visa, or enforcement visa."
    },
    {
      pattern: /\bdesignated regional area\b/i,
      term: "designated regional area",
      ko: "지정 지방 지역: 시드니·멜버른·브리즈번 광역권을 제외한 호주 전역(퍼스·애들레이드·골드코스트·선샤인코스트·캔버라·호바트 등 포함). 적용 우편번호는 비자 승인일 또는 494 노미네이션 신청일 기준 고시가 적용됩니다.",
      en: "All of Australia except Sydney, Melbourne, and Brisbane metropolitan postcodes, assessed under the instrument in force at visa grant (491) or relevant nomination (494)."
    },
    {
      pattern: /\bworking days\b/i,
      term: "working days",
      ko: "영업일: 토·일요일 및 해당 주/호주 공휴일을 제외한 평일 근무일을 의미합니다(역일 calendar days와 다름).",
      en: "Excludes Saturdays, Sundays, and applicable public holidays (distinct from calendar days)."
    },
    {
      pattern: /\bmember of the family unit\b/i,
      term: "member of the family unit",
      ko: "가족 구성원(reg 1.12): 법적 배우자·사실혼 파트너 및 부양 자녀 등 동반가족 자격 범위를 뜻합니다.",
      en: "reg 1.12 definition: spouse, de facto partner, and eligible dependent children."
    }
  ];

  const I18N = {
    ko: {
      pageTitle: "호주 비자 컨디션(8101–8626) 원문·실무 해독기 | 강제·재량 구분 및 승인서 조합 진단 · 법무법인 박앤코",
      brandTitle: "박앤코 · 비자 컨디션 쉬운 해설",
      navWorkbench: "코드·비자 해독기",
      navCompare: "쌍둥이 비교",
      navDir: "118개 전수 백과",
      navDrift: "이민성 괴리 감사",
      navFaq: "이민 FAQ",
      sourceBadge: "법령 118개 검증",
      btnInquiry: "공식 문의 허브",
      urgentBadge: "2026.11.28 시행 개정 경보 (F2026L01503):",
      urgentText: "2026년 11월 28일 이후 접수되는 관광·상용(600)·ETA(601)·eVisitor(651) 비자에 Condition 8503(국내 추가 신청 금지)이 강제 부착됩니다. (NOICC 소명 5영업일 · ART 재심 28역일 불변)",
      urgentLink: "8503 상세·예외 보기 →",
      heroEyebrow: "MIGRATION REGULATIONS 1994 · SCHEDULE 8 (118 CLAUSES) & SCHEDULE 2 DIVISION .6",
      heroTitle: "호주 비자 컨디션(8101–8626) 법령 원문 · 박앤코의 쉬운 해설",
      heroSub: "비자 승인서(Grant Notice)나 VEVO의 8로 시작하는 네 자리 숫자 조건은 원문 표현이 까다롭고, 이민성 웹사이트조차 강제(must)와 재량(may) 구분이나 최신 개정 사항을 빠뜨리고 있습니다. 연방 법령 정본(F2026C01194 C291) 118개 전수 조항과 실무 해설을 1:1로 나란히 비교해 드립니다.",
      statSch8Lbl: "현행 Schedule 8 정본",
      statSch2Lbl: "Schedule 2 비자 매핑",
      statDriftLbl: "이민성 웹 괴리·누락 감지",
      statCompLbl: "법령 컴파일 기준",
      tabCode: "1. 4자리 코드·행동으로 찾기",
      tabVisa: "2. 비자별 강제 vs 재량 매트릭스",
      tabCombo: "3. 내 승인서(VEVO) 다중 번호 종합표",
      searchAria: "비자 컨디션 번호 또는 키워드 검색",
      searchPlaceholder: "4자리 코드나 궁금한 행동 입력 (예: 8503 · 8105 · 8607 · 48시간 · 이직 · 원격근무 · 방학 · 통금 · 주소)...",
      btnClear: "지우기",
      optAllStatus: "전체 (현행 118 + 구형 5)",
      optInForce: "현행 Schedule 8만 (118)",
      optCritical: "고위험·취소/신청차단 핵심 조건만",
      optDrift: "이민성 웹과 괴리·개정 주의 항목만",
      lblIntent: "행동·주제별 필터:",
      lblPopular: "자주 찾는 코드:",
      lblVisaSelect: "비자 서브클래스 선택 (Schedule 2 84종 · 010/020/050 브리징 포함)",
      lblAudience: "신청자 구분",
      audAll: "전체 보기",
      audPrimary: "주신청자",
      audSecondary: "동반가족",
      lblHotVisas: "주요 비자 바로 선택:",
      comboTitle: "내 비자 승인서 / VEVO 다중 컨디션 종합 해독기",
      comboSub: "승인 통지서에 적힌 4자리 번호를 쉼표로 입력하거나 아래 프리셋·칩을 눌러 선택하시면, 모든 조건을 하나로 합친 종합 허용·금지·신고기한 요약표를 만들어 드립니다.",
      btnCopyLink: "조합 링크 복사",
      btnPrint: "요약표 인쇄 / PDF",
      btnComboClear: "선택 비우기",
      comboPlaceholder: "예: 8105, 8202, 8501, 8533, 8534",
      btnApplyCodes: "번호 반영하기",
      lblPresets: "대표 비자 세트 불러오기:",
      compTitle: "헷갈리는 쌍둥이 컨디션 1:1 비교기",
      compSub: "이민성 목록에서 이름이 비슷하거나 같아 가장 자주 혼동되는 4대 조건군을 표로 한눈에 비교합니다. 번호를 클릭하면 상세 원문·해설 카드로 이동합니다.",
      dirTitle: "Schedule 8 비자 컨디션 전수 백과 (현행 118개 + 이민성 웹 잔존 5개)",
      dirCondFaqLink: "개별 코드 FAQ 백과 (123종) ↗",
      driftTitle: "호주 이민성 웹사이트 vs 현행 연방 법령(Schedule 2·8) 괴리 감사 결과",
      driftSub: "2026년 11월 17일 기준 호주 이민성 공식 비자 컨디션 페이지(app.vc.js / API)와 현행 Migration Regulations 1994 정본(F2026C01194 C291) 및 최신 개정령(F2026L01503)을 직접 대조해 확인한 차이점입니다.",
      handoffKicker: "PARK & CO LAWYERS · PRINCIPAL LAWYER TRIAGE",
      handoffTitle: "비자 컨디션 위반 우려 · NOICC 취소 예고 통지서 · 8503/8534 면제가 필요하신가요?",
      handoffDesc: "현재 조회하신 비자·컨디션 번호를 그대로 담아 박앤코 이민법 스페셜리스트 팀으로 바로 전달하거나, 긴급 기한 계산기(NOICC 5영업일 · ART 28역일)로 연결하실 수 있습니다.",
      ctaEmergency: "무료 비자응급실 통지서 진단 ↗",
      ctaCrisis: "NOICC · ART 기한 계산기 →",
      ctaConsult: "일반 이민법 상담 안내 ↗",
      footerTag: "법무법인 박앤코 (PNC Legal Pty Ltd t/a Park & Co Lawyers · ABN 48 618 463 324) · QLS Accredited Specialist in Immigration Law 박창민 대표변호사 감수",
      footerContact: "공식 문의: enquiry@parkcolawyers.com · 대표전화: 1800 825 275 · Underwood QLD (BNE · SYD · PER)",
      ftrHub: "박앤코 법률·비자 진단 허브",
      ftrFaq: "호주 이민법 대표 FAQ",
      ftrCondFaq: "비자 컨디션 8101–8626 개별 FAQ",
      ftrTracker: "이민법령 개정 트래커",
      ftrIntel: "1차 법령 SHA-256 레지스트리",
      footerDisclaimer: "면책 고지: 본 웹 도구는 Migration Regulations 1994 (Cth) 및 호주 이민성 공개 자료를 바탕으로 정리한 일반 법률 정보 제공용 안내 도구이며, 개별 사안에 대한 정식 법률 자문이나 변호사-의뢰인 수임 관계를 성립시키지 않습니다. 실제 귀하의 비자에 부과된 정확한 조건은 반드시 개인별 Visa Grant Notice 또는 VEVO 조회 결과를 최우선으로 확인하시고, 위반 의심이나 웨이버·재심 대응이 필요한 경우 정식 법률 상담을 받으시기 바랍니다.",
      srcModalTitle: "1차 법령 · API 스냅샷 무결성 검증 현황",
      balloonTitle: "법령 용어 해설",
    },
    en: {
      pageTitle: "Australian Visa Conditions (8101–8626) Statutory & Plain-Language Explorer | Park & Co Lawyers",
      brandTitle: "Park & Co · Visa Conditions",
      navWorkbench: "Explorer",
      navCompare: "Compare",
      navDir: "All 118",
      navDrift: "DHA Drift",
      navFaq: "Visa FAQ",
      sourceBadge: "118 Verified",
      btnInquiry: "Enquiry Hub",
      urgentBadge: "28 Nov 2026 Reform Alert (F2026L01503):",
      urgentText: "Applications lodged on or after 28 Nov 2026 for Visitor (600 Tourist & Business), ETA (601), and eVisitor (651) visas will carry MANDATORY Condition 8503 (No Further Stay). (NOICC 5 working days · ART 28 calendar days non-extendable)",
      urgentLink: "Inspect 8503 & Waivers →",
      heroEyebrow: "MIGRATION REGULATIONS 1994 · SCHEDULE 8 (118 CLAUSES) & SCHEDULE 2 DIVISION .6",
      heroTitle: "Australian Visa Conditions (8101–8626): Statutory Text & Plain-Language Explorer",
      heroSub: "Four-digit 8xxx conditions on visa grant letters are written in dense legislative drafting, while Home Affairs' public portal omits mandatory vs discretionary distinctions, hides bridging visas, and contains stale descriptions. Compare all 118 in-force Schedule 8 clauses side-by-side with plain practical guidance.",
      statSch8Lbl: "In-Force Schedule 8",
      statSch2Lbl: "Schedule 2 Visas Mapped",
      statDriftLbl: "DHA Web Drift Flagged",
      statCompLbl: "Legislation Compilation",
      tabCode: "1. Search by Code or Action",
      tabVisa: "2. Mandatory vs Discretionary by Visa",
      tabCombo: "3. Grant Letter / VEVO Combo Sheet",
      searchAria: "Search visa condition code or keyword",
      searchPlaceholder: "Enter 4-digit code or keyword (e.g. 8503, 8105, 8607, 48 hours, remote work, curfew, regional)...",
      btnClear: "Clear",
      optAllStatus: "All Entries (118 In-Force + 5 Legacy)",
      optInForce: "In-Force Schedule 8 Only (118)",
      optCritical: "Critical Cancellation / Bar Conditions",
      optDrift: "DHA Drift or Reform Flagged",
      lblIntent: "Filter by Topic:",
      lblPopular: "Most Searched:",
      lblVisaSelect: "Select Visa Subclass (84 Schedule 2 Divisions incl. Bridging 010/020/050)",
      lblAudience: "Applicant Role",
      audAll: "All",
      audPrimary: "Primary",
      audSecondary: "Secondary",
      lblHotVisas: "Quick Select Visa:",
      comboTitle: "My Visa Grant Letter / VEVO Multi-Condition Synthesizer",
      comboSub: "Paste or select all 4-digit conditions from your visa grant notice or VEVO to generate one combined Do's, Don'ts, and Notification Cheat Sheet.",
      btnCopyLink: "Copy Share Link",
      btnPrint: "Print / Save PDF",
      btnComboClear: "Reset Selection",
      comboPlaceholder: "e.g. 8105, 8202, 8501, 8533, 8534",
      btnApplyCodes: "Apply Codes",
      lblPresets: "Load Common Visa Presets:",
      compTitle: "Confusing Twin Conditions: 1:1 Comparator",
      compSub: "Compare commonly confused condition groups that share identical or overlapping titles on Home Affairs' site. Click any code badge to inspect its full statutory breakdown.",
      dirTitle: "Complete Schedule 8 Directory (118 In-Force + 5 Legacy DHA Entries)",
      dirCondFaqLink: "Individual Code FAQ Pages (123) ↗",
      driftTitle: "Home Affairs Website vs Primary Legislation (Schedule 2 & 8) Drift Audit",
      driftSub: "Live discrepancies verified on 17 Nov 2026 between immi.homeaffairs.gov.au (app.vc.js / SharePoint API) and Migration Regulations 1994 (F2026C01194 C291 + F2026L01503).",
      handoffKicker: "PARK & CO LAWYERS · PRINCIPAL LAWYER TRIAGE",
      handoffTitle: "Worried About a Condition Breach, NOICC Notice, or 8503/8534 Waiver?",
      handoffDesc: "Carry your selected visa and condition numbers directly into Park & Co's Visa Emergency triage or ART / NOICC statutory deadline calculator.",
      ctaEmergency: "Free Visa Emergency Triage ↗",
      ctaCrisis: "NOICC & ART Deadline Calculator →",
      ctaConsult: "Immigration Consultation Hub ↗",
      footerTag: "PNC Legal Pty Ltd t/a Park & Co Lawyers (ABN 48 618 463 324) · Supervised by Principal Chang Min Park, QLS Accredited Specialist in Immigration Law",
      footerContact: "Enquiries: enquiry@parkcolawyers.com · Freecall: 1800 825 275 · Underwood QLD (BNE · SYD · PER)",
      ftrHub: "Park & Co Diagnostics Hub",
      ftrFaq: "Immigration Law FAQ",
      ftrCondFaq: "Visa Conditions (8101–8626) FAQ Pages",
      ftrTracker: "Migration Law Tracker",
      ftrIntel: "SHA-256 Source Registry",
      footerDisclaimer: "Disclaimer: This tool provides general legal information based on the Migration Regulations 1994 (Cth) and public Home Affairs data; it does not constitute formal legal advice or create a solicitor-client relationship. Always verify the exact conditions attached to your personal Visa Grant Notice or VEVO record, and seek tailored legal advice for potential breaches, waivers, or reviews.",
      srcModalTitle: "Primary-Source FRL & DHA API Verification Status",
      balloonTitle: "Statutory Term Note",
    },
  };

  function esc(val) {
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function t(key) {
    return (I18N[state.lang] && I18N[state.lang][key]) || I18N.ko[key] || key;
  }

  function formatAudienceCtx(ctx, lang) {
    const [mod, rawTags] = ctx.split("|");
    const tags = (rawTags || "").split("+").filter(Boolean);
    const mapKo = {
      primary: "주신청자",
      secondary: "동반가족",
      offshore_grant: "해외승인 시",
      onshore: "국내신청",
      sponsored: "초청스트림",
      iran_citizen: "특정국적(이란)",
      dfat_defence: "정부·국방장학생",
      under_18: "만 18세 미만",
      over_18: "만 18세 이상",
      protection_applicant: "보호비자 연계",
      all_cases: "전원 적용",
      general: "해당 스트림/일반",
      F2026L01503: "2026.11.28 시행 개정"
    };
    const mapEn = {
      primary: "Primary",
      secondary: "Secondary",
      offshore_grant: "Offshore grant",
      onshore: "Onshore",
      sponsored: "Sponsored stream",
      iran_citizen: "Specified nationality (Iran)",
      dfat_defence: "DFAT/Defence student",
      under_18: "Under 18",
      over_18: "18 or older",
      protection_applicant: "Protection applicant",
      all_cases: "All cases",
      general: "General / stream",
      F2026L01503: "From 28 Nov 2026"
    };
    const dict = lang === "en" ? mapEn : mapKo;
    const modLbl = mod.startsWith("mandatory")
      ? (lang === "en" ? "Mandatory" : "강제")
      : (lang === "en" ? "Discretionary" : "재량");
    const tagLabels = tags.map((tg) => dict[tg] || tg).join(" · ");
    return `${modLbl} (${tagLabels})`;
  }

  function annotateStatutoryLine(line) {
    const escaped = esc(line);
    const combined = new RegExp(
      GLOSSARY_TERMS.map((g, i) => `(?<g${i}>${g.pattern.source})`).join("|"),
      "gi"
    );
    return escaped.replace(combined, (...args) => {
      const groups = args[args.length - 1];
      for (let i = 0; i < GLOSSARY_TERMS.length; i++) {
        if (groups && groups[`g${i}`] !== undefined) {
          return `<button type="button" class="vce-term-btn" data-glossary-idx="${i}">${groups[`g${i}`]}</button>`;
        }
      }
      return args[0];
    });
  }

  function updateLanguageChrome() {
    document.documentElement.lang = state.lang;
    document.body.dataset.uiLang = state.lang;
    document.title = t("pageTitle");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      if (I18N[state.lang][k]) {
        el.textContent = I18N[state.lang][k];
      }
    });

    document.querySelectorAll("[data-ko-href]").forEach((el) => {
      const href = el.getAttribute(state.lang === "en" ? "data-en-href" : "data-ko-href");
      if (href) el.setAttribute("href", href);
    });

    const searchIn = document.getElementById("cond-search-input");
    if (searchIn) searchIn.placeholder = t("searchPlaceholder");
    const comboIn = document.getElementById("combo-raw-input");
    if (comboIn) comboIn.placeholder = t("comboPlaceholder");

    document.getElementById("lang-btn-ko").classList.toggle("active", state.lang === "ko");
    document.getElementById("lang-btn-en").classList.toggle("active", state.lang === "en");

    if (state.catalog) {
      const drEl = document.getElementById("stat-drift-count");
      if (drEl) {
        drEl.textContent = state.lang === "en"
          ? "8104 · 8534 · 8620 · 8621 + F2026L01503"
          : "8104 · 8534 · 8620 · 8621 + 11.28 개정";
      }
      const stEl = document.getElementById("stat-compilation");
      if (stEl) {
        stEl.textContent = state.lang === "en"
          ? "F2026C01194 (3 Nov 2026) + F2026L01503"
          : "F2026C01194 (2026-11-03) + F2026L01503";
      }
    }
  }

  function renderIntentAndPopularChips() {
    const intentWrap = document.getElementById("intent-chips");
    if (intentWrap) {
      intentWrap.innerHTML = CATEGORIES.map((c) => {
        const cnt = c.id === "all"
          ? state.catalog.conditions.length
          : state.catalog.conditions.filter((x) => x.category === c.id).length;
        const label = state.lang === "en" ? c.en : c.ko;
        return `<button type="button" class="vce-chip ${state.intent === c.id ? "active" : ""}" data-intent="${esc(c.id)}">${esc(label)} (${cnt})</button>`;
      }).join("");
    }

    const popWrap = document.getElementById("popular-code-chips");
    if (popWrap) {
      popWrap.innerHTML = POPULAR_CODES.map((code) => {
        const isWarn = code === "8503" || code === "8104" || code === "8534";
        const active = state.selectedCode === code;
        const lbl = SHORT_CHIP_LABELS[code]
          ? (state.lang === "en" ? SHORT_CHIP_LABELS[code].en : SHORT_CHIP_LABELS[code].ko)
          : code;
        return `<button type="button" class="vce-chip vce-chip--code ${isWarn ? "vce-chip--warn" : ""} ${active ? "active" : ""}" data-pick-code="${esc(code)}">${esc(code)} · ${esc(lbl)}</button>`;
      }).join("");
    }
  }

  function filteredConditions() {
    const q = state.search.trim().toLowerCase();
    return state.catalog.conditions.filter((c) => {
      if (state.intent !== "all" && c.category !== state.intent) return false;
      if (state.riskFilter === "in_force" && c.status !== "in_force_schedule8") return false;
      if (state.riskFilter === "critical" && c.risk_tier !== "critical") return false;
      if (state.riskFilter === "drift" && !c.drift_ko && c.status === "in_force_schedule8" && c.dha_present) return false;
      if (!q) return true;
      const hay = [
        c.code,
        c.title_ko,
        c.title_en,
        c.summary_ko,
        c.summary_en,
        c.statutory_text || "",
        c.waiver_ko || "",
        c.waiver_en || "",
        ...(c.forbidden_ko || []),
        ...(c.forbidden_en || []),
        ...(c.visas_schedule2 || []).map((v) => v.subclass),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  function renderDirectory() {
    const items = filteredConditions();
    const grid = document.getElementById("directory-grid");
    const countLbl = document.getElementById("dir-count-label");
    if (countLbl) {
      countLbl.textContent = state.lang === "en"
        ? `Showing ${items.length} of ${state.catalog.conditions.length} entries (118 in-force Schedule 8 clauses + 5 legacy DHA web-only codes).`
        : `전체 ${state.catalog.conditions.length}건 중 ${items.length}건 표시 중 (현행 Schedule 8 118개 전수 + 이민성 웹 잔존 구형 5개).`;
    }
    if (!grid) return;

    if (!items.length) {
      grid.innerHTML = `<div class="pk-empty-prompt">${esc(state.lang === "en" ? "No conditions matched your search filter." : "검색 조건에 일치하는 비자 컨디션이 없습니다. 검색어나 필터를 초기화해 주십시오.")}</div>`;
      return;
    }

    grid.innerHTML = items.map((c) => {
      const title = state.lang === "en" ? c.title_en : c.title_ko;
      const sum = state.lang === "en" ? c.summary_en : c.summary_ko;
      const isSelected = state.selectedCode === c.code;
      const riskLabel = c.status === "legacy_dha_only"
        ? (state.lang === "en" ? "DHA Legacy" : "웹 잔존")
        : (c.risk_tier === "critical"
          ? (state.lang === "en" ? "Critical" : "핵심/고위험")
          : (c.risk_tier === "high" ? (state.lang === "en" ? "High" : "주의") : (state.lang === "en" ? "Standard" : "표준")));
      const riskCls = c.status === "legacy_dha_only" ? "vce-badge--legacy" : `vce-badge--${c.risk_tier}`;
      const visaCnt = (c.visas_schedule2 || []).length;
      const footLeft = visaCnt > 0
        ? (state.lang === "en" ? `Schedule 2: ${visaCnt} visas` : `Schedule 2: ${visaCnt}개 비자`)
        : (state.lang === "en" ? "Schedule 8 Statutory" : "Schedule 8 법정 조항");
      const driftTag = (c.drift_ko || !c.dha_present)
        ? `<span class="vce-badge vce-badge--critical">${esc(state.lang === "en" ? "Drift" : "공시차이")}</span>`
        : "";
      return `
        <button type="button" class="vce-dir-card ${isSelected ? "selected" : ""}" data-select-code="${esc(c.code)}">
          <div>
            <div class="vce-dir-card-top">
              <span class="vce-badge vce-badge--code">${esc(c.code)}</span>
              <div style="display:flex;gap:4px;align-items:center;">
                ${driftTag}
                <span class="vce-badge ${riskCls}">${esc(riskLabel)}</span>
              </div>
            </div>
            <h3 class="vce-dir-card-title">${esc(title)}</h3>
            <p class="vce-dir-card-sum">${esc(sum)}</p>
          </div>
          <div class="vce-dir-card-foot">
            <span>${esc(footLeft)}</span>
            <span>${esc(state.lang === "en" ? "Law vs Plain View →" : "원문·해설 보기 →")}</span>
          </div>
        </button>
      `;
    }).join("");
  }

  function renderDetailCard() {
    const panel = document.getElementById("condition-detail-panel");
    if (!panel) return;
    const c = state.condMap.get(state.selectedCode) || state.catalog.conditions[0];
    if (!c) return;

    const isEn = state.lang === "en";
    const title = isEn ? c.title_en : c.title_ko;
    const summary = isEn ? c.summary_en : c.summary_ko;
    const forbidden = isEn ? c.forbidden_en : c.forbidden_ko;
    const obligations = isEn ? c.obligations_en : c.obligations_ko;
    const exceptions = isEn ? c.exceptions_en : c.exceptions_ko;
    const waiver = isEn ? c.waiver_en : c.waiver_ko;
    const drift = isEn ? c.drift_en : c.drift_ko;
    const notes = isEn ? c.clause_notes_en : c.clause_notes_ko;
    const catObj = CATEGORIES.find((x) => x.id === c.category);
    const catLabel = catObj ? (isEn ? catObj.en : catObj.ko) : c.category;

    const inCombo = state.comboCodes.includes(c.code);
    const riskText = c.status === "legacy_dha_only"
      ? (isEn ? "Legacy DHA List Only (Omitted From Schedule 8)" : "이민성 웹 잔존 번호 (현행 Schedule 8 미수록)")
      : (c.risk_tier === "critical"
        ? (isEn ? "Critical Risk (s 116 / Bar)" : "핵심 고위험 (취소·신청차단)")
        : (c.risk_tier === "high" ? (isEn ? "High Compliance Risk" : "주의 의무 조건") : (isEn ? "Standard Condition" : "표준 준수 조건")));

    const parasHtml = (c.statutory_paragraphs && c.statutory_paragraphs.length)
      ? c.statutory_paragraphs.map((p) => {
          const isSub = /^\([a-z0-9]+\)/i.test(p.trim());
          return `<p class="vce-law-para ${isSub ? "vce-law-para--sub" : ""}">${annotateStatutoryLine(p)}</p>`;
        }).join("")
      : `<p class="vce-law-para">${esc(isEn ? "This code does not appear in current Schedule 8 of Migration Regulations 1994 (F2026C01194)." : "이 번호는 현행 Migration Regulations 1994 Schedule 8(F2026C01194)에는 수록되어 있지 않습니다.")}</p>`;

    const notesHtml = (notes && notes.length)
      ? notes.map((n) => `<div class="vce-clause-note"><strong>${esc(n.ref)}</strong>${esc(n.text)}</div>`).join("")
      : `<div class="vce-clause-note"><strong>${esc(isEn ? "Plain-Language Meaning" : "핵심 실무 해설")}</strong>${esc(summary)}</div>`;

    const driftBox = drift
      ? `<div class="vce-alert-box vce-alert-box--burgundy"><strong>${esc(isEn ? "Regulatory / DHA Drift Alert: " : "법령·이민성 공시 차이 주의: ")}</strong>${esc(drift)}</div>`
      : "";

    const dhaCompareHtml = c.dha_web_summary
      ? `
        <details class="pk-disclosure" ${state.showDhaCompare ? "open" : ""}>
          <summary>${esc(isEn ? "Compare With Home Affairs Website Text (" + (c.dha_web_title || c.code) + ")" : "호주 이민성 웹사이트 안내 원문과 비교하기 (" + (c.dha_web_title || c.code) + ")")}</summary>
          <div class="pk-disclosure__body">
            <p style="margin:0 0 8px;font-size:13px;color:var(--pk-muted);"><strong>${esc(isEn ? "Home Affairs Web Summary:" : "이민성 웹 Description:")}</strong></p>
            <div style="font-size:13.5px;white-space:pre-line;color:var(--pk-ink-2);background:#FCFBF8;padding:10px 12px;border-radius:8px;border:1px solid var(--pk-line);">${esc(c.dha_web_summary)}</div>
            ${c.dha_web_scenario ? `<p style="margin:10px 0 4px;font-size:13px;color:var(--pk-muted);"><strong>${esc(isEn ? "Home Affairs Additional Scenario Box:" : "이민성 웹 Scenario 안내:")}</strong></p><div style="font-size:13.5px;white-space:pre-line;color:var(--pk-ink-2);background:#FCFBF8;padding:10px 12px;border-radius:8px;border:1px solid var(--pk-line);">${esc(c.dha_web_scenario)}</div>` : ""}
          </div>
        </details>
      `
      : "";

    const visasRowHtml = (c.visas_schedule2 && c.visas_schedule2.length)
      ? `
        <div style="margin-top:12px;">
          <strong style="font-size:13px;color:var(--pk-ink-2);">${esc(isEn ? "Applied Under Schedule 2 (Click to inspect Mandatory vs Discretionary):" : "Schedule 2 적용 비자 현황 (클릭하면 해당 비자의 강제·재량 목록으로 이동):")}</strong>
          <div class="vce-visa-tag-row">
            ${c.visas_schedule2.map((v) => {
              const isMand = v.modalities.some((m) => m.startsWith("mandatory"));
              const cls = isMand ? "vce-visa-pill--mand" : "vce-visa-pill--disc";
              const tag = isMand ? (isEn ? "Mandatory" : "강제") : (isEn ? "Discretionary" : "재량");
              return `<button type="button" class="vce-visa-pill ${cls}" data-jump-visa="${esc(v.subclass)}">Subclass ${esc(v.subclass)} · ${esc(tag)}</button>`;
            }).join("")}
          </div>
        </div>
      `
      : "";

    const scenariosHtml = (c.scenarios && c.scenarios.length)
      ? `
        <div style="margin-top:14px;">
          <strong style="font-size:14px;color:var(--pk-ink);">${esc(isEn ? "Practical Boundary Q&A (Is This a Breach?)" : "이것도 위반인가요? 실무 경계선 Q&A")}</strong>
          <div class="vce-scenario-list">
            ${c.scenarios.map((s) => `
              <div class="vce-scenario-item">
                <div class="vce-scenario-q">Q. ${esc(isEn ? s.q_en : s.q_ko)}</div>
                <div class="vce-scenario-a">A. ${esc(isEn ? s.a_en : s.a_ko)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `
      : "";

    const extraLinks = [];
    const condFaqUrl = isEn
      ? `https://faq.immispecialist.com/conditions/${encodeURIComponent(c.code)}?lang=en`
      : `https://faq.immispecialist.com/conditions/${encodeURIComponent(c.code)}`;
    if (c.cross_tool) {
      extraLinks.push(`<a class="pk-btn-cta" href="${esc(isEn ? c.cross_tool.url_en : c.cross_tool.url_ko)}" target="_blank" rel="noopener">${esc(isEn ? c.cross_tool.label_en : c.cross_tool.label_ko)}</a>`);
      extraLinks.push(`<a class="pk-btn-ghost" href="${esc(condFaqUrl)}" target="_blank" rel="noopener">${esc(isEn ? `Condition ${c.code} Dedicated Guide (FAQ) ↗` : `Condition ${c.code} 개별 해설 페이지 ↗`)}</a>`);
    } else {
      extraLinks.push(`<a class="pk-btn-cta" href="${esc(condFaqUrl)}" target="_blank" rel="noopener">${esc(isEn ? `Condition ${c.code} Dedicated Guide (FAQ) ↗` : `Condition ${c.code} 개별 해설 페이지 ↗`)}</a>`);
    }
    (c.faq_links || []).forEach((fl) => {
      const u = isEn ? `${fl.url}?lang=en` : fl.url;
      extraLinks.push(`<a class="pk-btn-ghost" href="${esc(u)}" target="_blank" rel="noopener">${esc(isEn ? fl.label_en : fl.label_ko)} ↗</a>`);
    });

    panel.innerHTML = `
      <article class="vce-detail-card">
        <div class="vce-detail-header">
          <div>
            <div class="vce-detail-badges">
              <span class="vce-badge vce-badge--code">Condition ${esc(c.code)}</span>
              <span class="vce-badge vce-badge--cat">${esc(catLabel)}</span>
              <span class="vce-badge ${c.status === "legacy_dha_only" ? "vce-badge--legacy" : "vce-badge--" + c.risk_tier}">${esc(riskText)}</span>
            </div>
            <h2 class="vce-detail-title">${esc(title)}</h2>
            <p class="vce-detail-summary">${esc(summary)}</p>
          </div>
          <div class="vce-detail-tools">
            <button type="button" class="pk-btn-ghost" id="btn-toggle-combo" data-toggle-combo="${esc(c.code)}">
              ${esc(inCombo ? (isEn ? "✓ Added to Combo Sheet" : "✓ 내 조합표에 담김") : (isEn ? "+ Add to My Combo Sheet" : "+ 내 비자 조합표에 담기"))}
            </button>
            <button type="button" class="pk-btn-ghost" id="btn-copy-cond-link" data-copy-cond="${esc(c.code)}">
              ${esc(isEn ? "Copy Link" : "코드 링크 복사")}
            </button>
          </div>
        </div>

        ${driftBox}

        <div class="vce-traffic-grid">
          <div class="vce-traffic-box vce-traffic-box--forbid">
            <h3>${esc(isEn ? "Prohibited / Restricted" : "금지 · 제한 사항")}</h3>
            <ul>${(forbidden.length ? forbidden : [isEn ? "See statutory obligation below." : "하단 의무 사항 미이행 시 위반이 됩니다."]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          </div>
          <div class="vce-traffic-box vce-traffic-box--oblig">
            <h3>${esc(isEn ? "Required Duties & Deadlines" : "필수 의무 · 준수 기한")}</h3>
            <ul>${(obligations.length ? obligations : [summary]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          </div>
          <div class="vce-traffic-box vce-traffic-box--excep">
            <h3>${esc(isEn ? "Exceptions & Carve-outs" : "예외 · 허용 범위")}</h3>
            <ul>${(exceptions.length ? exceptions : [isEn ? "No general carve-out stated in text." : "조문 내 일반 예외 문구가 없습니다."]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          </div>
        </div>

        <div class="vce-split-panes">
          <div class="vce-pane">
            <div class="vce-pane-head">
              <h3>${esc(isEn ? "Statutory Text (Migration Regulations 1994, Schedule 8)" : "연방 법령 원문 (Schedule 8 정본 · 점선 용어 클릭)")}</h3>
              ${c.statutory_sha256 ? `<span class="vce-hash-chip" title="SHA-256 of statutory clause">SHA256: ${esc(c.statutory_sha256.slice(0, 10))}</span>` : ""}
            </div>
            <div>${parasHtml}</div>
          </div>
          <div class="vce-pane vce-pane--plain">
            <div class="vce-pane-head">
              <h3>${esc(isEn ? "Park & Co Plain-Language Breakdown" : "박앤코의 쉬운 해설 (그래서 도대체 무슨 뜻인가요?)")}</h3>
            </div>
            <div>${notesHtml}</div>
          </div>
        </div>

        <div class="vce-waiver-box">
          <strong>${esc(isEn ? "Waiver, Permission & Breach Impact: " : "면제(Waiver) · 허가 · 위반 시 법적 결과: ")}</strong>${esc(waiver)}
        </div>

        ${dhaCompareHtml}
        ${visasRowHtml}
        ${scenariosHtml}

        <div class="vce-detail-cta-bar">
          <div class="vce-detail-links">${extraLinks.join("")}</div>
          <div class="vce-detail-links">
            <a class="pk-btn-ghost" href="https://parklawyers.com.au/case-emergency/visa/?lang=${esc(state.lang)}" target="_blank" rel="noopener">${esc(isEn ? "Notice / Breach Triage ↗" : "위반·NOICC 무료 진단 ↗")}</a>
            <a class="pk-btn-ghost" href="https://changa9090.github.io/parkco-visa-crisis-navigator/?lang=${esc(state.lang)}" target="_blank" rel="noopener">${esc(isEn ? "NOICC 5-Day / ART 28-Day Calc →" : "소명 5일 · 재심 28일 계산 →")}</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderVisaMode() {
    const sel = document.getElementById("visa-select");
    const hotWrap = document.getElementById("popular-visa-chips");
    const out = document.getElementById("visa-matrix-output");
    if (!sel || !out || !state.visasMatrix) return;

    const isEn = state.lang === "en";
    if (!sel.options.length || sel.dataset.lang !== state.lang) {
      sel.dataset.lang = state.lang;
      const popularVisas = state.visasMatrix.visas.filter((v) => v.popular);
      const otherVisas = state.visasMatrix.visas.filter((v) => !v.popular);
      const optHtml = (v) => `<option value="${esc(v.subclass)}">${esc(isEn ? v.name_en : v.name_ko)} (${v.all_codes.length})</option>`;
      sel.innerHTML = `
        <optgroup label="${esc(isEn ? "Popular Visas" : "주요 비자 (자주 조회)")}">
          ${popularVisas.map(optHtml).join("")}
        </optgroup>
        <optgroup label="${esc(isEn ? "All Schedule 2 Subclasses (010–995)" : "전체 Schedule 2 비자 (010–995)")}">
          ${otherVisas.map(optHtml).join("")}
        </optgroup>
      `;
    }
    sel.value = state.selectedVisa;

    if (hotWrap) {
      const quickVisas = ["500", "482", "485", "417", "600", "601", "491", "494", "870", "010", "050", "820"];
      hotWrap.innerHTML = quickVisas.map((sc) => {
        const active = state.selectedVisa === sc;
        const isHotReform = sc === "600" || sc === "601";
        return `<button type="button" class="vce-chip ${isHotReform ? "vce-chip--warn" : ""} ${active ? "active" : ""}" data-pick-visa="${esc(sc)}">${esc(sc)}</button>`;
      }).join("");
    }

    document.querySelectorAll(".vce-seg-btn").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-aud") === state.visaAudience);
    });

    const v = state.visaMap.get(state.selectedVisa) || state.visasMatrix.visas[0];
    if (!v) return;

    const filterByAudience = (arr) => {
      if (state.visaAudience === "all") return arr;
      return arr.filter((item) => item.contexts.some((ctx) => {
        const hasPrim = ctx.includes("primary");
        const hasSec = ctx.includes("secondary");
        if (!hasPrim && !hasSec) return true; // general applies to all
        return state.visaAudience === "primary" ? hasPrim : hasSec;
      }));
    };

    const mand = filterByAudience(v.mandatory);
    const disc = filterByAudience(v.discretionary);

    let alerts = "";
    if (v.reform_note_ko) {
      alerts += `<div class="vce-alert-box vce-alert-box--burgundy">${esc(isEn ? v.reform_note_en : v.reform_note_ko)}</div>`;
    }
    if (v.dha_dropdown_hidden) {
      alerts += `<div class="vce-alert-box vce-alert-box--warn">${esc(isEn
        ? `Home Affairs Dropdown Alert: Subclass ${v.subclass} is marked '~False' in Home Affairs' online dropdown (hiding conditions behind a generic VEVO notice), even though Schedule 2 Division ${v.subclass}.6 actively prescribes conditions (often inherited from your previous visa).`
        : `이민성 웹사이트 비표시 주의: Subclass ${v.subclass} 브리징 비자는 이민성 공식 드롭다운에서 숨김(~False) 처리되어 조건이 보이지 않지만, 실제 법령 Schedule 2 Division ${v.subclass}.6에는 아래와 같이 직전 비자 승계 또는 개별 부과 조건이 명시되어 있습니다.`)}</div>`;
    }
    if (v.is_nil_only) {
      alerts += `<div class="vce-alert-box vce-alert-box--info">${esc(isEn
        ? `Subclass ${v.subclass} specifies 'Nil' conditions in Schedule 2 Division ${v.subclass}.6 (generally unconditional once granted, though verify your individual grant notice for any special circumstances).`
        : `Subclass ${v.subclass} 비자는 Schedule 2 Division ${v.subclass}.6 법령상 별도 컨디션이 'Nil(없음)'으로 규정되어 있습니다.`)}</div>`;
    }

    const renderCondList = (arr) => {
      if (!arr.length) {
        return `<p style="margin:0;font-size:13px;color:var(--pk-muted);">${esc(isEn ? "None specified under this category." : "해당 구분에 해당하는 법정 조건이 없습니다.")}</p>`;
      }
      return `<div class="vce-cond-pill-list">` + arr.map((item) => {
        const c = state.condMap.get(item.code);
        const cTitle = c ? (isEn ? c.title_en : c.title_ko) : `Condition ${item.code}`;
        const ctxStr = item.contexts.map((cx) => formatAudienceCtx(cx, state.lang)).join(" / ");
        const isSel = state.selectedCode === item.code;
        return `
          <button type="button" class="vce-cond-mini-btn ${isSel ? "selected" : ""}" data-select-code="${esc(item.code)}">
            <span class="vce-cond-mini-code">${esc(item.code)}</span>
            <span class="vce-cond-mini-main">
              <span class="vce-cond-mini-title">${esc(cTitle)}</span>
              <span class="vce-cond-mini-ctx">${esc(ctxStr)}</span>
            </span>
          </button>
        `;
      }).join("") + `</div>`;
    };

    out.innerHTML = `
      ${alerts}
      <div class="vce-matrix-split">
        <div class="vce-matrix-col vce-matrix-col--mand">
          <h3><span>${esc(isEn ? "Mandatory / Conditional Mandatory (must)" : "강제 부착 · 조건부 강제 (must be imposed)")}</span><span>${mand.length}</span></h3>
          ${renderCondList(mand)}
        </div>
        <div class="vce-matrix-col vce-matrix-col--disc">
          <h3><span>${esc(isEn ? "Discretionary Power (may be imposed)" : "심사관 재량 부착 가능 (may be imposed)")}</span><span>${disc.length}</span></h3>
          ${renderCondList(disc)}
        </div>
      </div>
      <details class="pk-disclosure" style="margin-top:14px;">
        <summary>${esc(isEn ? `View Verbatim Schedule 2 Division ${v.subclass}.6 Statutory Text` : `법령 원문: Schedule 2 Division ${v.subclass}.6 부과 근거 조문 보기`)}</summary>
        <div class="pk-disclosure__body" style="font-size:13px;white-space:pre-line;color:var(--pk-ink-2);">${esc(v.statutory_div6_text)}</div>
      </details>
    `;
  }

  function renderComboMode() {
    const presetWrap = document.getElementById("combo-preset-chips");
    const selBar = document.getElementById("combo-selected-bar");
    const out = document.getElementById("combo-synthesis-output");
    if (!presetWrap || !selBar || !out) return;

    const isEn = state.lang === "en";
    presetWrap.innerHTML = COMBO_PRESETS.map((p) =>
      `<button type="button" class="vce-chip" data-combo-preset="${esc(p.id)}">${esc(isEn ? p.en : p.ko)}</button>`
    ).join("");

    if (!state.comboCodes.length) {
      selBar.innerHTML = `<span style="font-size:13px;color:var(--pk-muted);">${esc(isEn ? "No conditions selected yet. Enter 4-digit codes or pick a preset above." : "아직 선택된 번호가 없습니다. 번호를 입력하거나 위 대표 비자 세트를 불러오십시오.")}</span>`;
      out.innerHTML = "";
      return;
    }

    selBar.innerHTML = state.comboCodes.map((code) => `
      <span class="vce-sel-tag">
        <span data-select-code="${esc(code)}" style="cursor:pointer;">${esc(code)}</span>
        <button type="button" data-remove-combo="${esc(code)}" aria-label="Remove ${esc(code)}">&times;</button>
      </span>
    `).join("");

    const forbids = [];
    const obligs = [];
    const exceps = [];
    const unknown = [];

    state.comboCodes.forEach((code) => {
      const c = state.condMap.get(code);
      if (!c) {
        unknown.push(code);
        return;
      }
      const fArr = isEn ? c.forbidden_en : c.forbidden_ko;
      const oArr = isEn ? c.obligations_en : c.obligations_ko;
      const eArr = isEn ? c.exceptions_en : c.exceptions_ko;
      fArr.forEach((item) => forbids.push({ code, item }));
      (oArr.length ? oArr : [isEn ? c.summary_en : c.summary_ko]).forEach((item) => obligs.push({ code, item }));
      eArr.forEach((item) => exceps.push({ code, item }));
    });

    out.innerHTML = `
      ${unknown.length ? `<div class="vce-alert-box vce-alert-box--warn">${esc(isEn ? "Unknown codes ignored: " : "Schedule 8에서 확인되지 않은 번호: ")}${esc(unknown.join(", "))}</div>` : ""}
      <div class="vce-combo-grid">
        <div class="vce-combo-bucket vce-combo-bucket--forbid">
          <h3>${esc(isEn ? `Combined Prohibited Actions (${forbids.length})` : `절대 금지 · 제한 사항 종합 (${forbids.length})`)}</h3>
          <ul>${forbids.map((x) => `<li><strong>[${esc(x.code)}]</strong> ${esc(x.item)}</li>`).join("")}</ul>
        </div>
        <div class="vce-combo-bucket vce-combo-bucket--oblig">
          <h3>${esc(isEn ? `Mandatory Duties & Deadlines (${obligs.length})` : `반드시 지켜야 할 의무 · 기한 (${obligs.length})`)}</h3>
          <ul>${obligs.map((x) => `<li><strong>[${esc(x.code)}]</strong> ${esc(x.item)}</li>`).join("")}</ul>
        </div>
        <div class="vce-combo-bucket vce-combo-bucket--excep">
          <h3>${esc(isEn ? `Exceptions & Possible Waivers (${exceps.length})` : `예외 · 허용 · 면제 단서 (${exceps.length})`)}</h3>
          <ul>${(exceps.length ? exceps : [{ code: "-", item: isEn ? "No statutory carve-out across selected conditions." : "선택하신 조합에는 별도 일반 예외가 없습니다." }]).map((x) => `<li><strong>[${esc(x.code)}]</strong> ${esc(x.item)}</li>`).join("")}</ul>
        </div>
      </div>
    `;
  }

  function renderComparator() {
    const tabsWrap = document.getElementById("comp-tabs");
    const tableWrap = document.getElementById("comp-table-wrap");
    if (!tabsWrap || !tableWrap || !state.catalog) return;

    const isEn = state.lang === "en";
    const groups = state.catalog.confusion_groups;
    tabsWrap.innerHTML = groups.map((g) =>
      `<button type="button" class="vce-comp-tab ${state.activeCompId === g.id ? "active" : ""}" data-comp-id="${esc(g.id)}">${esc(isEn ? g.title_en : g.title_ko)}</button>`
    ).join("");

    const active = groups.find((g) => g.id === state.activeCompId) || groups[0];
    tableWrap.innerHTML = `
      <p style="margin:0 0 12px;font-size:14px;color:var(--pk-ink-2);">${esc(isEn ? active.desc_en : active.desc_ko)}</p>
      <div class="pk-table-scroll">
        <table class="vce-comp-table">
          <thead>
            <tr>
              <th>${esc(isEn ? "Dimension" : "비교 기준")}</th>
              ${active.columns.map((c) => `<th><button type="button" class="vce-comp-code-link" data-select-code="${esc(c)}">${esc(c)}</button></th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${active.rows.map((r) => {
              const vals = isEn ? r.vals_en : r.vals_ko;
              return `
                <tr>
                  <td><strong>${esc(isEn ? r.label_en : r.label_ko)}</strong></td>
                  ${active.columns.map((c) => `<td>${esc(vals[c] || "-")}</td>`).join("")}
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderDriftAudit() {
    const grid = document.getElementById("drift-audit-grid");
    if (!grid) return;
    const isEn = state.lang === "en";
    const cards = [
      {
        title: isEn ? "1. Visitor 600/601/651 Mandatory 8503 (28 Nov 2026)" : "1. 관광(600)·ETA(601)·eVisitor(651) 8503 강제화 (2026.11.28 시행)",
        body: isEn
          ? "F2026L01503 makes Condition 8503 mandatory for Visitor (Tourist & Business), ETA (601), and eVisitor (651) applications lodged on or after 28 Nov 2026. Home Affairs' interactive dropdown has not yet reflected this reform."
          : "F2026L01503 개정령에 따라 2026.11.28 이후 접수되는 600(관광·상용)·601(ETA)·651(eVisitor) 비자에 8503(국내 추가 신청 금지)이 강제 부착됩니다. 이민성 웹 도구에는 아직 반영되지 않았습니다."
      },
      {
        title: isEn ? "2. Condition 8104 Contradiction (40 hrs vs 48 hrs)" : "2. Condition 8104 이민성 안내 자체 모순 (40시간 vs 48시간)",
        body: isEn
          ? "Home Affairs' live 8104 page states 'cannot work more than 40 hours a fortnight' in paragraph 1 while stating '48 hours' below. Schedule 8 cl 8104(3A) substitutes 48 hours for Subclass 500 and linked bridging visas."
          : "이민성 8104 라이브 페이지 첫 줄은 '40시간', 아래 불릿은 '48시간'으로 서로 충돌합니다. 현행 법령 8104(3A)에 따라 Subclass 500 및 연계 브리징에는 48시간이 적용됩니다."
      },
      {
        title: isEn ? "3. Condition 8534 Repealed Visa References (132 / 187 / 188)" : "3. Condition 8534 안내 내 폐지 비자(132·187·188) 및 구 명칭 잔존",
        body: isEn
          ? "Home Affairs' 8534 Scenario text still lists repealed Subclasses 132, 187, and 188 plus 'TSS 482' and paper Form 1409. Current reg 2.05(5A) covers Subclass 482 (Skills in Demand), 191, and 494."
          : "이민성 8534 Scenario에는 이미 폐지된 132·187·188과 구 명칭 TSS 482, 종이 서식 Form 1409 안내가 남아 있습니다. 현행 reg 2.05(5A)는 482(SID)·191·494 등을 명시합니다."
      },
      {
        title: isEn ? "4. Bridging Visas Hidden (~False) + Missing 8620/8621" : "4. 브리징 비자(010·020·050) 숨김 처리 및 8620·8621 누락",
        body: isEn
          ? "Home Affairs' dropdown disables Bridging A–F via '~False' even though its backend maps 17+ conditions to 010 and 20+ to 050. Meanwhile, in-force BVR Conditions 8620 (curfew) and 8621 (monitoring device) are absent from DHA's online list, while legacy 8304/8574/8577/8613/8619 remain."
          : "이민성 드롭다운은 010·020·050 브리징 비자를 '~False'로 숨겨 조건을 보여주지 않으며, 현행 Schedule 8에 존재하는 8620(야간 통금)·8621(전자장치)는 누락된 반면 구형 8304·8574·8577·8613·8619는 남아 있습니다."
      },
    ];
    grid.innerHTML = cards.map((c) => `
      <div class="vce-drift-card">
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.body)}</p>
      </div>
    `).join("");
  }

  function updateHandoffLinks() {
    const condCode = state.selectedCode || "8503";
    const visaCode = state.selectedVisa || "500";
    const qNote = state.mode === "combo" && state.comboCodes.length
      ? `Conditions:${state.comboCodes.join(",")}`
      : `Visa:${visaCode},Condition:${condCode}`;

    const setHref = (id, baseKo, baseEn) => {
      const el = document.getElementById(id);
      if (!el) return;
      const base = state.lang === "en" ? baseEn : baseKo;
      const sep = base.includes("?") ? "&" : "?";
      el.setAttribute("href", `${base}${sep}src=vce&context=${encodeURIComponent(qNote)}`);
    };

    setHref("cta-handoff-emergency", "https://parklawyers.com.au/case-emergency/visa/?lang=ko", "https://parklawyers.com.au/case-emergency/visa/");
    setHref("cta-handoff-crisis", "https://changa9090.github.io/parkco-visa-crisis-navigator/?lang=ko", "https://changa9090.github.io/parkco-visa-crisis-navigator/?lang=en");
    setHref("cta-handoff-consult", "https://parklawyers.com.au/links/?lang=ko", "https://parklawyers.com.au/links/?lang=en");

    if (window.ParkCoHandoff && typeof window.ParkCoHandoff.setProfile === "function") {
      try {
        window.ParkCoHandoff.setProfile({
          source_tool: "visa-conditions-explorer",
          visa: visaCode,
          topic: qNote,
        });
      } catch (_err) {
        // Ignore if storage restricted
      }
    }
  }

  function renderSourceModal() {
    const body = document.getElementById("source-modal-body");
    if (!body || !state.polling) return;
    const isEn = state.lang === "en";
    body.innerHTML = `
      <p style="margin:0 0 12px;font-size:13.5px;color:var(--pk-ink-2);">
        ${esc(isEn
          ? `Compilation: ${state.polling.frl_compilation} · Schedule 8 clauses verified: ${state.polling.schedule8_count} · Snapshot UTC: ${state.polling.generated_at_utc}`
          : `법령 컴파일: ${state.polling.frl_compilation} · Schedule 8 검증 조항: ${state.polling.schedule8_count}개 · 스냅샷(UTC): ${state.polling.generated_at_utc}`)}
      </p>
      ${state.polling.sources.map((s) => `
        <div class="vce-src-item">
          <div><strong>${esc(isEn ? s.title_en : s.title_ko)}</strong> (${esc(s.effective_date)})</div>
          <div><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></div>
          <code>SHA-256: ${esc(s.sha256)}</code>
        </div>
      `).join("")}
    `;
  }

  function switchMode(newMode) {
    state.mode = newMode;
    document.querySelectorAll(".vce-tab-btn").forEach((b) => {
      const active = b.getAttribute("data-mode") === newMode;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.getElementById("panel-mode-code").hidden = newMode !== "code";
    document.getElementById("panel-mode-visa").hidden = newMode !== "visa";
    document.getElementById("panel-mode-combo").hidden = newMode !== "combo";
    if (newMode === "visa") renderVisaMode();
    if (newMode === "combo") renderComboMode();
    updateHandoffLinks();
  }

  function selectCondition(code, scrollIntoDetail = false) {
    if (!state.condMap.has(code)) return;
    state.selectedCode = code;
    renderIntentAndPopularChips();
    renderDirectory();
    renderDetailCard();
    if (state.mode === "visa") renderVisaMode();
    updateHandoffLinks();
    if (scrollIntoDetail) {
      document.getElementById("condition-detail-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function showGlossaryBalloon(btn, idx) {
    const item = GLOSSARY_TERMS[idx];
    const balloon = document.getElementById("floating-balloon");
    const body = document.getElementById("balloon-body");
    if (!item || !balloon || !body) return;
    body.textContent = state.lang === "en" ? item.en : item.ko;
    balloon.hidden = false;
    const rect = btn.getBoundingClientRect();
    const top = Math.min(window.innerHeight - 160, rect.bottom + 8);
    const left = Math.min(window.innerWidth - 355, Math.max(12, rect.left));
    balloon.style.top = `${Math.max(12, top)}px`;
    balloon.style.left = `${left}px`;
  }

  function bindEvents() {
    document.getElementById("lang-btn-ko").addEventListener("click", () => {
      state.lang = "ko";
      renderAll();
    });
    document.getElementById("lang-btn-en").addEventListener("click", () => {
      state.lang = "en";
      renderAll();
    });

    document.querySelectorAll(".vce-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchMode(btn.getAttribute("data-mode")));
    });

    const searchInput = document.getElementById("cond-search-input");
    const clearBtn = document.getElementById("cond-search-clear");
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value;
      clearBtn.hidden = !state.search;
      renderDirectory();
      // Auto-select exact 4-digit match
      const clean = state.search.trim();
      if (/^8\d{3}$/.test(clean) && state.condMap.has(clean)) {
        selectCondition(clean, false);
      }
    });
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      state.search = "";
      clearBtn.hidden = true;
      renderDirectory();
    });

    document.getElementById("cond-risk-filter").addEventListener("change", (e) => {
      state.riskFilter = e.target.value;
      renderDirectory();
    });

    document.getElementById("visa-select").addEventListener("change", (e) => {
      state.selectedVisa = e.target.value;
      renderVisaMode();
      updateHandoffLinks();
    });

    document.querySelectorAll(".vce-seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.visaAudience = btn.getAttribute("data-aud");
        renderVisaMode();
      });
    });

    document.getElementById("combo-apply-btn").addEventListener("click", () => {
      const raw = document.getElementById("combo-raw-input").value || "";
      const found = Array.from(new Set(raw.match(/8\d{3}/g) || []));
      if (found.length) {
        state.comboCodes = found;
        renderComboMode();
        renderDetailCard();
        updateHandoffLinks();
      }
    });

    document.getElementById("combo-clear").addEventListener("click", () => {
      state.comboCodes = [];
      document.getElementById("combo-raw-input").value = "";
      renderComboMode();
      renderDetailCard();
    });

    document.getElementById("combo-print").addEventListener("click", () => window.print());

    document.getElementById("combo-copy-link").addEventListener("click", (e) => {
      const url = new URL(window.location.href);
      url.search = "";
      url.searchParams.set("conds", state.comboCodes.join(","));
      url.searchParams.set("lang", state.lang);
      navigator.clipboard?.writeText(url.toString());
      e.target.textContent = state.lang === "en" ? "Copied!" : "복사 완료!";
      setTimeout(() => { e.target.textContent = t("btnCopyLink"); }, 1600);
    });

    // Global delegated clicks
    document.addEventListener("click", (e) => {
      const intentBtn = e.target.closest("[data-intent]");
      if (intentBtn) {
        state.intent = intentBtn.getAttribute("data-intent");
        renderIntentAndPopularChips();
        renderDirectory();
        return;
      }

      const pickCodeBtn = e.target.closest("[data-pick-code], [data-select-code], [data-jump-code]");
      if (pickCodeBtn) {
        const c = pickCodeBtn.getAttribute("data-pick-code")
          || pickCodeBtn.getAttribute("data-select-code")
          || pickCodeBtn.getAttribute("data-jump-code");
        const shouldScroll = !pickCodeBtn.closest("#panel-mode-visa");
        selectCondition(c, shouldScroll);
        return;
      }

      const visaPickBtn = e.target.closest("[data-pick-visa], [data-jump-visa]");
      if (visaPickBtn) {
        const sc = visaPickBtn.getAttribute("data-pick-visa") || visaPickBtn.getAttribute("data-jump-visa");
        state.selectedVisa = sc;
        switchMode("visa");
        if (visaPickBtn.hasAttribute("data-jump-visa")) {
          document.getElementById("explorer-workbench").scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      const presetBtn = e.target.closest("[data-combo-preset]");
      if (presetBtn) {
        const p = COMBO_PRESETS.find((x) => x.id === presetBtn.getAttribute("data-combo-preset"));
        if (p) {
          state.comboCodes = [...p.codes];
          document.getElementById("combo-raw-input").value = p.codes.join(", ");
          renderComboMode();
          renderDetailCard();
          updateHandoffLinks();
        }
        return;
      }

      const remCombo = e.target.closest("[data-remove-combo]");
      if (remCombo) {
        const code = remCombo.getAttribute("data-remove-combo");
        state.comboCodes = state.comboCodes.filter((x) => x !== code);
        renderComboMode();
        renderDetailCard();
        return;
      }

      const toggleCombo = e.target.closest("[data-toggle-combo]");
      if (toggleCombo) {
        const code = toggleCombo.getAttribute("data-toggle-combo");
        if (state.comboCodes.includes(code)) {
          state.comboCodes = state.comboCodes.filter((x) => x !== code);
        } else {
          state.comboCodes = [...state.comboCodes, code];
        }
        renderDetailCard();
        if (state.mode === "combo") renderComboMode();
        return;
      }

      const copyCond = e.target.closest("[data-copy-cond]");
      if (copyCond) {
        const code = copyCond.getAttribute("data-copy-cond");
        const url = new URL(window.location.href);
        url.search = "";
        url.searchParams.set("code", code);
        url.searchParams.set("lang", state.lang);
        navigator.clipboard?.writeText(url.toString());
        copyCond.textContent = state.lang === "en" ? "Copied!" : "복사됨!";
        setTimeout(() => { copyCond.textContent = state.lang === "en" ? "Copy Link" : "코드 링크 복사"; }, 1600);
        return;
      }

      const compBtn = e.target.closest("[data-comp-id]");
      if (compBtn) {
        state.activeCompId = compBtn.getAttribute("data-comp-id");
        renderComparator();
        return;
      }

      const glossBtn = e.target.closest("[data-glossary-idx]");
      if (glossBtn) {
        showGlossaryBalloon(glossBtn, Number(glossBtn.getAttribute("data-glossary-idx")));
        return;
      }

      if (!e.target.closest("#floating-balloon")) {
        document.getElementById("floating-balloon").hidden = true;
      }
    });

    document.getElementById("balloon-close").addEventListener("click", () => {
      document.getElementById("floating-balloon").hidden = true;
    });

    const srcModal = document.getElementById("source-modal");
    document.getElementById("btn-source-modal").addEventListener("click", () => {
      renderSourceModal();
      srcModal.hidden = false;
    });
    document.getElementById("source-modal-close").addEventListener("click", () => {
      srcModal.hidden = true;
    });
    srcModal.addEventListener("click", (e) => {
      if (e.target === srcModal) srcModal.hidden = true;
    });
  }

  function renderAll() {
    updateLanguageChrome();
    renderIntentAndPopularChips();
    renderDirectory();
    renderDetailCard();
    renderComparator();
    renderDriftAudit();
    if (state.mode === "visa") renderVisaMode();
    if (state.mode === "combo") renderComboMode();
    updateHandoffLinks();
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lang") === "en") state.lang = "en";

    const [catRes, visRes, pollRes] = await Promise.all([
      fetch("./data/conditions_catalog.json"),
      fetch("./data/visas_matrix.json"),
      fetch("./data/polling_status.json"),
    ]);
    state.catalog = await catRes.json();
    state.visasMatrix = await visRes.json();
    state.polling = await pollRes.json();

    state.catalog.conditions.forEach((c) => state.condMap.set(c.code, c));
    state.visasMatrix.visas.forEach((v) => state.visaMap.set(v.subclass, v));

    if (params.get("code") && state.condMap.has(params.get("code"))) {
      state.selectedCode = params.get("code");
    }
    if (params.get("conds")) {
      const list = Array.from(new Set(params.get("conds").match(/8\d{3}/g) || []));
      if (list.length) {
        state.comboCodes = list;
        state.mode = "combo";
      }
    } else if (params.get("visa") && state.visaMap.has(params.get("visa"))) {
      state.selectedVisa = params.get("visa");
      state.mode = "visa";
    }

    bindEvents();
    switchMode(state.mode);
    renderAll();
  }

  init().catch((err) => {
    console.error("Failed to initialize Visa Conditions Explorer:", err);
  });
})();
