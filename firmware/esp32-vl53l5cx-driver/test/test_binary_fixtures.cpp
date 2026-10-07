/**
 * @file test_binary_fixtures.cpp
 * @brief Chương trình kiểm thử Native C++ kiểm tra giải mã 115 gói tin nhị phân (204 Bytes/packet) từ file fixture `test/tof_cases.bin`.
 *
 * Mục đích kiểm thử:
 * 1. Mở và đọc luồng dữ liệu thô nhị phân gồm 115 gói tin 204B được sinh từ script Python.
 * 2. Gọi hàm `VL53L5CXDriver::deserializeFrame` để đối chiếu từng byte và kiểm tra checksum CRC16-Modbus.
 * 3. Đảm bảo tỷ lệ giải mã thành công đạt tuyệt đối 100% (115/115 packets) trước khi tích hợp vào React Native Core Hardware.
 */

#include <iostream>
#include <fstream>
#include <vector>
#include <cassert>
#include "VL53L5CXDriver.h"

int main() {
    std::cout << "==========================================================" << std::endl;
    std::cout << "   TEST GIẢI MÃ BINARY FIXTURE (115 PACKETS / 23 CASES)   " << std::endl;
    std::cout << "==========================================================" << std::endl;

    // Mở file luồng nhị phân fixture
    std::ifstream binFile("test/tof_cases.bin", std::ios::binary);
    if (!binFile.is_open()) {
        std::cerr << "[LỖI] Không thể mở file test/tof_cases.bin! (Cần chạy python test/generate_fixtures.py trước)" << std::endl;
        return 1;
    }

    uint8_t buffer[VL53L5CX_PACKET_SIZE];
    size_t packetCount = 0;
    size_t validCount = 0;

    // Đọc từng khối 204 bytes cho tới khi hết file
    while (binFile.read(reinterpret_cast<char*>(buffer), VL53L5CX_PACKET_SIZE)) {
        packetCount++;
        VL53L5CXFrame frame;
        
        // Tiến hành giải mã gói nhị phân và đối chiếu mã CRC16 Modbus
        bool ok = VL53L5CXDriver::deserializeFrame(buffer, VL53L5CX_PACKET_SIZE, frame);
        if (ok && frame.isValid) {
            validCount++;
        } else {
            std::cerr << "[LỖI] Packet #" << packetCount << " bị giải mã thất bại hoặc sai checksum CRC16!" << std::endl;
        }
    }

    std::cout << "       -> Tổng số gói tin nhị phân đọc được: " << packetCount << std::endl;
    std::cout << "       -> Số gói tin giải mã hợp lệ & khớp CRC16: " << validCount << std::endl;

    // Khẳng định 100% số gói tin đọc được đều hợp lệ
    assert(packetCount == 115);
    assert(validCount == 115);

    std::cout << "==========================================================" << std::endl;
    std::cout << "   ✅ 100% (115/115) PACKETS BINARY ĐÃ ĐƯỢC GIẢI MÃ ĐÚNG! " << std::endl;
    std::cout << "==========================================================" << std::endl;

    return 0;
}
