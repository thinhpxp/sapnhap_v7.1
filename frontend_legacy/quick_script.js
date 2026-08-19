// /public/quick_script.js - Logic cho Giao diện Tra cứu Nhanh
// GHI CHÚ: Toàn bộ mã nguồn được bọc trong một hàm IIFE (Immediately Invoked Function Expression)

(() => {
    // === GHI CHÚ: Sao chép các hàm và biến cần thiết từ script.js ===
    const currentLang = document.documentElement.lang || 'vi';
    const translations = window.translations || {};
    const t = (key, fallback = '') => translations[key] || fallback;
    const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;

    // Hàm localize và toNormalizedString được định nghĩa lại ngay tại đây
    function toNormalizedString(str) {
        if (!str) return '';
        str = str.replace(/đ/g, 'd').replace(/Đ/g, 'D');
        return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function localize(name, en_name) {
        // Cần biết trạng thái của checkbox. Chúng ta sẽ đọc trực tiếp từ DOM.
        const accentToggle = document.getElementById('accent-toggle');
        const removeAccents = accentToggle ? accentToggle.checked : false;

        if (currentLang === 'en' && removeAccents) {
            return en_name || toNormalizedString(name);
        }
        return name;
    }
    // =================================================================

    // === KHAI BÁO BIẾN VÀ DOM ELEMENTS ===
    const quickSearchInterface = document.getElementById('quick-search-interface');
    const quickSearchOldInput = document.getElementById('quick-search-old-input');
    const quickSearchNewInput = document.getElementById('quick-search-new-input');
    const oldResultsContainer = document.getElementById('quick-search-old-results');
    const newResultsContainer = document.getElementById('quick-search-new-results');
    const resultContainer = document.getElementById('result-container');
    const oldAddressDisplay = document.getElementById('old-address-display');
    const oldCodeDisplay = document.getElementById('old-code-display');
    const newAddressDisplay = document.getElementById('new-address-display');
    const historyDisplay = document.getElementById('history-display');
    const adminCenterActions = document.getElementById('admin-center-actions');

    let debounceTimer;

    // === HÀM DEBOUNCE ===
    // GHI CHÚ: Hàm này dùng để trì hoãn việc gọi API. Nó sẽ chỉ thực thi
    // hàm `func` sau khi người dùng đã ngừng gõ trong `delay` mili giây.
    function debounce(func, delay = 300) {
        return function(...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    // === HÀM XỬ LÝ TÌM KIẾM ===
    async function handleQuickSearch(event) {
        const input = event.target;
        const term = input.value.trim();
        const type = input.id === 'quick-search-old-input' ? 'old' : 'new';
        const resultsContainer = type === 'old' ? oldResultsContainer : newResultsContainer;
        const spinner = input.nextElementSibling;

        // Xóa kết quả cũ và ẩn đi
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');

        if (term.length < 2) {
            return; // Không tìm kiếm nếu từ khóa quá ngắn
        }

        spinner.classList.remove('hidden');

        try {
            const apiUrl = `/api/quick-search?term=${term}&type=${type}`;
            const response = await fetch(apiUrl);
            const results = await response.json();

            if (results.length > 0) {
                displaySearchResults(results, resultsContainer, type);
            } else {
                resultsContainer.innerHTML = `<li>${t('noResultsFound', 'Không tìm thấy kết quả.')}</li>`;
                resultsContainer.classList.remove('hidden');
            }
        } catch (error) {
            console.error(`Lỗi khi tìm kiếm ${type}:`, error);
            resultsContainer.innerHTML = `<li>${t('searchError', 'Lỗi khi tìm kiếm.')}</li>`;
            resultsContainer.classList.remove('hidden');
        } finally {
            spinner.classList.add('hidden');
        }
    }

    // === HÀM HIỂN THỊ KẾT QUẢ TÌM KIẾM ===
    function displaySearchResults(results, container, type) {
        container.innerHTML = '';
        results.forEach(result => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span id="result-ward" class="result-name">${result.name}</span>
                <span class="result-context">${result.context}</span>
            `;
            // Gán dữ liệu vào element để sử dụng khi click
            li.dataset.code = result.code;
            li.dataset.type = type;
             li.dataset.name = result.name; // Lưu lại tên
            li.dataset.context = result.context; // Lưu lại ngữ cảnh (Quận, Tỉnh)
            li.addEventListener('click', handleResultClick);
            container.appendChild(li);
        });
        container.classList.remove('hidden');
    }

    // === HÀM XỬ LÝ KHI CLICK VÀO MỘT KẾT QUẢ ===
    //=== PHỤC VỤ CHO CHỨC NĂNG TRA CỨU NHANH ===
    async function handleResultClick(event) {
        const li = event.currentTarget;
        const code = li.dataset.code;
        const type = li.dataset.type; //old hoặc new
        // === THÊM MỚI: Lấy lại thông tin đã lưu ===
        const name = li.dataset.name;
        const context = li.dataset.context;
        const fullAddress = `${li.dataset.name}, ${li.dataset.context}`;

        // Ẩn danh sách kết quả
        oldResultsContainer.classList.add('hidden');
        newResultsContainer.classList.add('hidden');
        // --- THÊM MỚI: Ẩn hướng dẫn ban đầu đi ---
        // Lưu ý: Cần đảm bảo biến 'initialInstruction' đã được khai báo hoặc lấy lại từ DOM
        const instructionBox = document.getElementById('initial-instruction');
        if (instructionBox) instructionBox.classList.add('hidden');
        // Hiển thị loading trong khung kết quả chính
        resultContainer.classList.remove('hidden');
        oldAddressDisplay.innerHTML = '';
        newAddressDisplay.innerHTML = `<p>${t('lookingUp')}</p>`;
        if (historyDisplay) historyDisplay.classList.add('hidden');
        if (adminCenterActions) adminCenterActions.classList.add('hidden');

        try {
        // 'type' ở đây sẽ là 'old' hoặc 'new', chúng ta cần đổi nó thành 'forward' hoặc 'reverse'.
            const lookupType = type === 'old' ? 'forward' : 'reverse';
            const response = await fetch(`/api/lookup?code=${code}&type=${lookupType}`);
            const data = await response.json();

             // Truyền `fullAddress` vào các hàm render
            if (type === 'old') {
                renderForwardLookupResult(data, fullAddress);
            } else {
                renderReverseLookupResult(data, fullAddress);
            }
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết:', error);
            newAddressDisplay.innerHTML = `<p class="error">${t('detailsError', 'Lỗi khi lấy chi tiết.')}</p>`;
        }
    }

    // === CẬP NHẬT HÀM renderVillageChanges ===
// Thêm nút toggle và wrapper để phù hợp với CSS có sẵn
function renderVillageChanges(villageData, title) {
    if (!villageData || villageData.length === 0) {
        return '';
    }

    // Tạo ID duy nhất cho mỗi container
    const containerId = `village-container-${Math.random().toString(36).substr(2, 9)}`;

    const listItems = villageData.map(item => `
        <tr>
            <td>${item.old_village_name || 'N/A'}</td>
            <td>&rarr;</td>
            <td>${item.new_village_name || 'N/A'}</td>
        </tr>
    `).join('');

    return `
        <div class="village-changes-wrapper">
            <button class="village-toggle-btn" data-target="${containerId}">
                ${title} (${villageData.length} thay đổi)
                <span class="toggle-arrow">▼</span>
            </button>
            <div id="${containerId}" class="village-changes-container">
                <table>
                    <thead>
                        <tr>
                            <th>Tên cũ</th>
                            <th></th>
                            <th>Tên mới</th>
                        </tr>
                    </thead>
                    <tbody>${listItems}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderForwardLookupResult(data, fullOldAddress) {
    const { events, village_changes } = data;
    const villageHtml = renderVillageChanges(village_changes, t('villageChangesTitle', 'Thay đổi cấp Thôn/Tổ dân phố:'));

    //  THÊM: Lấy old codes từ event đầu tiên (vì forward lookup từ 1 old ward)
    let oldCodes = '';
    let oldAddressForCopy = fullOldAddress;

    if (events.length > 0) {
        const firstEvent = events[0];
        oldCodes = `${firstEvent.old_ward_code}, ${firstEvent.old_district_code}, ${firstEvent.old_province_code}`;
        oldAddressForCopy = `${fullOldAddress} (Codes: ${oldCodes})`;
    }

    //  CẢI TIẾN: Hiển thị Old Address với codes và nút copy
    oldAddressDisplay.innerHTML = `
        <div class="address-line">
            <p><span class="label">${t('oldAddressLabel')}</span> ${fullOldAddress}</p>
            ${oldCodes ? `<button class="copy-btn" title="Copy" data-copy-text="${oldAddressForCopy}">${copyIconSvg}</button>` : ''}
        </div>
        ${oldCodes ? `<div class="address-codes"><span class="label">Old Code:</span> ${oldCodes}</div>` : ''}
    `;

    // === Phần còn lại giữ nguyên ===
    if (events.length === 0) {
        newAddressDisplay.innerHTML = `<p class="no-change">${t('noChangeMessage')}</p>` + villageHtml;
    }
    else if (events.length > 1 || (events[0] && events[0].event_type === 'SPLIT_MERGE')) {
        const splitHtml = events.map(result => {
            const newAddress = `${localize(result.new_ward_name, result.new_ward_en_name)}, ${localize(result.new_province_name, result.new_province_en_name)}`;
            const newCodes = `${result.new_ward_code}, ${result.new_province_code}`;
            return `
            <li>
                ${newAddress}
                <div class="address-codes"><span class="label">New Code:</span> ${newCodes}</div>
                <div class="split-description">${result.split_description}</div>
            </li>`;
        }).join('');
        newAddressDisplay.innerHTML = `<p class="split-case-note">${t('splitCaseNote')}</p><ul class="split-results-list">${splitHtml}</ul>` + villageHtml;
    }
    else {
        const finalUnitData = events[0];
        const newWardName = localize(finalUnitData.new_ward_name, finalUnitData.new_ward_en_name);
        const newProvinceName = localize(finalUnitData.new_province_name, finalUnitData.new_province_en_name);
        const newAddressForDisplay = `${newWardName}, ${newProvinceName}`;
        const newCodes = `${finalUnitData.new_ward_code}, ${finalUnitData.new_province_code}`;
        const newAddressForCopy = `${newAddressForDisplay} (Codes: ${newCodes})`;

        let resultsHtml = `
            <div class="address-line">
                <p><span class="label">${t('newAddressLabel')}</span> ${newAddressForDisplay}</p>
                <button class="copy-btn" title="Copy" data-copy-text="${newAddressForCopy}">${copyIconSvg}</button>
            </div>
            <div class="address-codes"><span class="label">New Code:</span> ${newCodes}</div>`;
        newAddressDisplay.innerHTML = resultsHtml + villageHtml;
    }
    // Cập nhật biến toàn cục để Modal bên script.js đọc được
        if (data.events && data.events.length > 0) {
            window.newWardCodeForModal = data.events[0].new_ward_code;
            window.newProvinceCodeForModal = data.events[0].new_province_code;

            // QUAN TRỌNG: Xóa class hidden để hiện nút
            if (adminCenterActions) adminCenterActions.classList.remove('hidden');
        }
}

    // === PHẦN 2: Cập nhật hàm renderReverseLookupResult với debug chi tiết ===
function renderReverseLookupResult(data, fullNewAddress) {
    console.log('🔄 renderReverseLookupResult called:', {
        dataType: Array.isArray(data) ? 'array' : typeof data,
        eventsCount: data?.length || 0,
        data: data
    });

    const events = data;
    const newCodes = events.length > 0 ? `${events[0].new_ward_code}, ${events[0].new_province_code}` : '';
    const newAddressForCopy = `${fullNewAddress} (Codes: ${newCodes})`;

    let newAddressHtml = `
        <div class="address-line">
            <p><span class="label">${t('newAddressLabel').replace(':','')}</span> ${fullNewAddress}</p>
            <button class="copy-btn" title="Copy" data-copy-text="${newAddressForCopy}">${copyIconSvg}</button>
        </div>
        <div class="address-codes"><span class="label">New Code:</span> ${newCodes}</div>`;
    oldAddressDisplay.innerHTML = newAddressHtml;

    if (events.length > 0) {
        const oldUnitsHtml = events.map((record, index) => {
            console.log(`📍 Processing event ${index + 1}:`, {
                ward: record.old_ward_name,
                hasVillageChanges: !!record.village_changes,
                villageCount: record.village_changes?.length || 0,
                villageChanges: record.village_changes
            });

            let noteHtml = '';
            if (record.event_type === 'SPLIT_MERGE' && record.split_description) {
                noteHtml = `<div class="split-context-note">${record.split_description}</div>`;
            }

            const ward = localize(record.old_ward_name, record.old_ward_en_name);
            const district = localize(record.old_district_name, record.old_district_en_name);
            const province = localize(record.old_province_name, record.old_province_en_name);
            const oldCodes = `${record.old_ward_code}, ${record.old_district_code}, ${record.old_province_code}`;

            // ✅ CRITICAL: Gọi renderVillageChanges với dữ liệu từ record
            const villageHtml = renderVillageChanges(
                record.village_changes,
                `Thay đổi tại ${record.old_ward_name}:`
            );

            console.log(`🏘️ Village HTML for ${record.old_ward_name}:`, {
                hasContent: villageHtml.length > 0,
                htmlLength: villageHtml.length,
                preview: villageHtml.substring(0, 100)
            });

            return `
                <li>
                    ${ward}, ${district}, ${province}
                    <div class="address-codes"><span class="label">Old Code:</span> ${oldCodes}</div>
                    ${noteHtml}
                    ${villageHtml}
                </li>`;
        }).join('');

        console.log('📋 Final oldUnitsHtml length:', oldUnitsHtml.length);
        newAddressDisplay.innerHTML = `<p class="label">${t('mergedFromLabel')}</p><ul class="old-units-list">${oldUnitsHtml}</ul>`;
        console.log('✅ HTML inserted into newAddressDisplay');
    } else {
        newAddressDisplay.innerHTML = `<p class="no-change">${t('noDataFoundMessage')}</p>`;
    }
    //Cập nhat biến toàn cục để Modal bên script.js đọc được
    if (data && data.length > 0) {
             // Cập nhật biến toàn cục
            window.newWardCodeForModal = data[0].new_ward_code;
            window.newProvinceCodeForModal = data[0].new_province_code;

            // QUAN TRỌNG: Xóa class hidden để hiện nút
            if (adminCenterActions) adminCenterActions.classList.remove('hidden');
        }
}

    // === THÊM EVENT DELEGATION CHO CÁC NÚT TOGGLE ===
// Thêm vào cuối hàm initializeQuickSearch()
function initializeQuickSearch() {
    if (!quickSearchOldInput || !quickSearchNewInput) return;

    quickSearchOldInput.addEventListener('input', debounce(handleQuickSearch, 300));
    quickSearchNewInput.addEventListener('input', debounce(handleQuickSearch, 300));

    // ✅ THÊM: Event delegation cho toggle buttons
    document.addEventListener('click', function(event) {
        if (event.target.closest('.village-toggle-btn')) {
            const btn = event.target.closest('.village-toggle-btn');
            const targetId = btn.dataset.target;
            const container = document.getElementById(targetId);

            if (container) {
                // Toggle active class
                btn.classList.toggle('active');

                // Toggle max-height
                if (btn.classList.contains('active')) {
                    container.style.maxHeight = container.scrollHeight + 'px';
                } else {
                    container.style.maxHeight = '0';
                }
            }
        }
    });

    console.log("Giao diện Tra cứu Nhanh đã được khởi tạo.");
}

    // Gán hàm khởi tạo vào window để script.js có thể gọi nó
    window.initializeQuickSearch = initializeQuickSearch;

    // Nếu giao diện đã hiển thị sẵn (trường hợp người dùng F5), tự khởi tạo
    if (quickSearchInterface && !quickSearchInterface.classList.contains('hidden')) {
        initializeQuickSearch();
    }
})();