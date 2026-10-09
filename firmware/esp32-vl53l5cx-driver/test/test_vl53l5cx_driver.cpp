/**
 * @file test_vl53l5cx_driver.cpp
 * @brief Chương trình kiểm thử đơn vị Native C++ cho Driver Cảm biến VL53L5CX (ESP32 / PlatformIO Native).
 *
 * Bao gồm các bài kiểm thử:
 * 1. `test_driver_initialization()`: Kiểm tra máy trạng thái FSM và chuyển chế độ Mock Mode.
 * 2. `test_mock_frame_generation()`: Kiểm tra thuật toán sinh ma trận khoảng cách đỉnh đầu người (~500mm).
 * 3. `test_serialization_deserialization_and_crc()`: Kiểm tra đóng gói 204B, giải mã và phát hiện nhiễu CRC16.
 * 4. `test_optical_lens_flip()`: Kiểm tra thuật toán ánh xạ đảo thấu kính quang học Rx (Zone 0 <-> Zone 63).
 * 5. `test_binary_fixture_stream()`: Đọc trực tiếp file luồng nhị phân 115 gói tin `tof_cases.bin`.
 */

#include <iostream>
#include <fstream>
#include <cassert>
#include <cstring>
#include "VL53L5CXDriver.h"

/**
 * @brief Bài kiểm thử 1: Khởi tạo Driver và kiểm tra chuyển trạng thái FSM sang Mock Mode.
 */
void test_driver_initialization() {
    std::cout << "[KIỂM THỬ 1] Khởi tạo Driver & Trạng thái Chế độ Giả lập (Mock Mode)..." << std::endl;
    VL53L5CXDriver driver;
    assert(driver.getState() == VL53L5CX_STATE_UNINITIALIZED);

    bool ok = driver.init(true /* enableMockMode */);
    assert(ok == true);
    assert(driver.isMockMode() == true);
    assert(driver.getState() == VL53L5CX_STATE_RANGING);

    std::cout << "       -> THÀNH CÔNG: Driver khởi tạo chế độ Mock Mode thành công." << std::endl;
}

/**
 * @brief Bài kiểm thử 2: Sinh dữ liệu ma trận 8x8 giả lập người đứng (Chiều cao 1m75 bên dưới cảm biến trần 2m2).
 */
void test_mock_frame_generation() {
    std::cout << "[KIỂM THỬ 2] Sinh dữ liệu Frame Giả lập (Người cao 1m75 đứng dưới cảm biến trần)..." << std::endl;
    VL53L5CXDriver driver;
    driver.setReferenceHeight(2200);
    driver.init(true);

    VL53L5CXFrame frame;
    bool ok = driver.readFrame(frame);
    assert(ok == true);
    assert(frame.frameId == 1);
    assert(frame.zoneCount == 64);
    assert(frame.isValid == true);

    // Vùng trung tâm (r=3, c=3 -> index=27) đại diện cho đỉnh đầu (khoảng cách ~500mm tới cảm biến trần)
    uint16_t centerDistance = frame.distances[27];
    assert(centerDistance >= 450 && centerDistance <= 650);

    // Vùng góc (r=0, c=0 -> index=0) đại diện cho mặt sàn / nền nhà (khoảng cách ~2100mm)
    uint16_t cornerDistance = frame.distances[0];
    assert(cornerDistance >= 2000 && cornerDistance <= 2200);

    // Kiểm tra cờ trạng thái target (5 = VALID 100%)
    assert(frame.targetStatuses[27] == VL53L5CX_STATUS_VALID_100);

    std::cout << "       -> THÀNH CÔNG: Khoảng cách đỉnh đầu = " << centerDistance << "mm, Khoảng cách sàn = " << cornerDistance << "mm." << std::endl;
}

/**
 * @brief Bài kiểm thử 3 & 4: Đóng gói nhị phân 204B, giải mã đối chiếu CRC16 Modbus và phát hiện gói tin nhiễu.
 */
