# SUNMI Customer API - Network Management Module Specification

## Proposed Seam

- **NetworkManager Seam (`INetworkManager`)**: Seam nằm ở interface `sTmsApi.getNetworkManager()`. Interface này bao bọc 52 API điều khiển mạng chuyên sâu (Dữ liệu SIM slot 1/2, Data Roaming, Wi-Fi Static IP v2, Wi-Fi Hotspot, Ethernet, Chứng chỉ WLAN/VPN, Wi-Fi Whitelist, APN V3 CRUD, IP Routing Policy và Thông số Cellular Network). Seam cho phép giả lập mọi cấu hình và phản hồi kết nối mạng trong unit test mà không làm ngắt kết nối mạng thực tế.

## Problem Statement

Các ứng dụng POS/Kiosk và thiết bị thương mại SUNMI hoạt động trong môi trường chuỗi cửa hàng cần quản lý mạng phức tạp: cấu hình IP Tĩnh Wi-Fi (`setWifiStaticIpV2`), phát Wi-Fi Hotspot cho thiết bị phụ, tự động chuyển đổi SIM có sóng tốt (`setDataAutoSwitch`), quản lý danh sách Wi-Fi Whitelist (trên L2sPro), cài đặt chứng chỉ bảo mật doanh nghiệp (WLAN/VPN certs), cấu hình điểm truy cập APN V3 (`SunmiApnSetting`), và tạo tuyến định hướng IP (Outbound IP Route Policy). Việc thiếu đặc tả tập trung kèm mã nguồn mẫu cho 52 API thuộc `Network Management Module` sẽ gây cản trở lớn khi triển khai hạ tầng mạng.

## Solution

Cung cấp đặc tả kỹ thuật toàn diện cho `Network Management Module` thuộc SUNMI Customer API SDK. Tài liệu phân loại 52 APIs thành 7 nhóm chức năng, hướng dẫn chi tiết các tham số Subnet prefix length, cấu hình mã hóa Hotspot, quy trình xử lý APN V3, và cung cấp mã nguồn mẫu Java hoàn chỉnh cho từng tính năng.

## User Stories

1. As a Store Network Administrator, I want to configure static Wi-Fi IP settings (`setWifiStaticIpV2`) with DNS and gateway, so that POS terminals maintain fixed IP addresses on the local store network.
2. As a Kiosk Developer, I want to create a Wi-Fi Hotspot (`turnOnWifiHotspot`) to share internet access with customer displays or secondary payment readers.
3. As a Mobile Fleet Manager, I want to automatically switch between dual SIM cards based on signal strength (`setDataAutoSwitch`) and manage APN configurations (`addApnV3`, `setPreferApnBySlotIndex`), so that cellular connectivity remains stable in moving vehicles.
4. As a Enterprise Security Officer, I want to enforce a Wi-Fi Whitelist (`addSsidToWifiSsidWhiteList`) and install VPN/WLAN certificates (`installVPNAndAppUserCertificate`), so that devices only connect to corporate-approved wireless networks.
5. As a Network Systems Engineer, I want to set outbound IP routing rules (`requestRouteToIp`) and query cellular network parameters (`getCellularNetworkInfoBySlotIndex`), so that data traffic is routed correctly over multi-interface networks.

## Implementation Decisions

### 1. Phân nhóm 52 APIs thuộc `Network Management Module`

#### Group 1: Quản lý Dữ liệu Di động & Thẻ SIM (Mobile Data & Dual SIM)

- `enableMobileNetwork(slotIdx, enable)`, `getMobileDataStatusBySlot()`, `getMobileDataStatus()`: Bật/Tắt dữ liệu di động theo slot SIM (Slot 0 / Slot 1).
- `getDefaultDataSlotIndex()`, `setDefaultDataSlotIndex(slotIndex)`: Đọc / Đặt khe SIM dữ liệu mặc định.
- `setMobileDataLocked(locked)`: Khóa / Mở nút dữ liệu di động trong Cài đặt hệ thống.
- `getDataRoamingEnabled(slotIndex)`, `setDataRoamingEnabled(slotIndex, enable)`: Quản lý Data Roaming cho từng slot.
- `setDataAutoSwitch(enable)`: Tự động chuyển đổi SIM khi tín hiệu yếu (P3).
- `isActiveSlotIndex(slotIndex)`: Kiểm tra khe SIM có đang khả dụng không.

#### Group 2: Cấu hình Wi-Fi, IP Tĩnh & Ethernet (Wi-Fi, Static IP & Ethernet)

