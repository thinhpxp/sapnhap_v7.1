//script.js
document.addEventListener('DOMContentLoaded', () => {
    // === PHÁT HIỆN NGÔN NGỮ HIỆN TẠI ===
    const currentLang = document.documentElement.lang || 'vi';
    const translations = window.translations || {};
    const t = (key, fallback = '') => translations[key] || fallback;

    // === KHÓA API (CHỈ DÀNH CHO MYSTERY BOX) ===
    const UNSPLASH_ACCESS_KEY = 'Ln1_SF9l3ee_fsc320rUZjfB5fgSVCZlMg2JbSdh_XY';
    // --- CẤU HÌNH CHỨC NĂNG CHIA SẺ MXH ---
    const urlToShare = 'https://sapnhap.org';
    const textToShare = 'Tra cứu thông tin sáp nhập đơn vị hành chính Việt Nam 2025 một cách nhanh chóng và chính xác!';
    const hashtag = '#SapNhapHanhChinh'; // Thêm hashtag để tăng nhận diện
    const accountVia = 'thinhpxp'; // Tên tài khoản X của bạn (không có @) để được nhắc đến
    const facebookBtn = document.getElementById('share-facebook');
    const xBtn = document.getElementById('share-x');
    // --- HÀM KIỂM TRA THIẾT BỊ DI ĐỘNG ---
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    // === THÊM MỚI: DOM elements cho Popup ===
    const popupOverlay = document.getElementById('custom-popup-overlay');
    const closePopupBtn = document.getElementById('close-popup-btn');
    // === DOM Elements ===
    const lookupBtn = document.getElementById('lookup-btn');
    const resultContainer = document.getElementById('result-container');
    const oldAddressDisplay = document.getElementById('old-address-display');
    const newAddressDisplay = document.getElementById('new-address-display');
    const notificationArea = document.getElementById('notification-area');
    const mysteryBox = document.getElementById('mystery-box');
    const spinner = mysteryBox ? mysteryBox.querySelector('.loading-spinner') : null;
    const modeToggle = document.getElementById('mode-toggle');
    const lookupDescription = document.getElementById('lookup-description');
    const provinceSelectEl = document.getElementById('province-select');
    const districtSelectEl = document.getElementById('district-select');
    const communeSelectEl = document.getElementById('commune-select');
    const newProvinceSelectEl = document.getElementById('new-province-select');
    const newCommuneSelectEl = document.getElementById('new-commune-select');
    // Element cho switch accent
    const accentToggleContainer = document.getElementById('accent-toggle-container');
    const accentToggle = document.getElementById('accent-toggle');
    const forwardControls = document.getElementById('forward-controls');
    const reverseControls = document.getElementById('reverse-controls');
    // THÊM MỚI: Các element cho nút và modal để xem địa chỉ hành chính
    const adminCenterActions = document.getElementById('admin-center-actions');
    const showAdminCentersBtn = document.getElementById('show-admin-centers-btn');
    const adminCenterModal = document.getElementById('admin-center-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalBody = document.getElementById('modal-body');
    // Khung góp ý
    const feedbackInput = document.getElementById('feedback-input');
    const feedbackSendBtn = document.getElementById('feedback-send-btn');
    const feedbackMessage = document.getElementById('feedback-message');
    // Lịch sử sáp nhập
    const historyDisplay = document.getElementById('history-display');
    // QUICK SEARCH
    const traditionalControls = document.getElementById('controls');
    const quickSearchInterface = document.getElementById('quick-search-interface');
    const interfaceModeToggle = document.getElementById('interface-mode-toggle');
    // === THÊM MỚI: DOM element cho switch Cũ/Mới ===
    const traditionalModeSwitcher = document.getElementById('traditional-mode-switcher');
    // DOM của khối thông tin hướng dẫn ban đầu, trước khi user nhấn nút look-up
    const initialInstruction = document.getElementById('initial-instruction');
    // === BIỂU TƯỢNG SVG ===
    const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;
    const copiedIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard-check" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;

    // === QUẢN LÝ TRẠNG THÁI ===
    let allProvincesData = [];
    let isReverseMode = false;
    window.newWardCodeForModal = null; // THÊM MỚI: Biến để lưu mã xã mới cho modal
    window.newProvinceCodeForModal = null; // THÊM MỚI: Biến để lưu mã tỉnh mới cho modal
    let removeAccents = false; // Mặc định là TẮT (hiển thị có dấu)
    let provinceChoices, districtChoices, communeChoices;
    let newProvinceChoices, newCommuneChoices;
    let isQuickSearchMode = false;

    // === CÁC HÀM TIỆN ÍCH ===
    function toNormalizedString(str) {
        if (!str) return '';
        str = str.replace(/đ/g, 'd').replace(/Đ/g, 'D');
        return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function showNotification(message, type = 'loading') {
        if (notificationArea) {
            notificationArea.textContent = message;
            notificationArea.className = type;
            notificationArea.classList.remove('hidden');
        }
    }

    function hideNotification() {
        if (notificationArea) {
            notificationArea.classList.add('hidden');
            notificationArea.textContent = '';
        }
    }

    function updateChoices(choicesInstance, placeholder, data, valueKey = 'code', labelKey = 'name') {
        choicesInstance.clearStore();
        choicesInstance.setChoices(
            [{
                value: '',
                label: placeholder,
                selected: true,
                disabled: true
            }, ...data.map(item => ({
                value: item[valueKey],
                label: item[labelKey]
            }))],
            'value', 'label', false
        );
    }

    function resetChoice(choicesInstance, placeholder) {
        choicesInstance.clearStore();
        choicesInstance.setChoices([{
            value: '',
            label: placeholder,
            selected: true,
            disabled: true
        }], 'value', 'label', false);
        choicesInstance.disable();
    }

    // === HÀM DỊCH THUẬT & BẢN ĐỊA HÓA ===
    function applyTranslations() {
        // Dịch nội dung text (innerHTML)
        document.querySelectorAll('[data-i18n-key]').forEach(el => {
            const key = el.getAttribute('data-i18n-key');
            el.innerHTML = t(key, el.innerHTML);
        });

        // === THÊM MỚI: Dịch các thuộc tính placeholder ===
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = t(key);
            if (translation) {
                el.setAttribute('placeholder', translation);
            }
        });

        // Cập nhật các thuộc tính meta và title
        document.title = t('pageTitle', "Tra Cứu Sáp Nhập");
        const descEl = document.querySelector('meta[name="description"]');
        if (descEl) descEl.setAttribute('content', t('pageDescription'));
    }

    // Hàm quyết định hiển thị tên nào dựa trên ngôn ngữ và trạng thái switch
    function localize(name, en_name) {
        if (currentLang === 'en') {
            return removeAccents ? (en_name || toNormalizedString(name)) : name;
        }
        return name;
    }

    // === CÁC HÀM KHỞI TẠO & GIAO DIỆN ===
    function initialize() {
        applyTranslations();

        if (currentLang === 'en' && accentToggleContainer && accentToggle) {
            accentToggleContainer.classList.remove('hidden');
            accentToggle.checked = removeAccents; // Cập nhật trạng thái switch
        }

        const choicesConfig = {
            searchEnabled: true,
            itemSelectText: t('selectChoice', 'Chọn'),
            removeItemButton: true
        };

        // Hủy các instance cũ nếu có để tránh lỗi "already initialised"
        if (provinceChoices) provinceChoices.destroy();
        if (districtChoices) districtChoices.destroy();
        if (communeChoices) communeChoices.destroy();
        if (newProvinceChoices) newProvinceChoices.destroy();
        if (newCommuneChoices) newCommuneChoices.destroy();
        // Xử lý lịch sử
        if (window.allProvincesData && window.allProvincesData.length > 0) {
            updateChoices(provinceChoices, t('oldProvincePlaceholder'), localizedOldData);
        } else {
            showNotification(t('errorLoadOldData'), "error");
        }

        provinceChoices = new Choices(provinceSelectEl, {
            ...choicesConfig
        });
        districtChoices = new Choices(districtSelectEl, {
            ...choicesConfig
        });
        communeChoices = new Choices(communeSelectEl, {
            ...choicesConfig
        });
        newProvinceChoices = new Choices(newProvinceSelectEl, {
            ...choicesConfig
        });
        newCommuneChoices = new Choices(newCommuneSelectEl, {
            ...choicesConfig
        });

        resetChoice(districtChoices, t('oldDistrictPlaceholder'));
        resetChoice(communeChoices, t('oldCommunePlaceholder'));
        resetChoice(newCommuneChoices, t('newCommunePlaceholder'));

        addEventListeners();
        loadOldDataDropdowns(); //Gọi địa chỉ mới
        loadNewProvincesDropdown(); //Gọi địa chỉ cũ
        // === GỌI CÁC HÀM HIỂN THỊ SỐ LIỆU GOOGLE ANALYTICS ===
        // Hiển thị lượt tra cứu GOOGLE ANALYTICS
        displayEventCount();
        setInterval(displayEventCount, 600000);
        // Hiển thị GOOGLE REAL TIME
        displayRealtimeLocations();
        setInterval(displayRealtimeLocations, 120000);

        // Tùy chọn: Chỉ làm mới khi tab đang hiển thị (Tiết kiệm tài nguyên tối đa)
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === 'visible') {
                displayRealtimeLocations();
                // Không cần cập nhật event count liên tục khi quay lại tab
            }
        });

    }

    //QUẢN LÝ CHUYỂN ĐỔI GIAO DIỆN TRA CỨU TRUYỀN THỐNG VÀ QUICK SEARCH
    function toggleInterfaceMode() {
        isQuickSearchMode = interfaceModeToggle.checked;
        if (isQuickSearchMode) {
            // Chuyển sang chế độ Tra cứu Nhanh
            if (traditionalControls) traditionalControls.classList.add('hidden');
            if (quickSearchInterface) quickSearchInterface.classList.remove('hidden');
            resultContainer.classList.add('hidden'); // Ẩn kết quả cũ
            // === Ẩn switch Cũ/Mới khi ở chế độ Nhanh ===
            if (traditionalModeSwitcher) traditionalModeSwitcher.classList.add('hidden');
            // === Ẩn dòng mô tả ===
            if (lookupDescription) lookupDescription.classList.add('hidden');
            // --- Reset khung thông tin về trạng thái chờ ---
            resultContainer.classList.add('hidden'); // Ẩn kết quả cũ
            if (initialInstruction) initialInstruction.classList.remove('hidden'); // Hiện lại hướng dẫn
            // Chỉ tải script này một lần duy nhất.
            if (!document.getElementById('quick-search-script')) {
                console.log("Lần đầu kích hoạt Tra cứu Nhanh. Đang tải script...");
                const script = document.createElement('script');
                script.id = 'quick-search-script';
                script.src = '/quick_script.js';
                script.defer = true;
                // Gán một hàm callback để biết khi nào script đã tải xong
                script.onload = () => {
                    console.log("quick_script.js đã tải xong.");
                    // Nếu có một hàm khởi tạo trong quick_script.js, gọi nó ở đây
                    if (window.initializeQuickSearch) {
                        window.initializeQuickSearch();
                    }
                };
                document.body.appendChild(script);
            }

        } else {
            // Chuyển về chế độ Tra cứu Truyền thống
            if (traditionalControls) traditionalControls.classList.remove('hidden');
            if (quickSearchInterface) quickSearchInterface.classList.add('hidden');
            // === Hiện lại switch Cũ/Mới khi quay về ===
            if (traditionalModeSwitcher) traditionalModeSwitcher.classList.remove('hidden');
            // === Hiện lại dòng mô tả ===
            if (lookupDescription) lookupDescription.classList.remove('hidden');
        }
    }

    // THÊM MỚI: Hàm riêng để tải dữ liệu ban đầu
    function loadInitialData() {
        if (window.allProvincesData && window.allProvincesData.length > 0) {
            window.allProvincesData.sort((a, b) => a.code - b.code);
            updateChoices(provinceChoices, t('oldProvincePlaceholder'), window.allProvincesData);
        } else {
            showNotification(t('errorLoadOldData', "Lỗi tải dữ liệu cũ."), "error");
        }

        resetChoice(districtChoices, t('oldDistrictPlaceholder'));
        resetChoice(communeChoices, t('oldCommunePlaceholder'));
        resetChoice(newCommuneChoices, t('newCommunePlaceholder'));

        loadNewProvincesDropdown();
        displayEventCount();
        displayRealtimeLocations();
        //setInterval(displayRealtimeLocations, 90000);
    }
    // THÊM MỚI: Hàm tải dữ liệu cho dropdown Cũ
    async function loadOldDataDropdowns() {
        resetChoice(provinceChoices, t('oldProvinceLoading', 'Đang tải tỉnh/thành...'));
        try {
            const response = await fetch('/api/get-old-data');
            if (!response.ok) throw new Error(t('errorLoadOldData'));

            allProvincesData = await response.json(); // Lưu dữ liệu vào biến cục bộ

            const localizedOldData = allProvincesData.map(province => ({
                ...province,
                name: localize(province.name, null),
                districts: province.districts.map(district => ({
                    ...district,
                    name: localize(district.name, null),
                    wards: district.wards.map(ward => ({
                        ...ward,
                        name: localize(ward.name, null)
                    }))
                }))
            }));

            updateChoices(provinceChoices, t('oldProvincePlaceholder'), localizedOldData);
            provinceChoices.enable();

        } catch (error) {
            console.error(error);
            resetChoice(provinceChoices, t('errorLoadOldData'));
            showNotification(error.message, 'error');
        }
    }


    async function loadNewProvincesDropdown() {
        resetChoice(newProvinceChoices, t('newProvinceLoading'));
        try {
            const response = await fetch('/api/new-geo-data');
            if (!response.ok) throw new Error(t('errorFetchNewProvinces'));
            let data = await response.json();
            const localizedData = data.map(province => ({
                ...province,
                name: localize(province.name, province.en_name)
            }));
            updateChoices(newProvinceChoices, t('newProvincePlaceholder'), localizedData, 'province_code', 'name');
            newProvinceChoices.enable();
        } catch (error) {
            console.error(error);
            resetChoice(newProvinceChoices, t('newProvinceError'));
        }
    }

    function toggleLookupUI() {
        isReverseMode = modeToggle.checked;
        forwardControls.classList.toggle('hidden', isReverseMode);
        reverseControls.classList.toggle('hidden', !isReverseMode);
        resultContainer.classList.add('hidden');
        lookupBtn.disabled = true;
        lookupDescription.textContent = isReverseMode ?
            t('lookupDescriptionNewToOld') :
            t('lookupDescriptionOldToNew');

        // --- Reset khung thông tin về trạng thái chờ ---
        resultContainer.classList.add('hidden');
        if (initialInstruction) initialInstruction.classList.remove('hidden');
    }

    // === LẮNG NGHE SỰ KIỆN ===
    function addEventListeners() {
        // === THÊM MỚI: Logic hiển thị và đóng Popup ===
                if (popupOverlay && closePopupBtn) {
                    // 1. Lên lịch hiển thị popup sau 3 giây
                    setTimeout(() => {
                        popupOverlay.classList.remove('hidden');
                    }, 1000); // 1000 mili giây = 1 giây

                    // 2. Hàm để đóng popup
                    const closePopup = () => {
                        popupOverlay.classList.add('hidden');
                    };

                    // 3. Gán sự kiện click cho nút đóng
                    closePopupBtn.addEventListener('click', closePopup);

                }

        if (modeToggle) modeToggle.addEventListener('change', toggleLookupUI);
        if (lookupBtn) lookupBtn.addEventListener('click', () => {
            if (isReverseMode) handleReverseLookup();
            else handleForwardLookup();
        });
        if (mysteryBox) mysteryBox.addEventListener('click', fetchRandomImage);
        //if (resultContainer) resultContainer.addEventListener('click', handleCopy);

        // GHI CHÚ: THAY ĐỔI BẮT ĐẦU TỪ ĐÂY
            // Thay vì gán listener cho 'resultContainer', chúng ta gán cho 'document.body'
            // để xử lý các element được tạo động.
            document.body.addEventListener('click', function(event) {
                // 1. Xử lý cho nút Copy
                const copyButton = event.target.closest('.copy-btn');
                if (copyButton) {
                    handleCopy(event); // Gọi hàm copy như cũ
                    return;
                }

        // 2. Xử lý cho nút đóng/mở thôn/xóm
        const villageToggleButton = event.target.closest('.village-toggle-btn');
        if (villageToggleButton) {
            handleVillageToggle(villageToggleButton);
        }
    });
    // GHI CHÚ: KẾT THÚC THAY ĐỔI

        if (accentToggle) {
            accentToggle.addEventListener('change', () => {
                removeAccents = accentToggle.checked;
                initialize(); // Khởi tạo lại toàn bộ giao diện
            });
        }

        if (provinceSelectEl) provinceSelectEl.addEventListener('choice', (event) => {
            const selectedProvince = allProvincesData.find(p => p.code == event.detail.value);
            if (selectedProvince && selectedProvince.districts) {
                const localizedDistricts = selectedProvince.districts.map(d => ({
                    ...d,
                    name: localize(d.name, null)
                }));
                updateChoices(districtChoices, t('oldDistrictPlaceholder'), localizedDistricts);
            }
            districtChoices.enable();
            resetChoice(communeChoices, t('oldCommunePlaceholder'));
            lookupBtn.disabled = true;
        });
        if (districtSelectEl) districtSelectEl.addEventListener('choice', (event) => {
            const provinceCode = provinceChoices.getValue(true);
            const selectedProvince = allProvincesData.find(p => p.code == provinceCode);
            const selectedDistrict = selectedProvince?.districts.find(d => d.code == event.detail.value);
            if (selectedDistrict && selectedDistrict.wards) {
                const localizedWards = selectedDistrict.wards.map(w => ({
                    ...w,
                    name: localize(w.name, null)
                }));
                updateChoices(communeChoices, t('oldCommunePlaceholder'), localizedWards);
            }
            communeChoices.enable();
            lookupBtn.disabled = true;
        });
        if (communeSelectEl) communeSelectEl.addEventListener('choice', (event) => {
            lookupBtn.disabled = !event.detail.value;
        });

        if (newProvinceSelectEl) newProvinceSelectEl.addEventListener('choice', async (event) => {
            const provinceCode = event.detail.value;
            if (!provinceCode) return;
            resetChoice(newCommuneChoices, t('newCommuneLoading'));
            lookupBtn.disabled = true;
            try {
                const response = await fetch(`/api/new-geo-data?province_code=${provinceCode}`);
                if (!response.ok) throw new Error(t('newCommuneError'));
                let data = await response.json();
                const localizedData = data.map(ward => ({
                    ...ward,
                    name: localize(ward.name, ward.en_name)
                }));
                updateChoices(newCommuneChoices, t('newCommunePlaceholder'), localizedData, 'ward_code', 'name');
                newCommuneChoices.enable();
            } catch (error) {
                console.error(error);
                resetChoice(newCommuneChoices, t('newCommuneError'));
                showNotification(error.message, 'error');
            }
        });
        if (newCommuneSelectEl) newCommuneSelectEl.addEventListener('choice', (event) => {
            lookupBtn.disabled = !event.detail.value;
        });

        // === THÊM MỚI: Các sự kiện cho nút và modal ===
        if (showAdminCentersBtn) {
            showAdminCentersBtn.addEventListener('click', handleShowAdminCenters);
        }
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeModal);
        }
        if (adminCenterModal) {
            // Đóng modal khi click vào lớp phủ bên ngoài
            adminCenterModal.addEventListener('click', (event) => {
                if (event.target === adminCenterModal) {
                    closeModal();
                }
            });
        }
        // === THÊM MỚI: Lắng nghe sự kiện cho form Góp ý ===
        if (feedbackSendBtn) {
            feedbackSendBtn.addEventListener('click', handleSubmitFeedback);
        }
        if (feedbackInput) {
            // Cho phép gửi bằng phím Enter
            feedbackInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    handleSubmitFeedback();
                }
            });
        }
        // === THÊM MỚI: Listener cho switch chính ===
        if (interfaceModeToggle) {
            interfaceModeToggle.addEventListener('change', toggleInterfaceMode);
        }

        // LẮNG NGHE SỰ KIỆN CHIA SẺ
        if (facebookBtn) {
            facebookBtn.addEventListener('click', function(e) {
                e.preventDefault();

                const encodedUrl = encodeURIComponent(urlToShare);
                const encodedQuote = encodeURIComponent(textToShare);

                // URL chia sẻ web luôn được tạo ra, có cả quote và hashtag
                const facebookWebUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedQuote}&hashtag=${encodeURIComponent(hashtag)}`;

                if (isMobile) {
                    // Trên di động: Thử mở app trước
                    const facebookAppUrl = `fb://sharer/link?href=${encodedUrl}`;

                    // Sử dụng logic fallback
                    const startTime = new Date().getTime();
                    window.location.href = facebookAppUrl;

                    setTimeout(function() {
                        const endTime = new Date().getTime();
                        // Nếu không mở được app sau 1.2 giây, fallback ra web
                        if (endTime - startTime < 1200) {
                            window.location.href = facebookWebUrl; // Trên di động, mở cùng tab cho tiện
                        }
                    }, 1000);

                } else {
                    // Trên máy tính: Mở thẳng link web trong tab mới
                    window.open(facebookWebUrl, '_blank', 'noopener,noreferrer');
                }
            });
        }

        // --- SỰ KIỆN CLICK CHO NÚT X (TWITTER) ---
        if (xBtn) {
            xBtn.addEventListener('click', function(e) {
                e.preventDefault();

                const encodedUrl = encodeURIComponent(urlToShare);
                const encodedText = encodeURIComponent(textToShare);

                const xWebUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&via=${accountVia}`;

                if (isMobile) {
                    // Trên di động: Thử mở app
                    const xAppUrl = `twitter://intent/tweet?text=${encodedText}&url=${encodedUrl}&via=${accountVia}`;

                    const startTime = new Date().getTime();
                    window.location.href = xAppUrl;

                    setTimeout(function() {
                        const endTime = new Date().getTime();
                        if (endTime - startTime < 1200) {
                            window.location.href = xWebUrl;
                        }
                    }, 1000);

                } else {
                    // Trên máy tính: Mở thẳng link web trong tab mới
                    window.open(xWebUrl, '_blank', 'noopener,noreferrer');
                }
            });
        }
        // === LOGIC PHÓNG TO ẢNH ĐƠN GIẢN ===
        const qrImages = document.querySelectorAll('.bank-qrcode');
        qrImages.forEach(img => {
        img.addEventListener('click', function() {
            // 1. Tạo lớp phủ (Overlay)
            const overlay = document.createElement('div');
            overlay.className = 'simple-zoom-overlay';

            // 2. Tạo ảnh mới giống hệt ảnh được click
            const zoomedImg = document.createElement('img');
            zoomedImg.src = this.src;
            zoomedImg.alt = this.alt;

            // 3. Gắn ảnh vào overlay và overlay vào body
            overlay.appendChild(zoomedImg);
            document.body.appendChild(overlay);

            // 4. Đóng khi click vào bất cứ đâu trên overlay
            overlay.addEventListener('click', () => {
                overlay.remove(); // Xóa hoàn toàn khỏi DOM
            });
        });
    });

    }

    // CHIA SẺ: Hàm xử lý việc mở app hoặc fallback ra web
    function openAppOrFallback(appUrl, webUrl) {
        // Ghi lại thời điểm bắt đầu
        const startTime = new Date().getTime();
        // Thử mở URL Scheme của app
        window.location.href = appUrl;
        // Đặt một khoảng thời gian chờ
        setTimeout(function() {
            const endTime = new Date().getTime();
            // Nếu không có ứng dụng nào xử lý URL scheme,
            // trang sẽ không bị ẩn đi và thời gian trôi qua sẽ rất ngắn.
            if (endTime - startTime < 1500) {
                // Chuyển hướng đến link web như một phương án dự phòng
                window.open(webUrl, '_blank');
            }
        }, 1000); // 1 giây chờ
    }