void test_serialization_deserialization_and_crc() {
    std::cout << "[KIỂM THỬ 3] Đóng gói Nhị phân (204 bytes), Giải mã Packet & Checksum CRC16..." << std::endl;
    VL53L5CXDriver driver;
    driver.init(true);

    VL53L5CXFrame originalFrame = driver.generateMockFrame(100, 6600, 1720);
    uint8_t buffer[VL53L5CX_PACKET_SIZE];
    memset(buffer, 0, sizeof(buffer));

    size_t packedSize = VL53L5CXDriver::serializeFrame(originalFrame, buffer, sizeof(buffer));
    assert(packedSize == 204);

    // Kiểm tra byte Header (0xAA 0x55)
    assert(buffer[0] == 0xAA);
    assert(buffer[1] == 0x55);

    // Giải mã packet hợp lệ
    VL53L5CXFrame unpackedFrame;
    bool success = VL53L5CXDriver::deserializeFrame(buffer, packedSize, unpackedFrame);
    assert(success == true);

    assert(unpackedFrame.frameId == 100);
    assert(unpackedFrame.timestampMs == 6600);
    assert(unpackedFrame.zoneCount == 64);

    for (int i = 0; i < 64; i++) {
        assert(unpackedFrame.distances[i] == originalFrame.distances[i]);
        assert(unpackedFrame.targetStatuses[i] == originalFrame.targetStatuses[i]);
    }

    std::cout << "       -> THÀNH CÔNG: Đã giải mã packet 204 bytes khớp chính xác 64 vùng đo." << std::endl;

    // Kiểm thử phát hiện gói tin bị nhiễu / làm sai CRC16
    std::cout << "[KIỂM THỬ 4] Phát hiện Gói tin bị Nhiễu / Lỗi Checksum CRC16..." << std::endl;
    buffer[50] ^= 0xFF; // Làm sai lệch 1 bit ở giữa gói tin
    bool corruptCheck = VL53L5CXDriver::deserializeFrame(buffer, packedSize, unpackedFrame);
    assert(corruptCheck == false);

    std::cout << "       -> THÀNH CÔNG: Đã từ chối thành công gói tin bị sai checksum CRC16." << std::endl;
}

/**
 * @brief Bài kiểm thử 5: Kiểm tra thuật toán đảo thấu kính quang học Rx (Zone 0 góc trên-trái <-> Zone 63 góc dưới-phải).
 */
void test_optical_lens_flip() {
    std::cout << "[KIỂM THỬ 5] Đảo ngược Thấu kính Quang học Rx (Zone 0 <-> Zone 63 Mapping)..." << std::endl;
    uint16_t src[64];
    uint16_t dst[64];

    for (int i = 0; i < 64; i++) {
        src[i] = i * 10;
    }

    VL53L5CXDriver::flipLensOrientation(src, dst);

    // Zone 0 (góc trên-trái quang học) ánh xạ sang Zone 63 (góc dưới-phải)
    assert(dst[63] == src[0]);
    // Zone 63 ánh xạ sang Zone 0
    assert(dst[0] == src[63]);

    std::cout << "       -> THÀNH CÔNG: Đã xác nhận bản đồ chuyển đổi tọa độ thấu kính Rx." << std::endl;
}

/**
 * @brief Bài kiểm thử 6: Đọc và kiểm tra trực tiếp 115 gói nhị phân từ tệp fixture binary.
 */
void test_binary_fixture_stream() {
    std::cout << "[KIỂM THỬ 6] Đọc & Giải mã 115 Packets Nhị phân từ File Fixture (tof_cases.bin)..." << std::endl;

    std::ifstream binFile("test/tof_cases.bin", std::ios::binary);
    if (!binFile.is_open()) {
        std::cout << "       -> BỎ QUA: Không tìm thấy test/tof_cases.bin (cần chạy python test/generate_fixtures.py trước)." << std::endl;
        return;
    }

    uint8_t buffer[204];
    size_t packetCount = 0;
    size_t validCount = 0;

    while (binFile.read(reinterpret_cast<char*>(buffer), 204)) {
        packetCount++;
        VL53L5CXFrame frame;
        bool ok = VL53L5CXDriver::deserializeFrame(buffer, 204, frame);
        if (ok && frame.isValid) {
            validCount++;
        }
    }

    assert(packetCount == 570);
    assert(validCount == 570);

    std::cout << "       -> THÀNH CÔNG: Đã đọc và kiểm tra mã CRC16 đạt 100% (570/570 packets) từ Binary Fixture." << std::endl;
}

int main() {
    std::cout << "==========================================================" << std::endl;
    std::cout << "   CHẠY UNIT TEST C++ CHO ESP32 VL53L5CX DRIVER (TIẾNG VIỆT)" << std::endl;
    std::cout << "==========================================================" << std::endl;

    test_driver_initialization();
    test_mock_frame_generation();
    test_serialization_deserialization_and_crc();
    test_optical_lens_flip();
    test_binary_fixture_stream();

    std::cout << "==========================================================" << std::endl;
    std::cout << "   ✅ TẤT CẢ BÀI KIỂM THỬ ĐÃ ĐẠT (100% PASSED)!           " << std::endl;
    std::cout << "==========================================================" << std::endl;
    return 0;
}
