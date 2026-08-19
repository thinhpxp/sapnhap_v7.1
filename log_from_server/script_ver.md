thinhpxp@192 :~ $ grep -n "enableChoice\| handleNewProvinceChange\| new_province_code" /var/www/sapnhap/script.js | head -20
function enableChoice(choicesInstance, selectEl) {
updateChoices(newProvinceChoices, t('newProvincePlaceholder', 'Chon Tinh/Thanh pho (Moi)'), localizedData, 'new_province_code', 'name');
enableChoice(newProvinceChoices, newProvinceSelectEl);
const handleNewProvinceChange = async (event) => {
enableChoice(newCommuneChoices, newCommuneSelectEl);
newProvinceSelectEl. addEventListener('choice', handleNewProvinceChange);
newProvinceSelectEl. addEventListener('change', handleNewProvinceChange);
const newCodes = ${result.new_ward_code}, ${result.new_province_code}';
const newCodes = ${finalUnitData.new_ward_code}, ${finalUnitData.new_province_code}';
newProvinceCodeForModal = events[0].new_province_code;
const newCodesReverse = ${data[0].new_ward_code}, ${data[0].new_province_code};
newProvinceCodeForModal = data[0].new_province_code;