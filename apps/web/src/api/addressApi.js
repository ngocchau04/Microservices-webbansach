const ADDRESS_API_BASE = "https://provinces.open-api.vn/api/v2";

const fetchAddressJson = async (path) => {
  const response = await fetch(`${ADDRESS_API_BASE}${path}`);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || `Address request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

export const listProvincesV2 = async () => {
  const payload = await fetchAddressJson("/p/");
  return Array.isArray(payload) ? payload : [];
};

export const listDistrictsByProvinceV2 = async (provinceCode) => {
  if (!provinceCode) return [];
  const payload = await fetchAddressJson(`/p/${provinceCode}?depth=2`);
  return Array.isArray(payload?.districts) ? payload.districts : [];
};

export const listWardsByDistrictV2 = async (districtCode) => {
  if (!districtCode) return [];
  const payload = await fetchAddressJson(`/d/${districtCode}?depth=2`);
  return Array.isArray(payload?.wards) ? payload.wards : [];
};

export const listWardsByProvinceV2 = async (provinceCode) => {
  if (!provinceCode) return [];

  const payload = await fetchAddressJson(`/p/${provinceCode}?depth=2`);

  if (Array.isArray(payload?.wards)) {
    return payload.wards;
  }

  const districts = Array.isArray(payload?.districts) ? payload.districts : [];
  return districts.flatMap((district) =>
    Array.isArray(district?.wards) ? district.wards : []
  );
};