- `enableWIFI(isEnable)`: Bật/Tắt Wi-Fi.
- `setWifiStaticIpV2(status, ipAddr, gateway, networkPrefixLength, dns1, dns2, reconnect, callback)`: Đặt IP Tĩnh Wi-Fi.
- `connectWifiSsid(ssid, callback)`, `removeWifiSsid(ssid, callback)`, `forgetSavedWifi()`: Kết nối, xóa hoặc quên Wi-Fi đã lưu.
- `addNetwork(bundle)`, `updateNetwork(bundle)`, `removeNetwork(networkId)`, `getConfiguredNetworks()`: Thêm/Sửa/Xóa/Lấy danh sách Wi-Fi lưu trong SDK.
- `addWifiSsidByWifiConfiguration(wifiConfiguration, callback)`: Thêm Wi-Fi qua cấu hình `WifiConfigurationInfo`.
- `enableEthernet(enable)`: Bật/Tắt kết nối mạng dây Ethernet.
- `resetNetworkSettings()`: Đặt lại toàn bộ cấu hình mạng (Reset WLAN).

#### Group 3: Phát Wi-Fi Hotspot (SoftAP Hotspot Management)

- `turnOnWifiHotspot(ssid, preShareKey, keyManagement)`: Bật phát Wi-Fi Hotspot.
- `turnOffWifiHotspot()`: Tắt phát Wi-Fi Hotspot.
- `isWifiHotspotEnable()`: Kiểm tra trạng thái Hotspot.
- `showWifiHotspotSettings()`, `disableWifiHotspotAndHideSettings()`: Hiện/Ẩn menu cài đặt Hotspot.

#### Group 4: Danh sách Trắng Wi-Fi Whitelist (L2sPro Customization)

- `enableWifiSsidWhiteList(enable)`, `isWifiSsidWhiteListEnabled()`: Bật/Tắt tính năng Wi-Fi Whitelist.
- `addSsidToWifiSsidWhiteList(ssidList)`, `removeSsidFromWifiSsidWhiteList(ssidList)`, `getWifiSsidWhiteList()`: Thêm/Xóa/Đọc danh sách Wi-Fi SSID được phép kết nối.

#### Group 5: Quản lý APN V3 (APN Point Access Management)

- `addApnV3(sunmiApnSettings)`, `deleteApnV3()`, `updateApnV3()`, `getApnListV3()`: Thêm, xóa, cập nhật, truy vấn cấu hình APN.
- `setApnV3(apnId)`, `getCurrentApnV3()`: Đặt / Đọc APN mặc định khi cắm SIM.
- `setPreferApnBySlotIndex(slotIndex, apn_id)`, `queryPreferApnBySlotIndex(slotIndex)`: Quản lý APN ưu tiên cho từng khe SIM.

#### Group 6: Định tuyến Mạng & Chứng chỉ Bảo mật (IP Routing & Security Certs)

- `requestRouteToIp(ip, network, action)`, `getRequestRouteIps()`: Cấu hình / Đọc chính sách định tuyến IP đầu ra (Outbound Route Policy).
- `installWlanCertificate()`, `installVPNAndAppUserCertificate()`: Cài đặt chứng chỉ WLAN và VPN/App User Certs.
- `setCustomNtpServer()`, `getCustomNtpServer()`: Đặt / Đọc máy chủ đồng bộ giờ NTP custom.
- `enableMDnsDomainNameChangeToSN()`, `isMDnsDomainNameChangeToSNEnabled()`: Bật/Tắt mDNS service hiển thị SN làm localhostname.

#### Group 7: Thống kê Dung lượng & Thông số Mạng Di động (Traffic & Cellular Info)

- `getTrafficOfEachApp()`, `queryTrafficUsageSummary()`: Thống kê lưu lượng mạng theo ứng dụng và tổng quan.
- `getCellularNetworkInfoBySlotIndex(slotIndex)`, `getCellularNetworkInfoBySubId(subId)`: Truy xuất thông số mạng di động chi tiết (`CellularNetworkInfo`).

---

### 2. Sample Code - Mã nguồn mẫu chi tiết cho từng tính năng

#### 2.1 Cấu hình Wi-Fi IP Tĩnh (`setWifiStaticIpV2`)