/**
 * TẠO HTML CHO PHẦN THAY ĐỔI CẤP THÔN/XÓM CÓ THỂ THU GỌN
 * @param {Array} villageData - Mảng dữ liệu các thôn thay đổi.
 * @param {string} title - Tiêu đề cho nút bấm.
 * @returns {string} - Chuỗi HTML của thành phần hoặc chuỗi rỗng.
 */
function renderVillageChanges(villageData, title) {
    if (!villageData || villageData.length === 0) {
        return ''; // Trả về rỗng nếu không có dữ liệu
    }
    // Tạo ID duy nhất cho mỗi container
    const containerId = `village-container-${Math.random().toString(36).substr(2, 9)}`;
    // Tạo các hàng của bảng
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
                ${title} (${villageData.length} ${t('changes', 'thay đổi')})
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

    // === 2 HÀM TRA CỨU CHÍNH ===
    // handleForwardLookup - Tra cứu xuôi
    // handleReverseLookup - Tra cứu ngược
    // === HÀM TRA CỨU XUÔI (ĐÃ SỬA LỖI CÚ PHÁP) ===
    async function handleForwardLookup() {
        const selectedProvince = provinceChoices.getValue(true);
        const selectedDistrict = districtChoices.getValue(true);
        const selectedCommune = communeChoices.getValue(true);

        if (!selectedProvince || !selectedDistrict || !selectedCommune) {
            alert(t('alertSelectOldCommune'));
            return;
        }
        const oldWardCode = selectedCommune;
        const fullOldAddress = `${communeChoices.getValue().label}, ${districtChoices.getValue().label}, ${provinceChoices.getValue().label}`;
        // --- THÊM LẠI: Tạo biến oldCodes ---
        const oldCodes = `${selectedCommune}, ${selectedDistrict}, ${selectedProvince}`;
        // --- SỬA LẠI: Hiển thị cả địa chỉ và Old Code ---
        let oldAddressHtml = `
            <div class="address-line"><p><span class="label">${t('oldAddressLabel')}</span> ${fullOldAddress}</p></div>
            <div class="address-codes"><span class="label">Old Code:</span> ${oldCodes}</div>`;
        oldAddressDisplay.innerHTML = oldAddressHtml;
        newAddressDisplay.innerHTML = `<p>${t('lookingUp')}</p>`;
        // --- Ẩn hướng dẫn ban đầu đi ---
        if (initialInstruction) initialInstruction.classList.add('hidden');
        resultContainer.classList.remove('hidden');
        if (adminCenterActions) adminCenterActions.classList.add('hidden');

        // 1. KIỂM TRA LỊCH SỬ TĨNH TRƯỚC
        const provinceData = allProvincesData.find(p => p.code == selectedProvince);
        const districtData = provinceData ? provinceData.districts.find(d => d.code == selectedDistrict) : null;
        const wardData = districtData ? districtData.wards.find(w => w.code == oldWardCode) : null;

        if (wardData && wardData.has_history && wardData.history_description) {
            newAddressDisplay.innerHTML = `<p class="history-note">${wardData.history_description}</p>`;
            return;
        }
        // KẾT THÚC KIÊM TRA LỊCH SỬ TỈNH TRƯỚC

        try {
            const response = await fetch(`/api/lookup?code=${oldWardCode}&type=forward`);
            const data = await response.json();
            console.log('API Response:', data); // Kiểm tra dữ liệu API trả về
            console.log('Village Changes:', data.village_changes); // Kiểm tra village_changes
            if (!response.ok) throw new Error(data.error || 'Server error');

            const {
                events,
                village_changes
            } = data;
            const villageHtml = renderVillageChanges(village_changes, t('villageChangesTitle', 'Thay đổi cấp Thôn/Tổ dân phố:'));

            if (events.length === 0) {
                // Trường hợp không có sự kiện sáp nhập xã, nhưng có thể có thay đổi thôn
                let noChangeHtml = `<p class="no-change">${t('noChangeMessage')}</p>`;
                newAddressDisplay.innerHTML = noChangeHtml + villageHtml;
            } else if (events.length > 1 || (events[0] && events[0].event_type === 'SPLIT_MERGE')) {
                // Trường hợp chia tách
                const splitHtml = events.map(result => {
                    const newAddress = `${result.new_ward_name}, ${result.new_province_name}`;
                    const newCodes = `${result.new_ward_code}, ${result.new_province_code}`;
                    return `
                    <li>
                         ${newAddress}
                         <div class="split-description">${result.split_description}</div>
                        <div class="address-codes"><span class="label">New Code:</span> ${newCodes}</div>
                    </li>`;
                }).join('');
                newAddressDisplay.innerHTML = `<p class="split-case-note">${t('splitCaseNote')}</p><ul class="split-results-list">${splitHtml}</ul>` + villageHtml;
            } else {
                // Trường hợp sáp nhập đơn giản
                const finalUnitData = events[0];
                const newAddressForDisplay = `${finalUnitData.new_ward_name}, ${finalUnitData.new_province_name}`;
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

            // Kích hoạt nút xem TTHC nếu có sự kiện sáp nhập
            if (events.length > 0) {
                newWardCodeForModal = events[0].new_ward_code;
                newProvinceCodeForModal = events[0].new_province_code;
                if (adminCenterActions) adminCenterActions.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Lỗi khi tra cứu xuôi:', error);
            newAddressDisplay.innerHTML = `<p class="error">${error.message}</p>`;
        }
    }

    // Hàm xử lý tra cứu ngược
    async function handleReverseLookup() {
        const selectedNewProvince = newProvinceChoices.getValue();
        const selectedNewCommune = newCommuneChoices.getValue();
        if (!selectedNewCommune || !selectedNewCommune.value) {
            alert(t('alertSelectNewCommune'));
            return;
        }
        const newWardCode = selectedNewCommune.value;
        const fullNewAddress = `${selectedNewCommune.label}, ${selectedNewProvince.label}`;

        oldAddressDisplay.innerHTML = '';
        newAddressDisplay.innerHTML = `<p>${t('lookingUp')}</p>`;
        if (historyDisplay) historyDisplay.classList.add('hidden'); // Ẩn lịch sử cũ
        if (adminCenterActions) adminCenterActions.classList.add('hidden'); // Ẩn nút hành chính
        // --- Ẩn hướng dẫn ban đầu đi ---
        if (initialInstruction) initialInstruction.classList.add('hidden');
        resultContainer.classList.remove('hidden');
        // Reset biến trạng thái
        newWardCodeForModal = null;
        newProvinceCodeForModal = null;

        try {
            const response = await fetch(`/api/lookup?code=${newWardCode}&type=reverse`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Server error');

            if (data && data.length > 0) {
                // Hiển thị thông tin địa chỉ mới (phần trên)
                const newCodesReverse = `${data[0].new_ward_code}, ${data[0].new_province_code}`;
                const newAddressForCopy = `${fullNewAddress} (Codes: ${newCodesReverse})`;
                let newAddressHtml = `
                                                            <div class="address-line">
                                                                <p><span class="label">${t('newAddressLabel').replace(':', '')}</span> ${fullNewAddress}</p>
                                                                <button class="copy-btn" title="Copy" data-copy-text="${newAddressForCopy}">${copyIconSvg}</button>
                                                            </div>
                                                            <div class="address-codes"><span class="label">New Code:</span> ${newCodesReverse}</div>`;
                // Hiển thị thông tin địa chỉ cũ (phần dưới)
                oldAddressDisplay.innerHTML = newAddressHtml;

                // Xây dựng danh sách các đơn vị cũ
                const oldUnitsFullAddresses = data.map(record => {
                    let noteHtml = '';
                    if (record.event_type === 'SPLIT_MERGE' && record.split_description) {
                        noteHtml = `<div class="split-context-note">${record.split_description}</div>`;
                    }
                    //const ward = record.old_ward_name;
                    //const district = record.old_district_name;
                    //const province = record.old_province_name;
                    const fullOldAddress = `${record.old_ward_name}, ${record.old_district_name}, ${record.old_province_name}`;
                    const oldCodes = `${record.old_ward_code}, ${record.old_district_code}, ${record.old_province_code}`;
                    const villageHtml = renderVillageChanges(record.village_changes, `${t('changes', 'thay đổi tại')} ${record.old_ward_name}`);
                    return `
                                        <li>
                                            ${fullOldAddress}
                                            <div class="address-codes"><span class="label">Old Code:</span> ${oldCodes}</div>
                                            ${noteHtml}
                                            ${villageHtml}
                                        </li>`;
                }).join('');
                newAddressDisplay.innerHTML = `<p class="label">${t('mergedFromLabel')}</p><ul class="old-units-list">${oldUnitsFullAddresses}</ul>`;

                //Cập nhật lại các biến modal
                newWardCodeForModal = data[0].new_ward_code;
                newProvinceCodeForModal = data[0].new_province_code;
                if (adminCenterActions) adminCenterActions.classList.remove('hidden');
            } else {
                oldAddressDisplay.innerHTML = `<div class="address-line"><p><span class="label">${t('newAddressLabel').replace(':', '')}</span> ${fullNewAddress}</p></div>`;
                newAddressDisplay.innerHTML = `<p class="no-change">${t('noDataFoundMessage')}</p>`;
            }
        } catch (error) {
            console.error('Lỗi khi tra cứu ngược:', error);
            oldAddressDisplay.innerHTML = '';
            newAddressDisplay.innerHTML = `<p class="error">${error.message}</p>`;
        }
    }

 /**
 * Xử lý việc đóng/mở khối thông tin thôn/xóm.
 * @param {HTMLElement} button - Nút bấm được click.
 */
function handleVillageToggle(button) {
    button.classList.toggle('active'); // Để xoay mũi tên
    const content = button.nextElementSibling; // Lấy phần nội dung ngay sau nút bấm

    if (content.style.maxHeight) {
        // Nếu đang mở, thì đóng lại
        content.style.maxHeight = null;
        button.setAttribute('aria-expanded', 'false');
    } else {
        // Nếu đang đóng, thì mở ra
        // scrollHeight là chiều cao thực tế của nội dung
        content.style.maxHeight = content.scrollHeight + 'px';
        button.setAttribute('aria-expanded', 'true');
    }
}

    // === XỬ LÝ GÓP Ý - FEEDBACK ===
    async function handleSubmitFeedback() {
        if (!feedbackInput || !feedbackSendBtn || !feedbackMessage) return;

        const message = feedbackInput.value.trim();
        if (message.length === 0) {
            return; // Không làm gì nếu input rỗng
        }
        const context = {};

        // Xác định chế độ tra cứu hiện tại
        context.mode = isReverseMode ? 'Tra cứu ngược' : 'Tra cứu xuôi';

        // Lấy thông tin từ các dropdown đang được chọn
        if (isReverseMode) {
            const newProvince = newProvinceChoices.getValue();
            if (newProvince) {
                context.province = {
                    code: newProvince.value,
                    name: newProvince.label
                };
            }
            const newCommune = newCommuneChoices.getValue();
            if (newCommune) {
                context.commune = {
                    code: newCommune.value,
                    name: newCommune.label
                };
            }
        } else {
            const oldProvince = provinceChoices.getValue();
            if (oldProvince) {
                context.province = {
                    code: oldProvince.value,
                    name: oldProvince.label
                };
            }
            const oldDistrict = districtChoices.getValue();
            if (oldDistrict) {
                context.district = {
                    code: oldDistrict.value,
                    name: oldDistrict.label
                };
            }
            const oldCommune = communeChoices.getValue();
            if (oldCommune) {
                context.commune = {
                    code: oldCommune.value,
                    name: oldCommune.label
                };
            }
        } // Kết thúc thu thập ngữ cảnh
        // Vô hiệu hóa form để tránh gửi nhiều lần
        feedbackSendBtn.disabled = true;
        feedbackInput.disabled = true;
        feedbackSendBtn.textContent = '...';

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    context: context
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Lỗi không xác định');
            }

            // Hiển thị thông báo thành công
            feedbackMessage.textContent = t('feedbackSuccess', 'Gửi thành công!');
            feedbackMessage.className = 'success';
            feedbackMessage.classList.remove('hidden');
            feedbackInput.value = ''; // Xóa nội dung input

        } catch (error) {
            console.error('Lỗi khi gửi góp ý:', error);
            // Hiển thị thông báo lỗi
            feedbackMessage.textContent = t('feedbackError', 'Gửi thất bại.');
            feedbackMessage.className = 'error';
            feedbackMessage.classList.remove('hidden');
        } finally {
            setTimeout(() => {
                feedbackSendBtn.disabled = false;
                feedbackInput.disabled = false;
                feedbackSendBtn.textContent = t('feedbackSendBtn', 'Gửi');
                feedbackMessage.classList.add('hidden');
            }, 4000);
        }
    }

    // === HÀM PHỤ TRỢ KHÁC ===
    function handleCopy(event) {
        const button = event.target.closest('.copy-btn');
        if (!button) return;
        const textToCopy = button.dataset.copyText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            button.innerHTML = copiedIconSvg;
            button.classList.add('copied');
            button.disabled = true;
            setTimeout(() => {
                button.innerHTML = copyIconSvg;
                button.classList.remove('copied');
                button.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Lỗi khi copy: ', err);
        });
    }
    // Tải ảnh ngẩu nhiên từ unsplash và hiển thị trong mysteryBox ở giao diện tiếng Anh
    async function fetchRandomImage() {
        if (!mysteryBox || !spinner) return;
        spinner.classList.remove('hidden');
        mysteryBox.classList.add('loading-state');
        const oldImg = mysteryBox.querySelector('img');
        if (oldImg) oldImg.style.opacity = '0.3';

        const apiUrl = `https://api.unsplash.com/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&query=vietnam&orientation=portrait`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Unsplash API error');
            const data = await response.json();
            const newImage = new Image();
            newImage.src = data.urls.regular;
            newImage.alt = data.alt_description || "Random image from Unsplash";
            newImage.style.opacity = '0';
            newImage.onload = () => {
                mysteryBox.innerHTML = '';
                mysteryBox.appendChild(newImage);
                setTimeout(() => {
                    newImage.style.opacity = '1';
                }, 50);
                mysteryBox.classList.remove('loading-state');
            };
            newImage.onerror = () => {
                throw new Error("Could not load image file.");
            }
        } catch (error) {
            console.error("Error fetching image:", error);
            mysteryBox.innerHTML = `<p style="color: red; font-size: 0.9em;">Could not load image.</p>`;
        }
    }
    // Hiển thị lượt tra cứu từ GOOGLE ANALYTICS
    async function displayEventCount() {
        const counterElement = document.getElementById('event-counter');
        if (!counterElement) return;

        try {
            const response = await fetch('/api/ga-stats?report=events');
            if (!response.ok) throw new Error('Failed to fetch event count');
            const data = await response.json();

            if (data.totalClicks) {
                // Sử dụng toLocaleString để định dạng số cho đẹp
                const formattedCount = data.totalClicks.toLocaleString(currentLang === 'vi' ? 'vi-VN' : 'en-US');
                // Kết hợp số và nhãn đã dịch
                counterElement.textContent = `${formattedCount} ${t('realtimeTotalLookups', 'lượt tra cứu')}`;
            }
        } catch (error) {
            console.error("Không thể hiển thị số lượt tra cứu:", error);
            counterElement.textContent = `N/A ${t('realtimeTotalLookups', 'lượt tra cứu')}`;
        }
    }

    // Lấy và hiển thị dữ liệu người truy cập thời gian thực GOOGLE ANALYTICS
    async function displayRealtimeLocations() {
        const listElement = document.getElementById('realtime-locations-list');
        const totalUsersElement = document.getElementById('realtime-total-users');
        if (!listElement || !totalUsersElement) return;

        const oldContent = listElement.innerHTML;
        // Chỉ hiển thị "Đang tải..." lần đầu tiên
        if (listElement.children.length === 0 || !listElement.textContent.includes(t('realtimeLoading', 'Đang tải...'))) {
            listElement.innerHTML = `<li>${t('realtimeLoading', 'Đang tải...')}</li>`;
        }

        try {
            const response = await fetch('/api/ga-stats?report=realtime');
            if (!response.ok) throw new Error('Failed to fetch realtime locations');
            const data = await response.json();

            if (data.totalActiveUsers !== undefined) {
                const formattedTotal = data.totalActiveUsers.toLocaleString(currentLang === 'vi' ? 'vi-VN' : 'en-US');
                totalUsersElement.textContent = `${formattedTotal} ${t('realtimeTotalUsers', 'người dùng trực tuyến')}`;
            }

            if (data.activeLocations && data.activeLocations.length > 0) {
                listElement.innerHTML = '';
                data.activeLocations.forEach(location => {
                    const li = document.createElement('li');
                    const translatedCity = t(`city_${location.city.toLowerCase().replace(/ /g, '_')}`, location.city);
                    let locationDisplay = translatedCity;
                    if (location.country && location.country !== 'Vietnam') {
                        const translatedCountry = t(`country_${location.country.toLowerCase().replace(/ /g, '_')}`, location.country);
                        locationDisplay = `${translatedCity} - ${translatedCountry}`;
                    }
                    const userText = t('realtimeUserFrom', '{count} người dùng từ').replace('{count}', location.count);
                    li.innerHTML = `${userText} <strong>${locationDisplay}</strong>`;
                    listElement.appendChild(li);
                });
            } else {
                listElement.innerHTML = `<li>${t('realtimeNoActivity', 'Chưa có hoạt động nào gần đây.')}</li>`;
            }
        } catch (error) {
            console.error("Không thể hiển thị hoạt động thời gian thực:", error);
            listElement.innerHTML = oldContent || `<li>${t('realtimeError', 'Không thể tải dữ liệu.')}</li>`;
        }
    }

    //Các hàm chức năng Xem địa chỉ hành chính
    function openModal() {
        if (adminCenterModal) {
            adminCenterModal.classList.remove('hidden');
        }
    }

    function closeModal() {
        if (adminCenterModal) {
            adminCenterModal.classList.add('hidden');
        }
    }

    async function handleShowAdminCenters() {
        // Biến newWardCodeForModal và newProvinceCodeForModal sẽ được gán trong các hàm tra cứu.
        if (!window.newWardCodeForModal || !window.newProvinceCodeForModal) {
            console.error("Thiếu mã xã hoặc tỉnh để tra cứu trung tâm hành chính.");
            return;
        }

        openModal();
        modalBody.innerHTML = `<p>${t('loading', 'Đang tải...')}</p>`;

        try {
            const response = await fetch(`/api/get-admin-centers?ward_code=${window.newWardCodeForModal}&province_code=${window.newProvinceCodeForModal}`);

            if (!response.ok) throw new Error('Could not fetch administrative centers.');
            const data = await response.json();

            if (data.length > 0) {
                const listHtml = data.map(item => {
                    // 1. Xây dựng khóa dịch, ví dụ: "agency_ubnd"
                    const translationKey = `agency_${item.agency_type.toLowerCase()}`;
                    // 2. Dùng hàm t() để lấy bản dịch.
                    //    Nếu không có, dùng lại giá trị gốc và viết hoa chữ cái đầu.
                    const fallbackName = item.agency_type.charAt(0).toUpperCase() + item.agency_type.slice(1);
                    const agencyName = t(translationKey, fallbackName);
                    // ==========================================================
                    return `
                        <li>
                            <span class="agency-type">${agencyName}</span>
                            <span class="agency-address">${item.address}</span>
                        </li>
                    `;
                }).join('');
                modalBody.innerHTML = `<ul>${listHtml}</ul>`;
            } else {
                modalBody.innerHTML = `<p>${t('noAdminCenterData', 'Không có dữ liệu.')}</p>`;
            }

        } catch (error) {
            console.error("Lỗi khi lấy địa chỉ TTHC:", error);
            modalBody.innerHTML = `<p class="error">${error.message}</p>`;
        }
    }

    // --- KHỞI CHẠY ỨNG DỤNG ---
    initialize();
});