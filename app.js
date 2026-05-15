// ===== LANGUAGES LIST (Top 20 by speakers, with country codes for flags) =====
const languages = [
    {code:'en',  name:'الإنجليزية',   cc:'gb'},
    {code:'zh-CN',name:'الصينية',     cc:'cn'},
    {code:'hi',  name:'الهندية',      cc:'in'},
    {code:'es',  name:'الإسبانية',    cc:'es'},
    {code:'ar',  name:'العربية',      cc:'sa'},
    {code:'fr',  name:'الفرنسية',     cc:'fr'},
    {code:'bn',  name:'البنغالية',    cc:'bd'},
    {code:'pt',  name:'البرتغالية',   cc:'br'},
    {code:'ru',  name:'الروسية',      cc:'ru'},
    {code:'ja',  name:'اليابانية',    cc:'jp'},
    {code:'de',  name:'الألمانية',    cc:'de'},
    {code:'ko',  name:'الكورية',      cc:'kr'},
    {code:'tr',  name:'التركية',      cc:'tr'},
    {code:'it',  name:'الإيطالية',    cc:'it'},
    {code:'vi',  name:'الفيتنامية',   cc:'vn'},
    {code:'th',  name:'التايلاندية',  cc:'th'},
    {code:'id',  name:'الإندونيسية',  cc:'id'},
    {code:'nl',  name:'الهولندية',    cc:'nl'},
    {code:'pl',  name:'البولندية',    cc:'pl'},
    {code:'uk',  name:'الأوكرانية',   cc:'ua'},
];

// Flag image URL helper
function flagUrl(cc) {
    return `https://flagcdn.com/w40/${cc}.png`;
}

// ===== GLOBALS =====
let translateTimer = null;
let currentEncoding = 'ascii';
let lastDetectedLang = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    buildCustomSelects();
    initTheme();
    initModeTabs();
    initSmartTranslation();
    initCodeConvert();
    initEncoding();

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-select').forEach(sel => {
            if (!sel.contains(e.target)) sel.classList.remove('open');
        });
    });
});

// ===== BUILD CUSTOM SELECT DROPDOWNS =====
function buildCustomSelects() {
    buildSelect('lang1', 'ar');
    buildSelect('lang2', 'en');
    updateDirectionBar();
}

function buildSelect(id, defaultCode) {
    const wrapper = document.getElementById(id + '-wrapper');
    const trigger = document.getElementById(id + '-trigger');
    const optionsContainer = document.getElementById(id + '-options');
    const hiddenInput = document.getElementById(id);
    const flagImg = document.getElementById(id + '-flag');
    const textSpan = document.getElementById(id + '-text');

    // Set default
    const defaultLang = languages.find(l => l.code === defaultCode);
    flagImg.src = flagUrl(defaultLang.cc);
    textSpan.textContent = defaultLang.name;
    hiddenInput.value = defaultCode;

    // Build options
    languages.forEach(lang => {
        const opt = document.createElement('div');
        opt.className = 'select-option' + (lang.code === defaultCode ? ' selected' : '');
        opt.dataset.code = lang.code;
        opt.innerHTML = `<img src="${flagUrl(lang.cc)}" alt="${lang.name}"> ${lang.name}`;

        opt.addEventListener('click', () => {
            // Update trigger
            flagImg.src = flagUrl(lang.cc);
            textSpan.textContent = lang.name;
            hiddenInput.value = lang.code;

            // Update selected state
            optionsContainer.querySelectorAll('.select-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            // Close dropdown
            wrapper.classList.remove('open');

            // Trigger change
            updateDirectionBar();
            retranslate();
        });

        optionsContainer.appendChild(opt);
    });

    // Toggle dropdown on click
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other selects
        document.querySelectorAll('.custom-select').forEach(sel => {
            if (sel !== wrapper) sel.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    });
}

function getLangName(code) {
    const lang = languages.find(l => l.code === code) || languages.find(l => code && l.code.startsWith(code.split('-')[0]));
    return lang ? lang.name : code;
}

function getLangFlag(code) {
    const lang = languages.find(l => l.code === code) || languages.find(l => code && l.code.startsWith(code.split('-')[0]));
    return lang ? flagUrl(lang.cc) : '';
}

function updateDirectionBar(fromCode, toCode) {
    const l1 = document.getElementById('lang1').value;
    const l2 = document.getElementById('lang2').value;
    document.getElementById('dirFrom').textContent = getLangName(fromCode || l1);
    document.getElementById('dirTo').textContent = getLangName(toCode || l2);
}

function retranslate() {
    const input = document.getElementById('transInput');
    if (input.value.trim()) {
        clearTimeout(translateTimer);
        smartTranslate(input.value.trim());
    }
}

// ===== THEME =====
function initTheme() {
    const btn = document.getElementById('themeToggle');
    const saved = localStorage.getItem('heka-theme') || 'dark';
    applyTheme(saved);

    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        applyTheme(next);
        localStorage.setItem('heka-theme', next);
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('#themeToggle i');
    icon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
}

// ===== MODE TABS =====
function initModeTabs() {
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.mode-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById('mode-' + tab.dataset.mode);
            target.classList.add('active');
            target.style.animation = 'none';
            target.offsetHeight;
            target.style.animation = '';
        });
    });
}