```java
try {
    // status = true (Static IP), false (DHCP)
    // networkPrefixLength: 24 tương ứng Subnet Mask 255.255.255.0
    sTmsApi.getNetworkManager().setWifiStaticIpV2(
        true,
        "192.168.1.150",
        "192.168.1.1",
        24,
        "8.8.8.8",
        "8.8.4.4",
        true, // reconnect
        new IUnifiedCallback.Stub() {
            @Override
            public void onCall(String result) throws RemoteException {
                try {
                    JSONObject json = new JSONObject(result);
                    int resultCode = json.getInt("resultCode"); // 0: Success, -1: Fail
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
        }
    );
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.2 Bật phát Wi-Fi Hotspot (`turnOnWifiHotspot`)

```java
try {
    String hotspotSsid = "SUNMI_POS_HOTSPOT";
    String hotspotPwd  = "88888888";

    // keyManagement: 1 tương ứng SECURITY_TYPE_WPA2_PSK
    sTmsApi.getNetworkManager().turnOnWifiHotspot(hotspotSsid, hotspotPwd, 1);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.3 Thêm & Đặt APN V3 Mặc định (`addApnV3` & `setPreferApnBySlotIndex`)

```java
try {
    SunmiApnSetting apn = new SunmiApnSetting();
    apn.name = "Custom Enterprise APN";
    apn.mcc = "460";
    apn.mnc = "01";
    apn.apn = "vnmnet";

    List<SunmiApnSetting> list = new ArrayList<>();
    list.add(apn);

    // 1. Thêm APN mới vào hệ thống
    int addResult = sTmsApi.getNetworkManager().addApnV3(list);

    // 2. Đặt APN ưu tiên cho Khe SIM 1 (Slot Index 0)
    if (addResult == 0) {
        sTmsApi.getNetworkManager().setPreferApnBySlotIndex(0, apn._id);
    }
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.4 Quản lý Danh sách Trắng Wi-Fi Whitelist (L2sPro)

```java
try {
    // 1. Bật tính năng Wi-Fi Whitelist
    sTmsApi.getNetworkManager().enableWifiSsidWhiteList(true);

    // 2. Thêm danh sách SSID được phép kết nối
    List<String> allowedSsids = new ArrayList<>();
    allowedSsids.add("STORE_WIFI_PRIMARY");
    allowedSsids.add("STORE_WIFI_BACKUP");

    sTmsApi.getNetworkManager().addSsidToWifiSsidWhiteList(allowedSsids);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.5 Định cấu hình Tuyến định hướng IP Đầu ra (`requestRouteToIp`)

```java
try {
    // network: 0 (Cellular), 1 (Wi-Fi), 9 (Ethernet)
    // action: true (Add Route), false (Delete Route)
    // Đẩy toàn bộ lưu lượng tới dải IP 192.168.2.0 ra cổng mạng dây Ethernet (network = 9)
    int routeResult = sTmsApi.getNetworkManager().requestRouteToIp("192.168.2.0", 9, true);

    // Truy vấn danh sách IP Route đã thêm
    Map routeMap = sTmsApi.getNetworkManager().getRequestRouteIps();
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.6 Đọc Thông số Mạng Di động Chi tiết (`getCellularNetworkInfoBySlotIndex`)

```java
try {
    // Đọc thông số kỹ thuật mạng di động của SIM Slot 1 (Index 0)
    CellularNetworkInfo info = sTmsApi.getNetworkManager().getCellularNetworkInfoBySlotIndex(0);
    if (info != null) {
        int rsrp = info.rsrp;             // Cường độ tín hiệu (dBm)
        int signalLevel = info.signalLevel; // Mức sóng 0-4
        String operator = info.operatorName;// Tên nhà mạng (e.g. "Viettel")
        int currentType = info.currentNetworkType; // 4G/5G Network Type
    }
} catch (Exception e) {
    e.printStackTrace();
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi các callback `IUnifiedCallback` thành công và xử lý ném lỗi `RemoteException`.
- **Modules Kiểm thử**: `WifiStaticIpConfigurator`, `HotspotManager`, `ApnV3Controller`, `IpRoutePolicyManager`.
- **Seam Strategy**: Giả lập `INetworkManager` để test các tình huống lỗi mạng trả về `-40` (API không hỗ trợ trên ROM) hoặc `-2` (Invalid Cert/Parameters) trong Unit Test.

## Out of Scope

- Thay đổi cấu hình chip Wi-Fi/Bluetooth ở tầng phần cứng Driver Kernel.
- Bypass mã hóa WPA3-Enterprise nếu không có chứng chỉ WLAN hợp lệ.

## Further Notes

- **Lưu ý Hotspot**: Trên Android 7.1 trở xuống, bật Hotspot sẽ tự động tắt Wi-Fi. Trên Android 10 trở lên, thiết bị SUNMI hỗ trợ chạy song song cả Wi-Fi và Hotspot (Concurrent SoftAP mode).
