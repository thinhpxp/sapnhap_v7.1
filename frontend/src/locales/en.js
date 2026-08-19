// locales/en.js — English translations
export const en = {
  // SEO & Metadata
  pageTitle: 'Vietnam Administrative Unit Merger Lookup 2025',
  pageDescription: 'A fast, accurate lookup tool for merged and renamed commune-level administrative units in Vietnam (2023-2025).',

  // Header
  mainHeading: 'ADMINISTRATIVE UNIT MERGER LOOKUP',
  subHeading: 'Merger database from July 1, 2025 to present',
  langSwitch: 'Tiếng Việt',
  langSwitchUrl: '/vi',

  // Mode tabs
  modeOldToNew: 'Old → New',
  modeNewToOld: 'New → Old',
  modeQuickSearch: 'Quick Search',
  lookupDescriptionOldToNew: 'Select an old address to find the corresponding new administrative unit.',
  lookupDescriptionNewToOld: 'Select a new address to find the corresponding old administrative units.',

  // Forward lookup form
  oldProvinceLabel: 'Province / City (Old)',
  oldDistrictLabel: 'District / County (Old)',
  oldCommuneLabel: 'Commune / Ward (Old)',
  oldProvincePlaceholder: 'Select or type Province/City...',
  oldDistrictPlaceholder: 'Select or type District/County...',
  oldCommunePlaceholder: 'Select or type Commune/Ward...',
  selectDistrictFirst: 'Please select a Province first',
  selectCommuneFirst: 'Please select a District first',
  alertSelectOldCommune: 'Please select Province, District, and Commune.',

  // Reverse lookup form
  newProvinceLabel: 'Province / City (New)',
  newCommuneLabel: 'Commune / Ward / Town (New)',
  newProvincePlaceholder: 'Select or type new Province/City...',
  newCommunePlaceholder: 'Select or type new Commune/Ward...',
  newProvinceLoading: 'Loading new provinces...',
  newCommuneLoading: 'Loading new wards...',
  newProvinceError: 'Error loading new provinces.',
  newCommuneError: 'Error loading new wards.',
  alertSelectNewCommune: 'Please select a new Province and Commune.',

  // Quick search
  quickSearchOldLabel: 'Search by old commune/ward name',
  quickSearchNewLabel: 'Search by new commune/ward name',
  quickSearchOldPlaceholder: 'Type old commune/ward name...',
  quickSearchNewPlaceholder: 'Type new commune/ward name...',
  quickSearchNoResult: 'No results found.',
  quickSearchMinChars: 'Enter at least 2 characters to search.',

  // Buttons
  lookupButton: 'Look Up',
  lookingUp: 'Looking up...',
  copyAddress: 'Copy',
  copied: 'Copied!',
  showAdminCentersBtn: 'View Administrative Center Addresses',

  // Results
  resultsTitle: 'Lookup Results',
  oldAddressLabel: 'Old Address',
  newAddressLabel: 'New Address',
  mergedFromLabel: 'Previously merged from',
  noChangeMessage: 'This address has no merger information. The name remains unchanged.',
  noDataFoundMessage: 'This is a new administrative unit. No data found for constituent old units.',
  splitCaseNote: 'This unit was split and merged into multiple locations',
  villageChangesTitle: 'Village / Quarter changes',
  codeLabel: 'Code',

  // Right panel initial state
  instructionTitle: 'Start your lookup',
  instructionText: 'Select a lookup mode and fill in the address details on the left to see merger results.',

  // Admin Centers Modal
  modalTitle: 'Administrative Center Addresses',
  noAdminCenterData: 'Information being updated. If you know the address, please send us a message!',
  agency_ubnd: "People's Committee",
  agency_hdnd: "People's Council",
  agency_mttq: 'Vietnam Fatherland Front',
  agency_ttpvhcc: 'Public Administration Service Center',
  agency_dang_uy: 'Party Committee',
  agency_cong_an_xa: 'Commune Police Station',

  // Analytics
  realtimeTotalUsers: 'users online',
  realtimeTotalLookups: 'total lookups',

  // Footer
  footerHome: 'Home',
  footerAbout: 'About',
  footerContact: 'Contact',
  footerPolicies: 'Policies',
  blogLinkText: 'Read our blog for details on the 34 new provinces.',
  footerCopyright: 'Version 8.1 © 2026. Administrative unit merger database of Vietnam.',

  // Zalo
  zaloContact: 'Contact support via Zalo',

  // Errors
  errorLoading: 'Error loading data. Please try again.',
  serverError: 'Server error. Please try again later.',
};