// ===== SMART TRANSLATION (Auto-detect direction) =====
function initSmartTranslation() {
    const input = document.getElementById('transInput');

    input.addEventListener('input', () => {
        document.getElementById('charCount').textContent = input.value.length;
        clearTimeout(translateTimer);
        const text = input.value.trim();

        if (!text) {
            document.getElementById('transOutput').textContent = 'الترجمة هتظهر هنا تلقائي...';
            document.getElementById('suggestion').innerHTML = '';
            setStatus('جاهز — اكتب بأي لغة وهيكتشفها تلقائي');
            const l1 = document.getElementById('lang1').value;
            const l2 = document.getElementById('lang2').value;
            updateDirectionBar(l1, l2);
            return;
        }

        setStatus('جاري الكشف والترجمة...');
        translateTimer = setTimeout(() => smartTranslate(text), 400);
    });
}

async function smartTranslate(text) {
    const lang1Code = document.getElementById('lang1').value;
    const lang2Code = document.getElementById('lang2').value;
    const dirBar = document.getElementById('directionBar');

    const detectUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang2Code}&dt=t&dt=qca&q=${encodeURIComponent(text)}`;

    try {
        const res = await fetch(detectUrl);
        const data = await res.json();

        const detectedLang = data[2];
        lastDetectedLang = detectedLang;

        let sl, tl, translated = '';

        if (detectedLang === lang2Code || isCloseMatch(detectedLang, lang2Code)) {
            sl = lang2Code;
            tl = lang1Code;
            dirBar.classList.add('flipped');

            const url2 = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&dt=qca&q=${encodeURIComponent(text)}`;
            const res2 = await fetch(url2);
            const data2 = await res2.json();

            if (data2[0]) data2[0].forEach(chunk => { if (chunk[0]) translated += chunk[0]; });
            handleSuggestion(data2, text);
        } else {
            sl = lang1Code;
            tl = lang2Code;
            dirBar.classList.remove('flipped');

            if (detectedLang === lang1Code || isCloseMatch(detectedLang, lang1Code)) {
                if (data[0]) data[0].forEach(chunk => { if (chunk[0]) translated += chunk[0]; });
                handleSuggestion(data, text);
            } else {
                const url3 = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&dt=qca&q=${encodeURIComponent(text)}`;
                const res3 = await fetch(url3);
                const data3 = await res3.json();
                if (data3[0]) data3[0].forEach(chunk => { if (chunk[0]) translated += chunk[0]; });
                handleSuggestion(data3, text);
            }
        }

        document.getElementById('transOutput').textContent = translated;
        updateDirectionBar(sl, tl);
        document.getElementById('outputLabel').innerHTML = `<i class="fas fa-language"></i> ${getLangName(tl)}`;
        setStatus(`✓ تم الكشف: ${getLangName(detectedLang)} → ترجمة إلى ${getLangName(tl)}`);

    } catch (e) {
        document.getElementById('transOutput').textContent = '❌ خطأ في الاتصال بالإنترنت';
        setStatus('خطأ في الاتصال ✗');
    }
}

function isCloseMatch(detected, selected) {
    if (!detected || !selected) return false;
    return detected.startsWith(selected.split('-')[0]) || selected.startsWith(detected.split('-')[0]);
}

function handleSuggestion(data, originalText) {
    const suggestEl = document.getElementById('suggestion');
    if (data[7] && data[7][1]) {
        const suggestion = data[7][1];
        suggestEl.innerHTML = `<span class="sugg-label">هل تقصد: </span><u>${suggestion}</u>`;
        suggestEl.onclick = () => {
            document.getElementById('transInput').value = suggestion;
            document.getElementById('charCount').textContent = suggestion.length;
            suggestEl.innerHTML = '';
            smartTranslate(suggestion);
        };
    } else {
        suggestEl.innerHTML = '';
    }
}

function setStatus(msg) {
    document.getElementById('transStatus').textContent = msg;
}

// ===== CODE CONVERSION =====
function initCodeConvert() {
    document.getElementById('convertCodeBtn').addEventListener('click', convertCode);
    document.getElementById('swapCode').addEventListener('click', () => {
        const from = document.getElementById('codeLangFrom');
        const to = document.getElementById('codeLangTo');
        [from.value, to.value] = [to.value, from.value];
    });
}

async function convertCode() {
    const input = document.getElementById('codeInput').value.trim();
    const output = document.getElementById('codeOutput');
    const btn = document.getElementById('convertCodeBtn');

    if (!input) { showToast('اكتب كود أولاً'); return; }

    const from = document.getElementById('codeLangFrom');
    const to = document.getElementById('codeLangTo');
    const fromName = from.options[from.selectedIndex].text;
    const toName = to.options[to.selectedIndex].text;

    btn.classList.add('loading');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحويل...';
    output.value = 'جاري التحويل...';

    const prompt = `Convert the following ${fromName} code to ${toName}. Only output the converted code, no explanations:\n\n${input}`;

    try {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAO0OIjvhIv5Z_Jnph2dx-iwd3pbCFeQOs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        let result = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم الحصول على نتيجة';
        result = result.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim();
        output.value = result;
    } catch (e) {
        output.value = '❌ خطأ في التحويل. تأكد من اتصالك بالإنترنت.';
    }

    btn.classList.remove('loading');
    btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> تحويل الكود';
}

// ===== ENCODING =====
function initEncoding() {
    const input = document.getElementById('encodeInput');
    const output = document.getElementById('encodeOutput');

    document.querySelectorAll('.encode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.encode-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentEncoding = tab.dataset.enc;
            document.getElementById('encodeLabel').textContent = tab.textContent;
            if (input.value) encodeFromText(input.value);
            else if (output.value) decodeFromEncoded(output.value);
        });
    });

    input.addEventListener('input', () => {
        if (!input.value) { output.value = ''; return; }
        encodeFromText(input.value);
    });

    output.addEventListener('input', () => {
        if (!output.value) { input.value = ''; return; }
        decodeFromEncoded(output.value);
    });
}

function encodeFromText(text) {
    const output = document.getElementById('encodeOutput');
    try {
        switch (currentEncoding) {
            case 'ascii':
                output.value = [...text].map(c => c.charCodeAt(0)).join(' '); break;
            case 'binary':
                output.value = [...text].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' '); break;
            case 'octal':
                output.value = [...text].map(c => c.charCodeAt(0).toString(8).padStart(3, '0')).join(' '); break;
            case 'hex':
                output.value = [...text].map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join(' '); break;
            case 'base64':
                output.value = btoa(unescape(encodeURIComponent(text))); break;
            case 'url':
                output.value = encodeURIComponent(text); break;
        }
    } catch (e) { output.value = '❌ خطأ في التحويل'; }
}

function decodeFromEncoded(encoded) {
    const input = document.getElementById('encodeInput');
    try {
        switch (currentEncoding) {
            case 'ascii':
                input.value = encoded.trim().split(/\s+/).map(n => String.fromCharCode(parseInt(n))).join(''); break;
            case 'binary':
                input.value = encoded.trim().split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2))).join(''); break;
            case 'octal':
                input.value = encoded.trim().split(/\s+/).map(o => String.fromCharCode(parseInt(o, 8))).join(''); break;
            case 'hex':
                input.value = encoded.trim().split(/\s+/).map(h => String.fromCharCode(parseInt(h, 16))).join(''); break;
            case 'base64':
                input.value = decodeURIComponent(escape(atob(encoded.trim()))); break;
            case 'url':
                input.value = decodeURIComponent(encoded.trim()); break;
        }
    } catch (e) { input.value = '❌ خطأ في فك التشفير'; }
}

// ===== UTILITIES =====
function copyText(id) {
    const el = document.getElementById(id);
    const text = el.value || el.textContent;
    if (!text || text === 'الترجمة هتظهر هنا تلقائي...') return;
    navigator.clipboard.writeText(text).then(() => showToast('تم النسخ ✓'));
}

function clearAll() {
    document.getElementById('transInput').value = '';
    document.getElementById('transOutput').textContent = 'الترجمة هتظهر هنا تلقائي...';
    document.getElementById('charCount').textContent = '0';
    document.getElementById('suggestion').innerHTML = '';
    document.getElementById('directionBar').classList.remove('flipped');
    const l1 = document.getElementById('lang1').value;
    const l2 = document.getElementById('lang2').value;
    updateDirectionBar(l1, l2);
    setStatus('جاهز — اكتب بأي لغة وهيكتشفها تلقائي');
}

function speakInput() {
    const text = document.getElementById('transInput').value;
    if (!text) return;
    const lang = lastDetectedLang || document.getElementById('lang1').value;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    speechSynthesis.speak(u);
}

function speakOutput() {
    const text = document.getElementById('transOutput').textContent;
    if (!text || text === 'الترجمة هتظهر هنا تلقائي...') return;
    const lang1 = document.getElementById('lang1').value;
    const lang2 = document.getElementById('lang2').value;
    const targetLang = (lastDetectedLang === lang2 || isCloseMatch(lastDetectedLang, lang2)) ? lang1 : lang2;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = targetLang;
    speechSynthesis.speak(u);
}

function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}
